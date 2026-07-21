"""Serializers for submission management."""

from rest_framework import serializers

from .models import Answer, Submission


class AnswerSerializer(serializers.ModelSerializer):
    question_content = serializers.CharField(source='question.content', read_only=True)
    question_type = serializers.CharField(source='question.question_type', read_only=True)
    question_type_display = serializers.CharField(source='question.get_question_type_display', read_only=True)
    question_options = serializers.JSONField(source='question.options', read_only=True)
    question_score = serializers.DecimalField(source='max_score', max_digits=5, decimal_places=2, read_only=True)
    user_answer = serializers.JSONField(read_only=True)
    correct_answer = serializers.JSONField(source='question.answer', read_only=True)
    explanation = serializers.CharField(source='question.explanation', read_only=True)
    graded_by_name = serializers.CharField(source='graded_by.username', read_only=True)

    class Meta:
        model = Answer
        fields = [
            'id',
            'question',
            'question_content',
            'question_type',
            'question_type_display',
            'question_options',
            'question_score',
            'user_answer',
            'is_marked',
            'is_correct',
            'obtained_score',
            'correct_answer',
            'explanation',
            'graded_by',
            'graded_by_name',
            'graded_at',
            'comment',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['is_correct', 'obtained_score', 'graded_by', 'graded_at', 'comment']


class SubmissionDetailSerializer(serializers.ModelSerializer):
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    quiz_type = serializers.CharField(source='quiz.quiz_type', read_only=True)
    quiz_type_display = serializers.CharField(source='quiz.get_quiz_type_display', read_only=True)
    quiz_duration = serializers.IntegerField(source='quiz.duration', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    answers = AnswerSerializer(many=True, read_only=True)
    is_passed = serializers.ReadOnlyField()
    pass_score = serializers.ReadOnlyField()
    task_quiz_id = serializers.IntegerField(read_only=True)
    remaining_seconds = serializers.SerializerMethodField()

    class Meta:
        model = Submission
        fields = [
            'id',
            'task_quiz_id',
            'quiz',
            'quiz_title',
            'quiz_type',
            'quiz_type_display',
            'quiz_duration',
            'user',
            'user_name',
            'task_title',
            'attempt_number',
            'status',
            'status_display',
            'total_score',
            'obtained_score',
            'is_passed',
            'pass_score',
            'started_at',
            'submitted_at',
            'remaining_seconds',
            'answers',
            'created_at',
            'updated_at',
        ]

    def get_remaining_seconds(self, obj):
        return obj.get_reference_remaining_seconds()


class SaveAnswerSerializer(serializers.Serializer):
    question_id = serializers.IntegerField(help_text='试卷题目快照ID')
    user_answer = serializers.JSONField(help_text='用户答案', allow_null=True, required=False)
    is_marked = serializers.BooleanField(help_text='是否标记题目', required=False)

    def validate(self, attrs):
        if 'user_answer' not in attrs and 'is_marked' not in attrs:
            raise serializers.ValidationError('至少提供一个要更新的字段')
        return attrs


class StartQuizSerializer(serializers.Serializer):
    assignment_id = serializers.IntegerField(help_text='任务分配ID')
    quiz_id = serializers.IntegerField(help_text='任务试卷ID')
