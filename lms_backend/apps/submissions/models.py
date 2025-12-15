"""
Submission models for LMS.

Implements:
- Submission: 答题记录模型
- Answer: 答案记录模型

Requirements: 10.2, 12.2
Properties: 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34
"""
from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone

from core.mixins import TimestampMixin


class Submission(TimestampMixin, models.Model):
    """
    答题记录模型
    
    记录学员对试卷的作答情况。
    
    状态:
    - SUBMITTED: 已提交（客观题已自动评分）
    - GRADING: 待评分（包含主观题，等待人工评分）
    - GRADED: 已评分（所有题目评分完成）
    
    Requirements:
    - 10.2: 学员开始练习时加载试卷题目并允许作答
    - 10.3: 学员提交练习答案时自动判分（客观题）并展示解析
    - 10.5: 学员可选择再次练习同一试卷
    - 12.2: 学员在考试时间窗口内进入考试时加载试卷并开始计时
    - 12.4: 学员手动提交试卷时记录提交时间并进行客观题自动评分
    - 12.5: 试卷包含主观题时将考试状态设为"待评分"
    - 12.6: 试卷仅包含客观题时直接计算最终成绩并完成考试
    - 12.7: 学员已提交考试时禁止重新作答
    
    Properties:
    - Property 24: 练习允许多次提交
    - Property 25: 练习任务自动完成
    - Property 26: 已完成练习仍可继续
    - Property 29: 考试单次提交限制
    - Property 30: 客观题自动评分
    - Property 31: 主观题待评分状态
    - Property 32: 纯客观题直接完成
    - Property 33: 评分完成状态转换
    - Property 34: 未完成评分状态保持
    """
    STATUS_CHOICES = [
        ('IN_PROGRESS', '答题中'),
        ('SUBMITTED', '已提交'),
        ('GRADING', '待评分'),
        ('GRADED', '已评分'),
    ]
    
    # 关联任务分配
    task_assignment = models.ForeignKey(
        'tasks.TaskAssignment',
        on_delete=models.CASCADE,
        related_name='submissions',
        verbose_name='任务分配'
    )
    
    # 关联试卷
    quiz = models.ForeignKey(
        'quizzes.Quiz',
        on_delete=models.PROTECT,
        related_name='submissions',
        verbose_name='试卷'
    )
    
    # 答题用户（冗余字段，方便查询）
    user = models.ForeignKey(
        'users.User',
        on_delete=models.PROTECT,
        related_name='submissions',
        verbose_name='答题用户'
    )
    
    # 答题次数（练习任务可多次提交）
    attempt_number = models.PositiveIntegerField(
        default=1,
        verbose_name='答题次数'
    )
    
    # 状态
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='IN_PROGRESS',
        verbose_name='状态'
    )
    
    # 分数
    total_score = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=Decimal('0'),
        verbose_name='试卷总分'
    )
    obtained_score = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='获得分数'
    )
    
    # 时间记录
    started_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='开始时间'
    )
    submitted_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='提交时间'
    )
    
    # 考试专用：剩余时间（秒）
    remaining_seconds = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='剩余时间（秒）'
    )
    
    class Meta:
        db_table = 'lms_submission'
        verbose_name = '答题记录'
        verbose_name_plural = '答题记录'
        ordering = ['-created_at']
        # 考试任务每个用户只能有一次提交
        # 练习任务可以有多次提交，通过 attempt_number 区分
    
    def __str__(self):
        return f"{self.user.real_name} - {self.quiz.title} (第{self.attempt_number}次)"
    
    def save(self, *args, **kwargs):
        """保存时自动设置用户和总分"""
        if not self.pk:
            # 新建时设置用户
            if not self.user_id:
                self.user = self.task_assignment.assignee
            # 设置试卷总分
            if not self.total_score:
                self.total_score = self.quiz.total_score
        super().save(*args, **kwargs)
    
    @property
    def task(self):
        """获取关联的任务"""
        return self.task_assignment.task
    
    @property
    def is_exam(self):
        """是否为考试提交"""
        return self.task.task_type == 'EXAM'
    
    @property
    def is_practice(self):
        """是否为练习提交"""
        return self.task.task_type == 'PRACTICE'
    
    @property
    def has_subjective_questions(self):
        """是否包含主观题"""
        return self.quiz.has_subjective_questions
    
    @property
    def pass_score(self):
        """获取及格分数（仅考试任务）"""
        if self.is_exam:
            return self.task.pass_score
        return None
    
    @property
    def is_passed(self):
        """是否及格（仅考试任务）"""
        if not self.is_exam or self.obtained_score is None:
            return None
        return self.obtained_score >= self.task.pass_score
    
    @property
    def objective_score(self):
        """获取客观题得分"""
        return self.answers.filter(
            question__question_type__in=['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE']
        ).aggregate(
            total=models.Sum('obtained_score')
        )['total'] or Decimal('0')
    
    @property
    def subjective_score(self):
        """获取主观题得分"""
        return self.answers.filter(
            question__question_type='SHORT_ANSWER'
        ).aggregate(
            total=models.Sum('obtained_score')
        )['total'] or Decimal('0')
    
    @property
    def ungraded_subjective_count(self):
        """获取未评分的主观题数量"""
        return self.answers.filter(
            question__question_type='SHORT_ANSWER',
            graded_by__isnull=True
        ).count()
    
    @property
    def all_subjective_graded(self):
        """所有主观题是否都已评分"""
        return self.ungraded_subjective_count == 0
    
    def submit(self):
        """
        提交答卷
        
        Requirements:
        - 10.3: 客观题自动评分
        - 12.4: 记录提交时间并进行客观题自动评分
        - 12.5: 包含主观题时状态设为"待评分"
        - 12.6: 仅包含客观题时直接计算最终成绩
        
        Properties:
        - Property 30: 客观题自动评分
        - Property 31: 主观题待评分状态
        - Property 32: 纯客观题直接完成
        """
        if self.status not in ['IN_PROGRESS']:
            raise ValidationError('只能提交答题中的记录')
        
        self.submitted_at = timezone.now()
        
        # 自动评分客观题
        self._auto_grade_objective_questions()
        
        # 计算总分
        self._calculate_score()
        
        # 设置状态
        if self.has_subjective_questions:
            # 包含主观题，需要人工评分
            self.status = 'GRADING'
        else:
            # 纯客观题，直接完成
            self.status = 'GRADED'
            self._update_task_assignment()
        
        self.save()
        
        # 检查练习任务是否应该自动完成
        if self.is_practice:
            self._check_practice_completion()
    
    def _auto_grade_objective_questions(self):
        """
        自动评分客观题
        
        Property 30: 客观题自动评分
        """
        for answer in self.answers.filter(
            question__question_type__in=['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE']
        ):
            answer.auto_grade()
    
    def _calculate_score(self):
        """计算当前得分"""
        self.obtained_score = self.answers.aggregate(
            total=models.Sum('obtained_score')
        )['total'] or Decimal('0')
    
    def _update_task_assignment(self):
        """更新任务分配的成绩"""
        assignment = self.task_assignment
        
        # 更新成绩（取最高分）
        if assignment.score is None or self.obtained_score > assignment.score:
            assignment.score = self.obtained_score
            assignment.save(update_fields=['score'])
    
    def _check_practice_completion(self):
        """
        检查练习任务是否应该自动完成
        
        Property 25: 练习任务自动完成
        """
        if not self.is_practice:
            return
        
        assignment = self.task_assignment
        task = assignment.task
        
        # 获取任务关联的所有试卷
        task_quiz_ids = task.task_quizzes.values_list('quiz_id', flat=True)
        
        # 检查每个试卷是否都至少有一次提交
        for quiz_id in task_quiz_ids:
            if not Submission.objects.filter(
                task_assignment=assignment,
                quiz_id=quiz_id,
                status__in=['SUBMITTED', 'GRADING', 'GRADED']
            ).exists():
                return  # 还有试卷未完成
        
        # 所有试卷都至少完成一次，标记任务为已完成
        if assignment.status != 'COMPLETED':
            assignment.mark_completed(score=assignment.score)
    
    def complete_grading(self):
        """
        完成评分（所有主观题评分完成后调用）
        
        Properties:
        - Property 33: 评分完成状态转换
        - Property 34: 未完成评分状态保持
        """
        if self.status != 'GRADING':
            raise ValidationError('只能完成待评分状态的记录')
        
        if not self.all_subjective_graded:
            raise ValidationError('还有未评分的主观题')
        
        # 重新计算总分
        self._calculate_score()
        
        self.status = 'GRADED'
        self.save()
        
        # 更新任务分配
        self._update_task_assignment()
        
        # 考试任务：标记任务分配为已完成
        if self.is_exam:
            self.task_assignment.mark_completed(score=self.obtained_score)


