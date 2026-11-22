"""答题与评分模型。

提交记录只引用任务试卷及其冻结题目，不回读资源中心的当前试卷和题库。
"""

from decimal import Decimal

from django.db import models
from django.utils import timezone

from core.mixins import TimestampMixin


class Submission(TimestampMixin, models.Model):
    """一次试卷作答记录。"""

    STATUS_CHOICES = [
        ('IN_PROGRESS', '答题中'),
        ('SUBMITTED', '已提交'),
        ('GRADING', '待评分'),
        ('GRADED', '已评分'),
    ]

    task_assignment = models.ForeignKey(
        'tasks.TaskAssignment',
        on_delete=models.CASCADE,
        related_name='submissions',
        verbose_name='任务分配',
    )
    task_quiz = models.ForeignKey(
        'tasks.TaskQuiz',
        on_delete=models.PROTECT,
        related_name='submissions',
        verbose_name='任务试卷',
    )
    user = models.ForeignKey(
        'users.User',
        on_delete=models.PROTECT,
        related_name='submissions',
        verbose_name='答题用户',
    )
    attempt_number = models.PositiveIntegerField(default=1, verbose_name='答题次数')
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='IN_PROGRESS',
        verbose_name='状态',
    )
    total_score = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=Decimal('0'),
        verbose_name='试卷总分',
    )
    obtained_score = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='获得分数',
    )
    objective_score = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='客观题得分',
    )
    subjective_score = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='主观题得分',
    )
    started_at = models.DateTimeField(auto_now_add=True, verbose_name='开始时间')
    submitted_at = models.DateTimeField(null=True, blank=True, verbose_name='提交时间')
    remaining_seconds = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='剩余时间（秒）',
    )

    class Meta:
        db_table = 'lms_submission'
        verbose_name = '答题记录'
        verbose_name_plural = '答题记录'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['task_assignment', 'task_quiz', 'attempt_number'],
                name='uniq_submission_assignment_quiz_attempt',
            ),
        ]
        indexes = [
            models.Index(
                fields=['task_quiz', 'task_assignment', 'status', 'attempt_number'],
                name='idx_sub_quiz_assign_stat_att',
            ),
            models.Index(
                fields=['task_quiz', 'status'],
                name='idx_sub_quiz_status',
            ),
        ]

    def __str__(self):
        return f'{self.user.username} - {self.task_quiz.title} (第{self.attempt_number}次)'

    def save(self, *args, **kwargs):
        """创建时补齐答题用户和试卷总分。"""
        if not self.pk:
            if not self.user_id:
                self.user = self.task_assignment.assignee
            if not self.total_score:
                self.total_score = self.task_quiz.total_score
        super().save(*args, **kwargs)

    @property
    def task(self):
        return self.task_assignment.task

    @property
    def has_subjective_questions(self):
        return self.task_quiz.has_subjective_questions

    @property
    def ungraded_subjective_count(self):
        return self.answers.filter(
            question__question_type='SHORT_ANSWER',
            graded_by__isnull=True,
        ).count()

    @property
    def all_subjective_graded(self):
        return self.ungraded_subjective_count == 0

    @property
    def pass_score(self):
        if self.task_quiz.pass_score is None:
            return None
        return float(self.task_quiz.pass_score)

    @property
    def is_passed(self):
        if (
            self.status not in ('SUBMITTED', 'GRADED')
            or self.task_quiz.allow_retry
            or self.obtained_score is None
            or self.task_quiz.pass_score is None
        ):
            return None
        return self.obtained_score >= self.task_quiz.pass_score

    def get_reference_remaining_seconds(self):
        """返回参考剩余秒数；未配置时长（如测验）直接返回 None。"""
        if not self.task_quiz.duration:
            return None
        base_seconds = self.remaining_seconds
        if base_seconds is None:
            base_seconds = self.task_quiz.duration * 60
        elapsed_seconds = max(0, int((timezone.now() - self.started_at).total_seconds()))
        return max(base_seconds - elapsed_seconds, 0)

