"""Serializers for quiz management."""

from rest_framework import serializers

from apps.questions.services import QuestionService
from apps.questions.serializers import QuestionUpdateSerializer
from apps.tags.serializers import TagSimpleSerializer
from core.exceptions import BusinessError

from .models import Quiz, QuizQuestion


class QuizQuestionSerializer(serializers.ModelSerializer):
    source_question_id = serializers.IntegerField(source='question_id', read_only=True)
    question_content = serializers.CharField(source='question.content', read_only=True)
    question_type = serializers.CharField(source='question.question_type', read_only=True)
    question_type_display = serializers.CharField(source='question.get_question_type_display', read_only=True)
    score = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    options = serializers.JSONField(source='question.options', read_only=True)
    answer = serializers.JSONField(source='question.answer', read_only=True)
    explanation = serializers.CharField(source='question.explanation', read_only=True)
    space_tag = TagSimpleSerializer(source='question.space_tag', read_only=True)
    tags = TagSimpleSerializer(source='question.tags', many=True, read_only=True)

    class Meta:
        model = QuizQuestion
        fields = [
            'id',
            'source_question_id',
            'question_content',
            'question_type',
            'question_type_display',
            'score',
            'order',
            'options',
            'answer',
            'explanation',
            'space_tag',
            'tags',
        ]

class QuizListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True, allow_null=True)
    question_count = serializers.IntegerField(source='question_count_value', read_only=True)
    total_score = serializers.DecimalField(source='total_score_value', max_digits=10, decimal_places=2, read_only=True)
    usage_count = serializers.IntegerField(source='usage_count_value', read_only=True)

    class Meta:
        model = Quiz
        fields = [
            'id',
            'title',
            'question_count',
            'total_score',
            'usage_count',
            'created_by_name',
            'updated_by_name',
            'created_at',
            'updated_at',
        ]


class QuizDetailSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True, allow_null=True)
    question_count = serializers.ReadOnlyField()
    total_score = serializers.ReadOnlyField()
    questions = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = [
            'id',
            'title',
            'question_count',
            'total_score',
            'questions',
            'created_by_name',
            'updated_by_name',
            'created_at',
            'updated_at',
        ]

    def get_questions(self, obj):
        quiz_questions = obj.quiz_questions.select_related('question__space_tag').prefetch_related(
            'question__question_options', 'question__tags',
        ).order_by('order')
        return QuizQuestionSerializer(quiz_questions, many=True).data


class QuizEditableQuestionSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False)
    source_question_id = serializers.IntegerField(required=False, allow_null=True)
    content = serializers.CharField(required=False)
    question_type = serializers.CharField(required=False)
    options = serializers.JSONField(required=False)
    answer = serializers.JSONField(required=False)
    explanation = serializers.CharField(required=False, allow_blank=True)
    score = serializers.DecimalField(max_digits=5, decimal_places=2)
    space_tag_id = serializers.IntegerField(required=False, allow_null=True)
    tag_ids = serializers.ListField(child=serializers.IntegerField(), required=False)
    question_changes = QuestionUpdateSerializer(required=False)

    def validate(self, attrs):
        if not attrs.get('source_question_id') and not attrs.get('id'):
            if not attrs.get('content') or not attrs.get('question_type'):
                raise serializers.ValidationError('新题目必须填写题干和题型')
            try:
                QuestionService.validate_question_payload(attrs)
            except BusinessError as exc:
                raise serializers.ValidationError(exc.message) from exc
        return attrs


class QuizCreateSerializer(serializers.ModelSerializer):
    questions = QuizEditableQuestionSerializer(
        many=True,
        required=False,
        default=list,
        help_text='试卷完整题目列表',
    )

    class Meta:
        model = Quiz
        fields = ['title', 'questions']


class QuizUpdateSerializer(serializers.ModelSerializer):
    questions = QuizEditableQuestionSerializer(
        many=True,
        required=False,
        help_text='试卷完整题目列表',
    )

    class Meta:
        model = Quiz
        fields = ['title', 'questions']
