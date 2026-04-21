"""答题与评分模型。

提交记录只引用任务里的 `QuizRevision` 和 `QuizRevisionQuestion`，不回读资源中心的
当前试卷/题目。这样阅卷和统计始终基于学员实际作答时看到的内容。
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
        null=True,
        blank=True,
        verbose_name='任务试卷',
    )
    quiz = models.ForeignKey(
        'quizzes.QuizRevision',
        on_delete=models.PROTECT,
        related_name='submissions',
        verbose_name='试卷快照',
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

    def __str__(self):
        return f'{self.user.username} - {self.quiz.title} (第{self.attempt_number}次)'

    def save(self, *args, **kwargs):
        """创建时补齐答题用户、试卷总分和任务试卷关联。"""
        if not self.pk:
            if not self.user_id:
                self.user = self.task_assignment.assignee
            if not self.total_score:
                self.total_score = self.quiz.total_score
            if not self.task_quiz_id:
                self.task_quiz = self.task_assignment.task.task_quizzes.filter(
                    quiz_id=self.quiz_id
                ).first()
        super().save(*args, **kwargs)

    @property
    def task(self):
        return self.task_assignment.task

    @property
    def has_subjective_questions(self):
        return self.quiz.has_subjective_questions

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
        return float(self.quiz.pass_score) if self.quiz.pass_score else None

    @property
    def is_passed(self):
        if self.quiz.quiz_type != 'EXAM':
            return None
        if not self.quiz.pass_score or self.obtained_score is None:
            return None
        return self.obtained_score >= self.quiz.pass_score

    def get_reference_remaining_seconds(self):
        """返回考试计时的参考剩余秒数。

        保存答案时会记录 `remaining_seconds`，重新进入考试时再扣除离线期间耗时。
        """
        if self.quiz.quiz_type != 'EXAM':
            return None
        base_seconds = self.remaining_seconds
        if base_seconds is None:
            if not self.quiz.duration:
                return None
            base_seconds = self.quiz.duration * 60
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
        'quizzes.QuizRevisionQuestion',
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
    def is_graded(self):
        if self.is_objective:
            return True
        return self.graded_by is not None

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

    def auto_grade(self):
        """客观题自动判分；主观题留给人工评分流程。"""
        if self.is_subjective:
            return
        is_correct, score = self.question.check_answer(
            self.user_answer,
            full_score=self.max_score,
        )
        self.is_correct = is_correct
        self.obtained_score = score
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
        'quizzes.QuizRevisionQuestionOption',
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
