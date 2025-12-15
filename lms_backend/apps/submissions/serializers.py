"""
Serializers for submission management.

Implements serializers for:
- Practice submissions (Requirements: 10.2, 10.3, 10.4, 10.5, 10.6, 10.7)
- Exam submissions (Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8)
- Grading (Requirements: 13.1, 13.2, 13.3, 13.4, 13.5)

Properties:
- Property 24: 练习允许多次提交
- Property 25: 练习任务自动完成
- Property 26: 已完成练习仍可继续
- Property 28: 考试时间窗口控制
- Property 29: 考试单次提交限制
- Property 30: 客观题自动评分
- Property 31: 主观题待评分状态
- Property 32: 纯客观题直接完成
- Property 33: 评分完成状态转换
- Property 34: 未完成评分状态保持
"""
from decimal import Decimal
from rest_framework import serializers
from django.db import transaction
from django.utils import timezone

from apps.quizzes.models import Quiz, QuizQuestion
from apps.tasks.models import TaskAssignment, TaskQuiz
from apps.questions.models import Question

from .models import Submission, Answer


class AnswerSerializer(serializers.ModelSerializer):
    """Serializer for Answer model."""
    question_content = serializers.CharField(source='question.content', read_only=True)
    question_type = serializers.CharField(source='question.question_type', read_only=True)
    question_type_display = serializers.CharField(
        source='question.get_question_type_display', read_only=True
    )
    question_options = serializers.JSONField(source='question.options', read_only=True)
    question_score = serializers.DecimalField(
        source='question.score', max_digits=5, decimal_places=2, read_only=True
    )
    correct_answer = serializers.JSONField(source='question.answer', read_only=True)
    explanation = serializers.CharField(source='question.explanation', read_only=True)
    graded_by_name = serializers.CharField(source='graded_by.real_name', read_only=True)
    
    class Meta:
        model = Answer
        fields = [
            'id', 'question', 'question_content', 'question_type',
            'question_type_display', 'question_options', 'question_score',
            'user_answer', 'is_correct', 'obtained_score',
            'correct_answer', 'explanation',
            'graded_by', 'graded_by_name', 'graded_at', 'comment',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'is_correct', 'obtained_score', 'graded_by', 'graded_at', 'comment'
        ]


