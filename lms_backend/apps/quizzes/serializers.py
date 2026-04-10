"""
Serializers for quiz management.
"""
from rest_framework import serializers

from apps.questions.services import QuestionService
from apps.tags.serializers import TagSimpleSerializer
from core.exceptions import BusinessError

from .models import Quiz, QuizQuestion


class QuizQuestionSerializer(serializers.ModelSerializer):
    """
    Serializer for quiz-question relationship.
    Shows question details with order in the quiz.
    """
    question = serializers.IntegerField(source='question.id', read_only=True)
    question_content = serializers.CharField(source='question.content', read_only=True)
    question_type = serializers.CharField(source='question.question_type', read_only=True)
    question_type_display = serializers.CharField(source='question.get_question_type_display', read_only=True)
    score = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    resource_uuid = serializers.UUIDField(source='question.resource_uuid', read_only=True)
    is_current = serializers.BooleanField(source='question.is_current', read_only=True)
    version_number = serializers.IntegerField(source='question.version_number', read_only=True)
    options = serializers.JSONField(source='question.options', read_only=True)
    answer = serializers.JSONField(source='question.answer', read_only=True)
    explanation = serializers.CharField(source='question.explanation', read_only=True)
    space_tag = TagSimpleSerializer(source='question.space_tag', read_only=True)
    tags = TagSimpleSerializer(source='question.tags', many=True, read_only=True)
    class Meta:
        model = QuizQuestion
        fields = [
            'id', 'question', 'question_content', 'question_type', 'question_type_display',
            'score', 'order', 'resource_uuid', 'version_number', 'is_current',
            'options', 'answer', 'explanation', 'space_tag', 'tags',
        ]
class QuizListSerializer(serializers.ModelSerializer):
    """
    Serializer for quiz list view.
    """
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True, allow_null=True)
    question_count = serializers.ReadOnlyField()
    total_score = serializers.ReadOnlyField()
    quiz_type_display = serializers.CharField(source='get_quiz_type_display', read_only=True)
    question_type_counts = serializers.DictField(child=serializers.IntegerField(), read_only=True)
    class Meta:
        model = Quiz
        fields = [
            'id', 'resource_uuid', 'version_number',
            'title', 'question_count', 'total_score',
            'question_type_counts',
            'quiz_type', 'quiz_type_display', 'duration', 'pass_score',
            'is_current',
            'created_by_name', 'updated_by_name',
            'created_at', 'updated_at'
        ]


class QuizDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for quiz detail view.
    """
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True, allow_null=True)
    question_count = serializers.ReadOnlyField()
    total_score = serializers.ReadOnlyField()
    questions = serializers.SerializerMethodField()
    quiz_type_display = serializers.CharField(source='get_quiz_type_display', read_only=True)
    class Meta:
        model = Quiz
        fields = [
            'id', 'resource_uuid', 'version_number',
            'title', 'question_count', 'total_score',
            'questions',
            'quiz_type', 'quiz_type_display', 'duration', 'pass_score',
            'is_current',
            'created_by_name', 'updated_by_name', 'created_at', 'updated_at'
        ]
    def get_questions(self, obj):
        """Get ordered questions with details."""
        quiz_questions = obj.quiz_questions.select_related('question').order_by('order')
        return QuizQuestionSerializer(quiz_questions, many=True).data
class QuizQuestionBindingSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    score = serializers.DecimalField(max_digits=5, decimal_places=2)


class QuizQuestionBindingValidationMixin:
    def _validate_exam_fields(self, attrs):
        quiz_type = attrs.get('quiz_type', self.instance.quiz_type if self.instance else 'PRACTICE')
        if quiz_type != 'EXAM':
            return attrs

        duration = attrs.get('duration', getattr(self.instance, 'duration', None))
        pass_score = attrs.get('pass_score', getattr(self.instance, 'pass_score', None))
        if not duration:
            raise serializers.ValidationError({'duration': '考试类型必须设置考试时长'})
        if not pass_score:
            raise serializers.ValidationError({'pass_score': '考试类型必须设置及格分数'})
        return attrs

    def _validate_question_versions(self, value):
        if value is None:
            return value
        try:
            QuestionService.validate_question_ids(
                [item['question_id'] for item in value]
            )
        except BusinessError as exc:
            raise serializers.ValidationError(exc.message) from exc
        return value


class QuizCreateSerializer(QuizQuestionBindingValidationMixin, serializers.ModelSerializer):
    """
    Serializer for creating quizzes.
    """
    question_versions = QuizQuestionBindingSerializer(
        many=True,
        required=False,
        default=list,
        help_text='试卷题目与分值列表'
    )
    class Meta:
        model = Quiz
        fields = [
            'title', 'quiz_type', 'duration', 'pass_score',
            'question_versions'
        ]

    def validate(self, attrs):
        return self._validate_exam_fields(attrs)

    def validate_question_versions(self, value):
        return self._validate_question_versions(value)


class QuizUpdateSerializer(QuizQuestionBindingValidationMixin, serializers.ModelSerializer):
    """
    Serializer for updating quizzes.
    支持更新试卷基本信息与题目顺序/分值。
    """
    question_versions = QuizQuestionBindingSerializer(
        many=True,
        required=False,
        help_text='新的题目与分值列表（会覆盖现有顺序）'
    )

    class Meta:
        model = Quiz
        fields = [
            'title', 'quiz_type', 'duration', 'pass_score',
            'question_versions',
        ]

    def validate(self, attrs):
        return self._validate_exam_fields(attrs)

    def validate_question_versions(self, value):
        return self._validate_question_versions(value)
