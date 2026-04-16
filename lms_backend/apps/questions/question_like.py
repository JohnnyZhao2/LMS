from __future__ import annotations

from decimal import Decimal

from django.db import models


QUESTION_TYPE_CHOICES = [
    ('SINGLE_CHOICE', '单选题'),
    ('MULTIPLE_CHOICE', '多选题'),
    ('TRUE_FALSE', '判断题'),
    ('SHORT_ANSWER', '简答题'),
]


def build_choice_option_key(index: int) -> str:
    """将 0-based 索引转换为 A/B/.../Z/AA 的展示键。"""
    label_index = index + 1
    chars: list[str] = []
    while label_index > 0:
        label_index, remainder = divmod(label_index - 1, 26)
        chars.append(chr(65 + remainder))
    return ''.join(reversed(chars))


class QuestionContentMixin(models.Model):
    """题目内容共用字段与行为。"""

    content = models.TextField(default='', verbose_name='题目内容')
    question_type = models.CharField(
        max_length=20,
        choices=QUESTION_TYPE_CHOICES,
        default='SHORT_ANSWER',
        verbose_name='题目类型',
    )
    reference_answer = models.TextField(
        blank=True,
        default='',
        verbose_name='参考答案',
    )
    explanation = models.TextField(
        blank=True,
        default='',
        verbose_name='解析',
    )
    score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=1.0,
        verbose_name='分值',
    )

    class Meta:
        abstract = True

    @property
    def is_objective(self):
        return self.question_type in ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE']

    @property
    def is_subjective(self):
        return self.question_type == 'SHORT_ANSWER'

    def _ordered_options(self):
        cached = getattr(self, '_prefetched_objects_cache', {})
        if 'question_options' in cached:
            return sorted(
                cached['question_options'],
                key=lambda option: (option.sort_order, option.id),
            )
        return list(self.question_options.order_by('sort_order', 'id'))

    def get_option_descriptors(self) -> list[dict]:
        options = self._ordered_options()
        if self.question_type == 'SHORT_ANSWER':
            return []

        if self.question_type == 'TRUE_FALSE':
            keys = ['TRUE', 'FALSE']
        else:
            keys = [build_choice_option_key(index) for index in range(len(options))]

        return [
            {
                'id': option.id,
                'key': keys[index],
                'value': option.content,
                'is_correct': option.is_correct,
                'sort_order': option.sort_order,
            }
            for index, option in enumerate(options)
        ]

    @property
    def options(self):
        return [
            {
                'key': option['key'],
                'value': option['value'],
            }
            for option in self.get_option_descriptors()
        ]

    @property
    def answer(self):
        if self.question_type == 'SHORT_ANSWER':
            return self.reference_answer

        correct_keys = [
            option['key']
            for option in self.get_option_descriptors()
            if option['is_correct']
        ]
        if self.question_type == 'MULTIPLE_CHOICE':
            return correct_keys
        return correct_keys[0] if correct_keys else ''

    def get_option_key_map(self) -> dict[str, dict]:
        return {
            option['key']: option
            for option in self.get_option_descriptors()
        }

    def get_option_id_key_map(self) -> dict[int, str]:
        return {
            option['id']: option['key']
            for option in self.get_option_descriptors()
            if option['id'] is not None
        }

    def check_answer(self, user_answer, full_score=None):
        if self.is_subjective:
            return None, Decimal('0')

        if self.question_type == 'SINGLE_CHOICE':
            is_correct = user_answer == self.answer
        elif self.question_type == 'MULTIPLE_CHOICE':
            if isinstance(user_answer, list):
                is_correct = set(user_answer) == set(self.answer)
            else:
                is_correct = False
        elif self.question_type == 'TRUE_FALSE':
            is_correct = user_answer == self.answer
        else:
            is_correct = False

        resolved_score = self.score if full_score is None else Decimal(str(full_score))
        return is_correct, resolved_score if is_correct else Decimal('0')


class QuestionOptionContentMixin(models.Model):
    """题目选项共用字段。"""

    sort_order = models.PositiveIntegerField(
        default=1,
        verbose_name='排序',
    )
    content = models.TextField(
        verbose_name='选项内容',
    )
    is_correct = models.BooleanField(
        default=False,
        verbose_name='是否正确答案',
    )

    class Meta:
        abstract = True