class SubmissionListSerializer(serializers.ModelSerializer):
    """Serializer for submission list view."""
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    user_name = serializers.CharField(source='user.real_name', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    task_type = serializers.CharField(source='task.task_type', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Submission
        fields = [
            'id', 'quiz', 'quiz_title', 'user', 'user_name',
            'task_title', 'task_type', 'attempt_number',
            'status', 'status_display',
            'total_score', 'obtained_score',
            'started_at', 'submitted_at',
            'created_at', 'updated_at'
        ]


class SubmissionDetailSerializer(serializers.ModelSerializer):
    """Serializer for submission detail view."""
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    user_name = serializers.CharField(source='user.real_name', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    task_type = serializers.CharField(source='task.task_type', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    answers = AnswerSerializer(many=True, read_only=True)
    is_passed = serializers.ReadOnlyField()
    pass_score = serializers.ReadOnlyField()
    
    class Meta:
        model = Submission
        fields = [
            'id', 'quiz', 'quiz_title', 'user', 'user_name',
            'task_title', 'task_type', 'attempt_number',
            'status', 'status_display',
            'total_score', 'obtained_score', 'is_passed', 'pass_score',
            'started_at', 'submitted_at', 'remaining_seconds',
            'answers', 'created_at', 'updated_at'
        ]


class StartPracticeSerializer(serializers.Serializer):
    """
    Serializer for starting a practice session.
    
    Requirements:
    - 10.2: 学员开始练习时加载试卷题目并允许作答
    - 10.5: 学员可选择再次练习同一试卷
    
    Properties:
    - Property 24: 练习允许多次提交
    - Property 26: 已完成练习仍可继续
    """
    task_id = serializers.IntegerField(help_text='任务ID')
    quiz_id = serializers.IntegerField(help_text='试卷ID')
    
    def validate(self, attrs):
        """Validate that the task and quiz are valid for practice."""
        request = self.context.get('request')
        user = request.user
        task_id = attrs['task_id']
        quiz_id = attrs['quiz_id']
        
        # Check task assignment exists
        try:
            assignment = TaskAssignment.objects.select_related('task').get(
                task_id=task_id,
                assignee=user,
                task__is_deleted=False
            )
        except TaskAssignment.DoesNotExist:
            raise serializers.ValidationError({'task_id': '任务不存在或未分配给您'})
        
        # Check it's a practice task
        if assignment.task.task_type != 'PRACTICE':
            raise serializers.ValidationError({'task_id': '此接口仅支持练习任务'})
        
        # Check quiz is part of the task
        if not TaskQuiz.objects.filter(task_id=task_id, quiz_id=quiz_id).exists():
            raise serializers.ValidationError({'quiz_id': '该试卷不在此任务中'})
        
        # Check quiz exists
        try:
            quiz = Quiz.objects.get(id=quiz_id, is_deleted=False)
        except Quiz.DoesNotExist:
            raise serializers.ValidationError({'quiz_id': '试卷不存在'})
        
        # Property 26: 已完成练习仍可继续 - 不检查任务状态
        # 练习任务即使已完成也可以继续练习
        
        attrs['assignment'] = assignment
        attrs['quiz'] = quiz
        return attrs
    
    @transaction.atomic
    def create(self, validated_data):
        """
        Create a new practice submission.
        
        Requirements: 10.2, 10.5
        Properties: 24, 26
        """
        assignment = validated_data['assignment']
        quiz = validated_data['quiz']
        user = self.context['request'].user
        
        # Calculate attempt number
        # Property 24: 练习允许多次提交
        existing_count = Submission.objects.filter(
            task_assignment=assignment,
            quiz=quiz
        ).count()
        attempt_number = existing_count + 1
        
        # Create submission
        submission = Submission.objects.create(
            task_assignment=assignment,
            quiz=quiz,
            user=user,
            attempt_number=attempt_number,
            status='IN_PROGRESS',
            total_score=quiz.total_score
        )
        
        # Create answer records for each question
        quiz_questions = quiz.get_ordered_questions()
        for qq in quiz_questions:
            Answer.objects.create(
                submission=submission,
                question=qq.question
            )
        
        return submission


class SaveAnswerSerializer(serializers.Serializer):
    """
    Serializer for saving an answer during practice/exam.
    
    Requirements:
    - 10.2: 学员开始练习时允许作答
    """
    question_id = serializers.IntegerField(help_text='题目ID')
    user_answer = serializers.JSONField(help_text='用户答案', allow_null=True)
    
    def validate(self, attrs):
        """Validate the answer data."""
        submission = self.context.get('submission')
        question_id = attrs['question_id']
        
        # Check question is part of the submission
        try:
            answer = Answer.objects.get(
                submission=submission,
                question_id=question_id
            )
        except Answer.DoesNotExist:
            raise serializers.ValidationError({'question_id': '该题目不在此答卷中'})
        
        attrs['answer'] = answer
        return attrs
    
    def save(self):
        """Save the answer."""
        answer = self.validated_data['answer']
        answer.user_answer = self.validated_data['user_answer']
        answer.save(update_fields=['user_answer', 'updated_at'])
        return answer


class SubmitPracticeSerializer(serializers.Serializer):
    """
    Serializer for submitting a practice session.
    
    Requirements:
    - 10.3: 学员提交练习答案时自动判分（客观题）并展示解析
    - 10.6: 学员至少完成一次所有试卷时将练习任务状态变为「已完成」
    
    Properties:
    - Property 25: 练习任务自动完成
    - Property 30: 客观题自动评分
    """
    pass  # No additional fields needed, submission ID comes from URL


class PracticeResultSerializer(serializers.ModelSerializer):
    """
    Serializer for practice result view.
    
    Requirements:
    - 10.4: 学员查看已完成的试卷子任务时展示最近成绩、最佳成绩和作答次数和题目解析
    """
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    answers = AnswerSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Submission
        fields = [
            'id', 'quiz', 'quiz_title', 'attempt_number',
            'status', 'status_display',
            'total_score', 'obtained_score',
            'started_at', 'submitted_at',
            'answers', 'created_at'
        ]


class QuizPracticeHistorySerializer(serializers.Serializer):
    """
    Serializer for quiz practice history.
    
    Requirements:
    - 10.4: 展示最近成绩、最佳成绩和作答次数
    """
    quiz_id = serializers.IntegerField()
    quiz_title = serializers.CharField()
    attempt_count = serializers.IntegerField()
    latest_score = serializers.DecimalField(max_digits=6, decimal_places=2, allow_null=True)
    best_score = serializers.DecimalField(max_digits=6, decimal_places=2, allow_null=True)
    latest_submission_id = serializers.IntegerField(allow_null=True)
    best_submission_id = serializers.IntegerField(allow_null=True)


# Exam-specific serializers

class StartExamSerializer(serializers.Serializer):
    """
    Serializer for starting an exam.
    
    Requirements:
    - 12.1: 学员查看考试任务详情时展示任务标题、介绍、题目数量、考试时长、及格分数、开始时间和截止时间
    - 12.2: 学员在考试时间窗口内进入考试时加载试卷并开始计时
    - 12.7: 学员已提交考试时禁止重新作答
    - 12.8: 当前时间不在考试时间窗口内时禁止进入考试
    
    Properties:
    - Property 28: 考试时间窗口控制
    - Property 29: 考试单次提交限制
    """
    task_id = serializers.IntegerField(help_text='任务ID')
    
    def validate(self, attrs):
        """Validate that the exam can be started."""
        request = self.context.get('request')
        user = request.user
        task_id = attrs['task_id']
        
        # Check task assignment exists
        try:
            assignment = TaskAssignment.objects.select_related('task').get(
                task_id=task_id,
                assignee=user,
                task__is_deleted=False
            )
        except TaskAssignment.DoesNotExist:
            raise serializers.ValidationError({'task_id': '任务不存在或未分配给您'})
        
        task = assignment.task
        
        # Check it's an exam task
        if task.task_type != 'EXAM':
            raise serializers.ValidationError({'task_id': '此接口仅支持考试任务'})
        
        # Property 28: 考试时间窗口控制
        now = timezone.now()
        if now < task.start_time:
            raise serializers.ValidationError({'task_id': '考试尚未开始'})
        if now > task.deadline:
            raise serializers.ValidationError({'task_id': '考试已结束'})
        
        # Property 29: 考试单次提交限制
        existing_submission = Submission.objects.filter(
            task_assignment=assignment,
            status__in=['SUBMITTED', 'GRADING', 'GRADED']
        ).first()
        if existing_submission:
            raise serializers.ValidationError({'task_id': '您已提交过此考试，无法重新作答'})
        
        # Check for in-progress submission
        in_progress = Submission.objects.filter(
            task_assignment=assignment,
            status='IN_PROGRESS'
        ).first()
        
        # Get the quiz (exam has only one quiz)
        task_quiz = TaskQuiz.objects.select_related('quiz').get(task=task)
        quiz = task_quiz.quiz
        
        attrs['assignment'] = assignment
        attrs['quiz'] = quiz
        attrs['task'] = task
        attrs['in_progress_submission'] = in_progress
        return attrs
    
    @transaction.atomic
    def create(self, validated_data):
        """
        Create or return existing exam submission.
        
        Requirements: 12.2
        """
        assignment = validated_data['assignment']
        quiz = validated_data['quiz']
        task = validated_data['task']
        in_progress = validated_data.get('in_progress_submission')
        user = self.context['request'].user
        
        # If there's an in-progress submission, return it
        if in_progress:
            # Update remaining time
            now = timezone.now()
            elapsed = (now - in_progress.started_at).total_seconds()
            remaining = max(0, task.duration * 60 - int(elapsed))
            in_progress.remaining_seconds = remaining
            in_progress.save(update_fields=['remaining_seconds'])
            return in_progress
        
        # Create new submission
        submission = Submission.objects.create(
            task_assignment=assignment,
            quiz=quiz,
            user=user,
            attempt_number=1,
            status='IN_PROGRESS',
            total_score=quiz.total_score,
            remaining_seconds=task.duration * 60
        )
        
        # Create answer records for each question
        quiz_questions = quiz.get_ordered_questions()
        for qq in quiz_questions:
            Answer.objects.create(
                submission=submission,
                question=qq.question
            )
        
        return submission


class SubmitExamSerializer(serializers.Serializer):
    """
    Serializer for submitting an exam.
    
    Requirements:
    - 12.3: 考试时间到达时自动提交试卷
    - 12.4: 学员手动提交试卷时记录提交时间并进行客观题自动评分
    - 12.5: 试卷包含主观题时将考试状态设为"待评分"
    - 12.6: 试卷仅包含客观题时直接计算最终成绩并完成考试
    
    Properties:
    - Property 30: 客观题自动评分
    - Property 31: 主观题待评分状态
    - Property 32: 纯客观题直接完成
    """
    pass  # No additional fields needed


# Grading serializers

class GradingListSerializer(serializers.ModelSerializer):
    """
    Serializer for grading list view.
    
    Requirements:
    - 13.1: 导师/室经理查看评分中心时展示所辖学员的待评分考试列表
    """
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    user_name = serializers.CharField(source='user.real_name', read_only=True)
    user_employee_id = serializers.CharField(source='user.employee_id', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    ungraded_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Submission
        fields = [
            'id', 'quiz', 'quiz_title', 'user', 'user_name', 'user_employee_id',
            'task_title', 'total_score', 'obtained_score',
            'submitted_at', 'ungraded_count', 'created_at'
        ]
    
    def get_ungraded_count(self, obj):
        """Get the number of ungraded subjective questions."""
        return obj.ungraded_subjective_count


class GradingDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for grading detail view.
    
    Requirements:
    - 13.2: 评分人查看待评分考试时展示学员答案和评分输入界面
    """
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    user_name = serializers.CharField(source='user.real_name', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    answers = AnswerSerializer(many=True, read_only=True)
    ungraded_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Submission
        fields = [
            'id', 'quiz', 'quiz_title', 'user', 'user_name',
            'task_title', 'status', 'total_score', 'obtained_score',
            'submitted_at', 'answers', 'ungraded_count', 'created_at'
        ]
    
    def get_ungraded_count(self, obj):
        """Get the number of ungraded subjective questions."""
        return obj.ungraded_subjective_count


class GradeAnswerSerializer(serializers.Serializer):
    """
    Serializer for grading a subjective answer.
    
    Requirements:
    - 13.3: 评分人提交主观题分数和评语时记录评分结果
    - 13.4: 所有主观题评分完成时计算最终成绩并将考试状态设为"已完成"
    - 13.5: 考试存在未评分的主观题时保持考试状态为"待评分"
    
    Properties:
    - Property 33: 评分完成状态转换
    - Property 34: 未完成评分状态保持
    """
    answer_id = serializers.IntegerField(help_text='答案ID')
    score = serializers.DecimalField(
        max_digits=5, decimal_places=2,
        help_text='给定分数'
    )
    comment = serializers.CharField(
        required=False, allow_blank=True, default='',
        help_text='评语'
    )
    
    def validate(self, attrs):
        """Validate the grading data."""
        submission = self.context.get('submission')
        answer_id = attrs['answer_id']
        score = attrs['score']
        
        # Check answer belongs to submission
        try:
            answer = Answer.objects.select_related('question').get(
                id=answer_id,
                submission=submission
            )
        except Answer.DoesNotExist:
            raise serializers.ValidationError({'answer_id': '答案不存在'})
        
        # Check it's a subjective question
        if answer.is_objective:
            raise serializers.ValidationError({'answer_id': '客观题不需要人工评分'})
        
        # Check score is within range
        if score < 0 or score > answer.question.score:
            raise serializers.ValidationError({
                'score': f'分数必须在 0 到 {answer.question.score} 之间'
            })
        
        attrs['answer'] = answer
        return attrs
    
    def save(self):
        """Save the grade."""
        answer = self.validated_data['answer']
        grader = self.context['request'].user
        score = self.validated_data['score']
        comment = self.validated_data.get('comment', '')
        
        # Grade the answer (this will also check for completion)
        answer.grade(grader, score, comment)
        
        return answer
