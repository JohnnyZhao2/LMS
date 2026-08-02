"""Serializers for quiz management."""

from rest_framework import serializers

from apps.questions.payload import validate_question_payload
from apps.tags.serializers import TagSimpleSerializer
from core.exceptions import BusinessError

from .models import Quiz, QuizQuestion


class QuizQuestionSerializer(serializers.ModelSerializer):
    """试卷题目关系 + 绑定题库题的扁平协议（兼容前端字段）。"""

    source_question_id = serializers.IntegerField(source='question_id', read_only=True)
    question_content = serializers.CharField(source='question.content', read_only=True)
    question_type = serializers.CharField(source='question.question_type', read_only=True)
    question_type_display = serializers.CharField(
        source='question.get_question_type_display',
        read_only=True,
    )
    score = serializers.DecimalField(
        source='question.score',
        max_digits=5,
        decimal_places=2,
        read_only=True,
    )
    options = serializers.SerializerMethodField()
    answer = serializers.SerializerMethodField()
    explanation = serializers.CharField(source='question.explanation', read_only=True)
    space_tag = TagSimpleSerializer(source='question.space_tag', read_only=True, allow_null=True)
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

    def get_options(self, obj):
        return obj.question.options

    def get_answer(self, obj):
        return obj.question.answer


class QuizListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True, allow_null=True)
    question_count = serializers.IntegerField(source='question_count_value', read_only=True)
    total_score = serializers.DecimalField(source='total_score_value', max_digits=10, decimal_places=2, read_only=True)
    usage_count = serializers.IntegerField(source='usage_count_value', read_only=True)
    quiz_type_display = serializers.CharField(source='get_quiz_type_display', read_only=True)

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


class QuizDetailSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True, allow_null=True)
    question_count = serializers.IntegerField(read_only=True)
    total_score = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    questions = QuizQuestionSerializer(source='quiz_questions', many=True, read_only=True)
    quiz_type_display = serializers.CharField(source='get_quiz_type_display', read_only=True)

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
            validate_question_payload(attrs)
        except BusinessError as exc:
            raise serializers.ValidationError(exc.message) from exc
        return attrs


class QuizWriteSerializer(serializers.ModelSerializer):
    """创建/更新共用；更新时 partial=True。"""

    questions = QuizEditableQuestionSerializer(
        many=True,
        required=False,
        help_text='试卷完整题目列表',
    )

    class Meta:
        model = Quiz
        fields = ['title', 'quiz_type', 'duration', 'pass_score', 'questions']

    def validate(self, attrs):
        if 'quiz_type' in attrs:
            quiz_type = attrs['quiz_type']
        elif self.instance is not None:
            quiz_type = self.instance.quiz_type
        elif self.partial:
            # 无 instance 的部分更新：无法判定类型时不改考试字段
            return attrs
        else:
            quiz_type = 'PRACTICE'

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
