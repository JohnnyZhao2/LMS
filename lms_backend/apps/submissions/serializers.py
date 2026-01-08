"""
Serializers for submission management.

Implements serializers for:
- Practice submissions (Requirements: 10.2, 10.3, 10.4, 10.5, 10.6, 10.7)
- Exam submissions (Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8)

Properties:
- Property 24: 练习允许多次提交
- Property 25: 练习任务自动完成
- Property 26: 已完成练习仍可继续
- Property 28: 考试时间窗口控制
- Property 29: 考试单次提交限制
- Property 30: 客观题自动评分

业务逻辑已提取到 services.py，Serializer 仅负责验证和委托。
"""
from rest_framework import serializers

from apps.tasks.models import TaskAssignment, TaskQuiz

from .models import Submission, Answer
from .services import SubmissionService


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
    graded_by_name = serializers.CharField(source='graded_by.username', read_only=True)
    
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


class SubmissionDetailSerializer(serializers.ModelSerializer):
    """Serializer for submission detail view."""
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
    
    class Meta:
        model = Submission
        fields = [
            'id', 'quiz', 'quiz_title', 'quiz_type', 'quiz_type_display', 'quiz_duration',
            'user', 'user_name', 'task_title', 'attempt_number',
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
    
    业务逻辑委托给 SubmissionService 处理。
    """
    assignment_id = serializers.IntegerField(help_text='任务分配ID')
    quiz_id = serializers.IntegerField(help_text='试卷ID')
    
    def validate(self, attrs):
        """Validate that the task and quiz are valid for practice."""
        request = self.context.get('request')
        user = request.user
        assignment_id = attrs['assignment_id']
        quiz_id = attrs['quiz_id']
        
        # 使用 SubmissionService 验证
        service = SubmissionService()
        try:
            assignment, task_quiz, quiz = service.validate_assignment_for_quiz(
                assignment_id, quiz_id, user
            )
        except Exception as e:
            raise serializers.ValidationError(str(e))
        
        # Property 26: 已完成练习仍可继续 - 不检查任务状态
        
        attrs['assignment'] = assignment
        attrs['quiz'] = quiz
        attrs['task_quiz'] = task_quiz
        return attrs
    
    def create(self, validated_data):
        """Create a new practice submission - 委托给 SubmissionService"""
        service = SubmissionService()
        return service.start_quiz(
            assignment=validated_data['assignment'],
            task_quiz=validated_data['task_quiz'],
            user=self.context['request'].user,
            is_exam=False
        )


class SaveAnswerSerializer(serializers.Serializer):
    """
    Serializer for saving an answer during practice/exam.
    
    Requirements:
    - 10.2: 学员开始练习时允许作答
    
    业务逻辑委托给 SubmissionService 处理。
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
        """Save the answer - 委托给 SubmissionService"""
        service = SubmissionService()
        submission = self.context.get('submission')
        return service.save_answer(
            submission=submission,
            question_id=self.validated_data['question_id'],
            user_answer=self.validated_data['user_answer']
        )


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
    
    业务逻辑委托给 SubmissionService 处理。
    """
    assignment_id = serializers.IntegerField(help_text='任务分配ID')
    quiz_id = serializers.IntegerField(help_text='试卷ID')
    
    def validate(self, attrs):
        """Validate that the exam can be started."""
        request = self.context.get('request')
        user = request.user
        assignment_id = attrs['assignment_id']
        quiz_id = attrs['quiz_id']
        
        # 使用 SubmissionService 验证
        service = SubmissionService()
        try:
            assignment, task_quiz, quiz = service.validate_assignment_for_quiz(
                assignment_id, quiz_id, user
            )
        except Exception as e:
            raise serializers.ValidationError(str(e))
        
        # 检查考试约束
        try:
            in_progress = service.check_exam_constraints(assignment, quiz_id)
        except Exception as e:
            raise serializers.ValidationError({'assignment_id': str(e)})
        
        attrs['assignment'] = assignment
        attrs['quiz'] = quiz
        attrs['task'] = assignment.task
        attrs['task_quiz'] = task_quiz
        attrs['in_progress_submission'] = in_progress
        return attrs
    
    def create(self, validated_data):
        """Create or return existing exam submission - 委托给 SubmissionService"""
        service = SubmissionService()
        in_progress = validated_data.get('in_progress_submission')
        
        # 如果有进行中的提交，直接返回
        if in_progress:
            return in_progress
        
        return service.start_quiz(
            assignment=validated_data['assignment'],
            task_quiz=validated_data['task_quiz'],
            user=self.context['request'].user,
            is_exam=True
        )


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


class StartQuizSerializer(serializers.Serializer):
    """
    统一的开始答题 Serializer，根据 quiz_type 自动判断行为。
    
    - PRACTICE: 允许多次提交，任务完成后仍可继续
    - EXAM: 只能提交一次，检查时间窗口
    
    业务逻辑委托给 SubmissionService 处理。
    """
    assignment_id = serializers.IntegerField(help_text='任务分配ID')
    quiz_id = serializers.IntegerField(help_text='试卷ID')
    
    def validate(self, attrs):
        """Validate and prepare for starting a quiz."""
        request = self.context.get('request')
        user = request.user
        assignment_id = attrs['assignment_id']
        quiz_id = attrs['quiz_id']
        
        # 使用 SubmissionService 验证
        service = SubmissionService()
        try:
            assignment, task_quiz, quiz = service.validate_assignment_for_quiz(
                assignment_id, quiz_id, user
            )
        except Exception as e:
            raise serializers.ValidationError(str(e))
        
        is_exam = quiz.quiz_type == 'EXAM'
        
        if is_exam:
            # 检查考试约束
            try:
                in_progress = service.check_exam_constraints(assignment, quiz_id)
            except Exception as e:
                raise serializers.ValidationError(str(e))
            attrs['in_progress_submission'] = in_progress
        else:
            attrs['in_progress_submission'] = None
        
        attrs['assignment'] = assignment
        attrs['quiz'] = quiz
        attrs['task'] = assignment.task
        attrs['task_quiz'] = task_quiz
        attrs['is_exam'] = is_exam
        return attrs
    
    def create(self, validated_data):
        """Create or return existing submission - 委托给 SubmissionService"""
        service = SubmissionService()
        is_exam = validated_data['is_exam']
        in_progress = validated_data.get('in_progress_submission')
        
        # 如果是考试模式且有进行中的提交，直接返回
        if is_exam and in_progress:
            return in_progress
        
        return service.start_quiz(
            assignment=validated_data['assignment'],
            task_quiz=validated_data['task_quiz'],
            user=self.context['request'].user,
            is_exam=is_exam
        )