class Answer(TimestampMixin, models.Model):
    """
    答案记录模型
    
    记录学员对每道题目的作答情况。
    
    Requirements:
    - 10.3: 提交练习答案时自动判分（客观题）
    - 12.4: 提交试卷时进行客观题自动评分
    - 13.3: 评分人提交主观题分数和评语时记录评分结果
    
    Properties:
    - Property 30: 客观题自动评分
    """
    # 关联答题记录
    submission = models.ForeignKey(
        Submission,
        on_delete=models.CASCADE,
        related_name='answers',
        verbose_name='答题记录'
    )
    
    # 关联题目
    question = models.ForeignKey(
        'questions.Question',
        on_delete=models.PROTECT,
        related_name='answers',
        verbose_name='题目'
    )
    
    # 用户答案
    # 单选题: "A"
    # 多选题: ["A", "B"]
    # 判断题: "TRUE" 或 "FALSE"
    # 简答题: 答案文本
    user_answer = models.JSONField(
        null=True,
        blank=True,
        verbose_name='用户答案'
    )
    
    # 是否正确（客观题自动判断，主观题由评分人判断）
    is_correct = models.BooleanField(
        null=True,
        blank=True,
        verbose_name='是否正确'
    )
    
    # 得分
    obtained_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0'),
        verbose_name='得分'
    )
    
    # 评分信息（主观题）
    graded_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='graded_answers',
        verbose_name='评分人'
    )
    graded_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='评分时间'
    )
    comment = models.TextField(
        blank=True,
        default='',
        verbose_name='评语'
    )
    
    class Meta:
        db_table = 'lms_answer'
        verbose_name = '答案记录'
        verbose_name_plural = '答案记录'
        unique_together = ['submission', 'question']
        ordering = ['submission', 'question']
    
    def __str__(self):
        return f"{self.submission} - {self.question}"
    
    @property
    def is_objective(self):
        """是否为客观题答案"""
        return self.question.is_objective
    
    @property
    def is_subjective(self):
        """是否为主观题答案"""
        return self.question.is_subjective
    
    @property
    def is_graded(self):
        """是否已评分"""
        if self.is_objective:
            return True  # 客观题自动评分
        return self.graded_by is not None
    
    def auto_grade(self):
        """
        自动评分（仅适用于客观题）
        
        Property 30: 客观题自动评分
        """
        if self.is_subjective:
            return  # 主观题不自动评分
        
        is_correct, score = self.question.check_answer(self.user_answer)
        self.is_correct = is_correct
        self.obtained_score = score
        self.save(update_fields=['is_correct', 'obtained_score'])
    
    def grade(self, grader, score, comment=''):
        """
        人工评分（主观题）
        
        Args:
            grader: 评分人 User 实例
            score: 给定分数
            comment: 评语
            
        Requirements: 13.3
        """
        if self.is_objective:
            raise ValidationError('客观题不需要人工评分')
        
        if score < 0 or score > self.question.score:
            raise ValidationError(f'分数必须在 0 到 {self.question.score} 之间')
        
        self.graded_by = grader
        self.graded_at = timezone.now()
        self.obtained_score = Decimal(str(score))
        self.comment = comment
        
        # 主观题的正确性由评分人判断
        # 如果得分等于满分，认为是正确的
        self.is_correct = (self.obtained_score == self.question.score)
        
        self.save()
        
        # 检查是否所有主观题都已评分
        submission = self.submission
        if submission.all_subjective_graded and submission.status == 'GRADING':
            submission.complete_grading()
