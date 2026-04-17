"""Serializers for quiz management."""

from rest_framework import serializers

from apps.questions.services import QuestionService
from apps.tags.serializers import TagSimpleSerializer
from core.exceptions import BusinessError

from .models import Quiz, QuizQuestion


class QuizQuestionSerializer(serializers.ModelSerializer):
    source_question_id = serializers.IntegerField(source='question_id', read_only=True, allow_null=True)
    question_content = serializers.CharField(source='content', read_only=True)
    question_type = serializers.CharField(read_only=True)
    question_type_display = serializers.CharField(source='get_question_type_display', read_only=True)
    score = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    options = serializers.JSONField(read_only=True)
    answer = serializers.JSONField(read_only=True)
    explanation = serializers.CharField(read_only=True)
    space_tag = serializers.SerializerMethodField()
    tags = serializers.SerializerMethodField()

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

    def get_space_tag(self, obj):
        if not obj.space_tag_name:
            return None
        return {'id': None, 'name': obj.space_tag_name, 'tag_type': 'SPACE'}

    def get_tags(self, obj):
        return obj.tags_json or []


class QuizListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True, allow_null=True)
    question_count = serializers.IntegerField(source='question_count_value', read_only=True)
    total_score = serializers.DecimalField(source='total_score_value', max_digits=10, decimal_places=2, read_only=True)
    usage_count = serializers.IntegerField(source='usage_count_value', read_only=True)
    quiz_type_display = serializers.CharField(source='get_quiz_type_display', read_only=True)
    duration = serializers.SerializerMethodField()
    pass_score = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = [
            'id',
            'title',
            'question_count',
            'total_score',
            'usage_count',
            'quiz_type',
            'quiz_type_display',
            'duration',
            'pass_score',
            'created_by_name',
            'updated_by_name',
            'created_at',
            'updated_at',
        ]

    def get_duration(self, obj):
        return obj.duration if obj.quiz_type == 'EXAM' else None

    def get_pass_score(self, obj):
        if obj.quiz_type != 'EXAM' or obj.pass_score is None:
            return None
        return str(obj.pass_score)


class QuizDetailSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True, allow_null=True)
    question_count = serializers.ReadOnlyField()
    total_score = serializers.ReadOnlyField()
    questions = serializers.SerializerMethodField()
    quiz_type_display = serializers.CharField(source='get_quiz_type_display', read_only=True)
    duration = serializers.SerializerMethodField()
    pass_score = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = [
            'id',
            'title',
            'question_count',
            'total_score',
            'questions',
            'quiz_type',
            'quiz_type_display',
            'duration',
            'pass_score',
            'created_by_name',
            'updated_by_name',
            'created_at',
            'updated_at',
        ]

    def get_duration(self, obj):
        return obj.duration if obj.quiz_type == 'EXAM' else None

    def get_pass_score(self, obj):
        if obj.quiz_type != 'EXAM' or obj.pass_score is None:
            return None
        return str(obj.pass_score)

    def get_questions(self, obj):
        quiz_questions = obj.quiz_questions.prefetch_related('question_options').order_by('order')
        return QuizQuestionSerializer(quiz_questions, many=True).data


class QuizEditableQuestionSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False)
    source_question_id = serializers.IntegerField(required=False, allow_null=True)
    content = serializers.CharField()
    question_type = serializers.CharField()
    options = serializers.JSONField(required=False, default=list)
    answer = serializers.JSONField(required=False)
    explanation = serializers.CharField(required=False, allow_blank=True, default='')
    score = serializers.DecimalField(max_digits=5, decimal_places=2)
    space_tag_id = serializers.IntegerField(required=False, allow_null=True)
    tag_ids = serializers.ListField(child=serializers.IntegerField(), required=False, default=list)

    def validate(self, attrs):
        try:
            QuestionService.validate_question_payload(attrs)
        except BusinessError as exc:
            raise serializers.ValidationError(exc.message) from exc
        return attrs


class QuizQuestionValidationMixin:
    def _validate_exam_fields(self, attrs):
        quiz_type = attrs.get('quiz_type', self.instance.quiz_type if self.instance else 'PRACTICE')
        if quiz_type != 'EXAM':
            attrs['duration'] = None
            attrs['pass_score'] = None
            return attrs

        duration = attrs.get('duration', getattr(self.instance, 'duration', None))
        pass_score = attrs.get('pass_score', getattr(self.instance, 'pass_score', None))
        if not duration:
            raise serializers.ValidationError({'duration': '考试类型必须设置参考时间'})
        if not pass_score:
            raise serializers.ValidationError({'pass_score': '考试类型必须设置及格分数'})
        return attrs


class QuizCreateSerializer(QuizQuestionValidationMixin, serializers.ModelSerializer):
    questions = QuizEditableQuestionSerializer(
        many=True,
        required=False,
        default=list,
        help_text='试卷完整题目列表',
    )

    class Meta:
        model = Quiz
        fields = ['title', 'quiz_type', 'duration', 'pass_score', 'questions']

    def validate(self, attrs):
        return self._validate_exam_fields(attrs)


class QuizUpdateSerializer(QuizQuestionValidationMixin, serializers.ModelSerializer):
    questions = QuizEditableQuestionSerializer(
        many=True,
        required=False,
        help_text='试卷完整题目列表',
    )

    class Meta:
        model = Quiz
        fields = ['title', 'quiz_type', 'duration', 'pass_score', 'questions']

    def validate(self, attrs):
        return self._validate_exam_fields(attrs)
