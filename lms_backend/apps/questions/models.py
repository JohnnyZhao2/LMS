"""
Question models for LMS.

Implements:
- Question: 题目模型

Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
"""
import uuid

from django.db import models
from django.core.exceptions import ValidationError
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone

from core.mixins import TimestampMixin, SoftDeleteMixin, CreatorMixin


class Question(TimestampMixin, SoftDeleteMixin, CreatorMixin, models.Model):
    """
    题目模型
    
    题目类型:
    - SINGLE_CHOICE: 单选题
    - MULTIPLE_CHOICE: 多选题
    - TRUE_FALSE: 判断题
    - SHORT_ANSWER: 简答题
    
    Requirements:
    - 5.1: 创建题目时存储题目内容、类型、答案和解析，并记录创建者
    - 5.3: 导师或室经理仅允许编辑自己创建的题目
    - 5.4: 导师或室经理仅允许删除自己创建的题目
    - 5.5: 管理员允许查看/创建/编辑/删除所有题目
    - 5.7: 题目被试卷引用时禁止删除
    
    Properties:
    - Property 13: 被引用题目删除保护
    - Property 15: 题目所有权编辑控制
    """
    QUESTION_TYPE_CHOICES = [
        ('SINGLE_CHOICE', '单选题'),
        ('MULTIPLE_CHOICE', '多选题'),
        ('TRUE_FALSE', '判断题'),
        ('SHORT_ANSWER', '简答题'),
    ]
    STATUS_CHOICES = [
        ('DRAFT', '草稿'),
        ('PUBLISHED', '已发布'),
    ]
    
    # 题目内容
    content = models.TextField(verbose_name='题目内容')
    
    # 题目类型
    question_type = models.CharField(
        max_length=20,
        choices=QUESTION_TYPE_CHOICES,
        verbose_name='题目类型'
    )
    
    # 选项（用于选择题，JSON 格式存储）
    # 格式: [{"key": "A", "value": "选项内容"}, ...]
    options = models.JSONField(
        default=list,
        blank=True,
        verbose_name='选项'
    )
    
    # 答案
    # 单选题: "A"
    # 多选题: ["A", "B", "C"]
    # 判断题: "TRUE" 或 "FALSE"
    # 简答题: 参考答案文本
    answer = models.JSONField(verbose_name='答案')
    
    # 解析
    explanation = models.TextField(
        blank=True,
        default='',
        verbose_name='解析'
    )
    
    # 分值（默认为 1 分）
    score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=1.0,
        verbose_name='分值'
    )
    
    # 难度等级
    DIFFICULTY_CHOICES = [
        ('EASY', '简单'),
        ('MEDIUM', '中等'),
        ('HARD', '困难'),
    ]
    difficulty = models.CharField(
        max_length=10,
        choices=DIFFICULTY_CHOICES,
        default='MEDIUM',
        verbose_name='难度等级'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PUBLISHED',
        verbose_name='发布状态'
    )
    resource_uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        db_index=True,
        verbose_name='资源标识'
    )
    version_number = models.PositiveIntegerField(
        default=1,
        verbose_name='版本号'
    )
    source_version = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='question_versions',
        verbose_name='来源版本'
    )
    published_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='发布时间'
    )
    is_current = models.BooleanField(
        default=True,
        verbose_name='是否当前版本'
    )
    
    # 条线类型通过ResourceLineType关联（多态关系）
    # 使用property提供便捷访问
    @property
    def line_type(self):
        """获取条线类型（单选）"""
        from apps.knowledge.models import ResourceLineType
        relation = ResourceLineType.objects.filter(
            content_type=ContentType.objects.get_for_model(self),
            object_id=self.id
        ).first()
        return relation.line_type if relation else None
    
    def set_line_type(self, line_type):
        """设置条线类型"""
        from apps.knowledge.models import ResourceLineType
        from django.core.exceptions import ValidationError
        
        if line_type and line_type.tag_type != 'LINE':
            raise ValidationError('只能设置条线类型标签')
        
        # 删除旧的关系
        ResourceLineType.objects.filter(
            content_type=ContentType.objects.get_for_model(self),
            object_id=self.id
        ).delete()
        
        # 创建新关系
        if line_type:
            ResourceLineType.objects.create(
                content_type=ContentType.objects.get_for_model(self),
                object_id=self.id,
                line_type=line_type
            )
    
    class Meta:
        db_table = 'lms_question'
        verbose_name = '题目'
        verbose_name_plural = '题目'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['resource_uuid', 'version_number'],
                name='uniq_question_resource_version'
            )
        ]
    
    def __str__(self):
        # 截取题目内容前 50 个字符
        content_preview = self.content[:50] + '...' if len(self.content) > 50 else self.content
        return f"[{self.get_question_type_display()}] {content_preview}"
    
    def clean(self):
        """
        验证题目数据:
        - 选择题必须有选项
        - 判断题答案必须是 TRUE 或 FALSE
        - 选择题答案必须在选项范围内
        """
        super().clean()
        
        # 选择题验证
        if self.question_type in ['SINGLE_CHOICE', 'MULTIPLE_CHOICE']:
            if not self.options:
                raise ValidationError({'options': '选择题必须设置选项'})
            
            # 获取所有选项的 key
            option_keys = [opt.get('key') for opt in self.options if isinstance(opt, dict)]
            
            # 验证答案在选项范围内
            if self.question_type == 'SINGLE_CHOICE':
                if not isinstance(self.answer, str):
                    raise ValidationError({'answer': '单选题答案必须是字符串'})
                if self.answer not in option_keys:
                    raise ValidationError({'answer': '单选题答案必须是有效的选项'})
            else:  # MULTIPLE_CHOICE
                if not isinstance(self.answer, list):
                    raise ValidationError({'answer': '多选题答案必须是列表'})
                for ans in self.answer:
                    if ans not in option_keys:
                        raise ValidationError({'answer': f'多选题答案 {ans} 不是有效的选项'})
        
        # 判断题验证
        elif self.question_type == 'TRUE_FALSE':
            if self.answer not in ['TRUE', 'FALSE']:
                raise ValidationError({'answer': '判断题答案必须是 TRUE 或 FALSE'})
        
        # 简答题验证
        elif self.question_type == 'SHORT_ANSWER':
            if not isinstance(self.answer, str):
                raise ValidationError({'answer': '简答题答案必须是字符串'})
    
    def is_referenced_by_quiz(self):
        """
        检查题目是否被未删除的试卷引用
        
        Requirements: 5.7
        Property 13: 被引用题目删除保护
        
        Note: 只检查未被软删除的试卷，已删除的试卷不阻止题目删除
        """
        # 延迟导入避免循环依赖
        try:
            from apps.quizzes.models import QuizQuestion
            # 只检查未被软删除的试卷的引用
            return QuizQuestion.objects.filter(
                question=self,
                quiz__is_deleted=False  # 排除已软删除的试卷
            ).exists()
        except ImportError:
            # quizzes app 尚未实现
            return False
    
    def delete(self, *args, **kwargs):
        """
        重写删除方法，实现删除保护
        
        Requirements: 5.7
        Property 13: 被引用题目删除保护
        """
        if self.is_referenced_by_quiz():
            raise ValidationError('该题目已被试卷引用，无法删除')
        super().delete(*args, **kwargs)
    
    @classmethod
    def next_version_number(cls, resource_uuid):
        if not resource_uuid:
            return 1
        aggregate = cls.objects.filter(
            resource_uuid=resource_uuid,
            is_deleted=False
        ).aggregate(
            max_version=models.Max('version_number')
        )
        max_version = aggregate['max_version'] or 0
        return max_version + 1
    
    def clone_new_version(self):
        """
        创建当前题目的新版本，保持历史版本只读。
        """
        new_question = Question.objects.create(
            content=self.content,
            question_type=self.question_type,
            options=self.options,
            answer=self.answer,
            explanation=self.explanation,
            score=self.score,
            difficulty=self.difficulty,
            created_by=self.created_by,
            status='PUBLISHED',
            resource_uuid=self.resource_uuid,
            version_number=self.next_version_number(self.resource_uuid),
            source_version=self,
            published_at=timezone.now(),
            is_current=True
        )
        if self.line_type:
            new_question.set_line_type(self.line_type)
        Question.objects.filter(
            resource_uuid=self.resource_uuid,
            status='PUBLISHED'
        ).exclude(pk=new_question.pk).update(is_current=False)
        return new_question
    
    @property
    def is_objective(self):
        """
        是否为客观题（可自动评分）
        
        客观题包括: 单选题、多选题、判断题
        主观题包括: 简答题
        """
        return self.question_type in ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE']
    
    @property
    def is_subjective(self):
        """是否为主观题（需人工评分）"""
        return self.question_type == 'SHORT_ANSWER'
    
    def check_answer(self, user_answer):
        """
        检查用户答案是否正确（仅适用于客观题）
        
        Args:
            user_answer: 用户提交的答案
            
        Returns:
            tuple: (is_correct: bool, obtained_score: Decimal)
        """
        from decimal import Decimal
        
        if self.is_subjective:
            # 主观题无法自动评分
            return None, Decimal('0')
        
        if self.question_type == 'SINGLE_CHOICE':
            is_correct = user_answer == self.answer
        elif self.question_type == 'MULTIPLE_CHOICE':
            # 多选题需要完全匹配
            if isinstance(user_answer, list):
                is_correct = set(user_answer) == set(self.answer)
            else:
                is_correct = False
        elif self.question_type == 'TRUE_FALSE':
            is_correct = user_answer == self.answer
        else:
            is_correct = False
        
        obtained_score = self.score if is_correct else Decimal('0')
        return is_correct, obtained_score
