"""Serializers for submission management."""

from rest_framework import serializers

from .models import Answer, Submission
from .services import SubmissionService, UNSET


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
    task_quiz_id = serializers.IntegerField(source='task_quiz_id', read_only=True)

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


class SaveAnswerSerializer(serializers.Serializer):
    question_id = serializers.IntegerField(help_text='试卷题目快照ID')
    user_answer = serializers.JSONField(help_text='用户答案', allow_null=True, required=False)
    is_marked = serializers.BooleanField(help_text='是否标记题目', required=False)

    def validate(self, attrs):
        submission = self.context.get('submission')
        question_id = attrs['question_id']
        if not Answer.objects.filter(submission=submission, question_id=question_id).exists():
            raise serializers.ValidationError({'question_id': '该题目不在此答卷中'})
        if 'user_answer' not in attrs and 'is_marked' not in attrs:
            raise serializers.ValidationError('至少提供一个要更新的字段')
        return attrs

    def save(self):
        request = self.context.get('request')
        service = SubmissionService(request)
        submission = self.context.get('submission')
        return service.save_answer(
            submission=submission,
            question_id=self.validated_data['question_id'],
            user_answer=self.validated_data.get('user_answer', UNSET),
            is_marked=self.validated_data.get('is_marked', UNSET),
        )


class StartQuizSerializer(serializers.Serializer):
    assignment_id = serializers.IntegerField(help_text='任务分配ID')
    quiz_id = serializers.IntegerField(help_text='任务试卷ID')

    def validate(self, attrs):
        request = self.context.get('request')
        user = request.user
        assignment_id = attrs['assignment_id']
        quiz_id = attrs['quiz_id']
        service = SubmissionService(request)
        try:
            assignment, task_quiz, quiz = service.validate_assignment_for_quiz(assignment_id, quiz_id, user)
        except Exception as e:
            raise serializers.ValidationError(str(e))
        is_exam = quiz.quiz_type == 'EXAM'
        if is_exam:
            try:
                in_progress = service.check_exam_constraints(assignment, quiz_id)
            except Exception as e:
                raise serializers.ValidationError(str(e))
        else:
            in_progress = service.get_in_progress(task_assignment_id=assignment.id, quiz_id=quiz_id)
        attrs['in_progress_submission'] = in_progress
        attrs['assignment'] = assignment
        attrs['quiz'] = quiz
        attrs['task_quiz'] = task_quiz
        attrs['is_exam'] = is_exam
        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        service = SubmissionService(request)
        in_progress = validated_data.get('in_progress_submission')
        if in_progress:
            return in_progress
        return service.start_quiz(
            assignment=validated_data['assignment'],
            task_quiz=validated_data['task_quiz'],
            user=request.user,
            is_exam=validated_data['is_exam'],
        )