class Answer(TimestampMixin, models.Model):
    """单题作答记录。

    主观题答案存在 `text_answer`；客观题答案存在 `AnswerSelection` 关联表。
    """

    submission = models.ForeignKey(
        Submission,
        on_delete=models.CASCADE,
        related_name='answers',
        verbose_name='答题记录',
    )
    question = models.ForeignKey(
        'quizzes.TaskQuizQuestion',
        on_delete=models.PROTECT,
        related_name='answers',
        verbose_name='试卷题目快照',
    )
    text_answer = models.TextField(blank=True, default='', verbose_name='文本答案')
    is_marked = models.BooleanField(default=False, verbose_name='是否标记')
    is_correct = models.BooleanField(null=True, blank=True, verbose_name='是否正确')
    obtained_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0'),
        verbose_name='得分',
    )
    graded_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='graded_answers',
        verbose_name='评分人',
    )
    graded_at = models.DateTimeField(null=True, blank=True, verbose_name='评分时间')
    comment = models.TextField(blank=True, default='', verbose_name='评语')

    class Meta:
        db_table = 'lms_answer'
        verbose_name = '答案记录'
        verbose_name_plural = '答案记录'
        ordering = ['submission', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['submission', 'question'],
                name='uniq_submission_revision_question',
            ),
        ]
        indexes = [
            models.Index(
                fields=['submission', 'graded_by'],
                name='idx_ans_sub_graded_by',
            ),
        ]

    def __str__(self):
        return f'{self.submission} - {self.question}'

    def _ordered_answer_selections(self):
        """按快照选项顺序返回用户选择，保证多选题答案展示稳定。"""
        cached = getattr(self, '_prefetched_objects_cache', {})
        if 'answer_selections' in cached:
            return sorted(
                cached['answer_selections'],
                key=lambda selection: (
                    selection.question_option.sort_order,
                    selection.id,
                ),
            )
        return list(
            self.answer_selections.select_related('question_option').order_by(
                'question_option__sort_order',
                'id',
            )
        )

    @property
    def is_objective(self):
        return self.question.is_objective

    @property
    def is_subjective(self):
        return self.question.is_subjective

    @property
    def user_answer(self):
        if self.is_subjective:
            text = self.text_answer.strip()
            return text or None

        option_id_key_map = self.question.get_option_id_key_map()
        selected_keys = [
            option_id_key_map[selection.question_option_id]
            for selection in self._ordered_answer_selections()
            if selection.question_option_id in option_id_key_map
        ]
        if not selected_keys:
            return None
        if self.question.question_type == 'MULTIPLE_CHOICE':
            return selected_keys
        return selected_keys[0]

    @property
    def max_score(self):
        return self.question.score

    def auto_grade(self, *, save: bool = True):
        """客观题自动判分；主观题留给人工评分流程。"""
        if self.is_subjective:
            return
        is_correct, score = self.question.check_answer(
            self.user_answer,
            full_score=self.max_score,
        )
        self.is_correct = is_correct
        self.obtained_score = score
        if save:
            self.save(update_fields=['is_correct', 'obtained_score'])

    def apply_manual_grade(self, grader, score: Decimal, comment=''):
        """写入人工评分结果并同步是否满分。"""
        self.graded_by = grader
        self.graded_at = timezone.now()
        self.obtained_score = score
        self.comment = comment
        self.is_correct = self.obtained_score == self.max_score
        self.save()


class AnswerSelection(TimestampMixin, models.Model):
    """客观题作答与题目选项的关联。"""

    answer = models.ForeignKey(
        Answer,
        on_delete=models.CASCADE,
        related_name='answer_selections',
        verbose_name='答案记录',
    )
    question_option = models.ForeignKey(
        'quizzes.TaskQuizQuestionOption',
        on_delete=models.PROTECT,
        related_name='answer_selections',
        verbose_name='题目选项',
    )

    class Meta:
        db_table = 'lms_answer_selection'
        verbose_name = '答案选项'
        verbose_name_plural = '答案选项'
        ordering = ['answer_id', 'question_option_id']
        constraints = [
            models.UniqueConstraint(
                fields=['answer', 'question_option'],
                name='uniq_answer_question_option',
            ),
        ]

    def __str__(self):
        return f'{self.answer_id}-{self.question_option_id}'
