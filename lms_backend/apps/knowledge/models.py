"""
Knowledge models for LMS.

Implements:
- KnowledgeCategory: 知识分类（一级/二级）
- Knowledge: 知识文档
- KnowledgeCategoryRelation: 知识与分类的关联

Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
"""
from django.db import models
from django.core.exceptions import ValidationError

from core.mixins import TimestampMixin, SoftDeleteMixin, CreatorMixin


class KnowledgeCategory(TimestampMixin, models.Model):
    """
    知识分类模型
    
    支持两级分类结构:
    - 一级分类（条线/领域大类）: parent 为 null
    - 二级分类（所属系统）: parent 指向一级分类
    
    Requirements: 4.6
    """
    name = models.CharField(max_length=100, verbose_name='分类名称')
    code = models.CharField(max_length=50, unique=True, verbose_name='分类代码')
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        verbose_name='父分类'
    )
    description = models.TextField(blank=True, default='', verbose_name='分类描述')
    sort_order = models.IntegerField(default=0, verbose_name='排序顺序')
    
    class Meta:
        db_table = 'lms_knowledge_category'
        verbose_name = '知识分类'
        verbose_name_plural = '知识分类'
        ordering = ['sort_order', 'code']
    
    def __str__(self):
        if self.parent:
            return f"{self.parent.name} > {self.name}"
        return self.name
    
    @property
    def is_primary(self):
        """是否为一级分类"""
        return self.parent is None

    
    @property
    def level(self):
        """获取分类层级（1 或 2）"""
        return 1 if self.parent is None else 2
    
    def clean(self):
        """验证分类层级不超过两级"""
        super().clean()
        if self.parent and self.parent.parent:
            raise ValidationError({'parent': '分类最多支持两级'})
    
    def get_children(self):
        """获取子分类"""
        return self.children.all()


class Knowledge(TimestampMixin, SoftDeleteMixin, CreatorMixin, models.Model):
    """
    知识文档模型
    
    知识类型:
    - EMERGENCY: 应急类知识，使用结构化字段
    - OTHER: 其他类型知识，使用自由正文
    
    Requirements:
    - 4.1: 创建知识文档时要求指定知识类型
    - 4.2: 应急类知识启用结构化正文字段
    - 4.3: 其他类型知识启用 Markdown/富文本自由正文
    - 4.4: 编辑知识文档时更新内容并记录最后更新时间
    - 4.5: 删除知识文档时检查是否被任务引用
    """
    KNOWLEDGE_TYPE_CHOICES = [
        ('EMERGENCY', '应急类'),
        ('OTHER', '其他类型'),
    ]
    
    title = models.CharField(max_length=200, verbose_name='标题')
    knowledge_type = models.CharField(
        max_length=20,
        choices=KNOWLEDGE_TYPE_CHOICES,
        verbose_name='知识类型'
    )
    summary = models.TextField(blank=True, default='', verbose_name='摘要')
    
    # 自由正文（用于 OTHER 类型）
    content = models.TextField(blank=True, default='', verbose_name='正文内容')
    
    # 结构化字段（用于 EMERGENCY 类型）
    fault_scenario = models.TextField(blank=True, default='', verbose_name='故障场景')
    trigger_process = models.TextField(blank=True, default='', verbose_name='触发流程')
    solution = models.TextField(blank=True, default='', verbose_name='解决方案')
    verification_plan = models.TextField(blank=True, default='', verbose_name='验证方案')
    recovery_plan = models.TextField(blank=True, default='', verbose_name='恢复方案')
    
    # 操作类型标签
    operation_tags = models.JSONField(default=list, blank=True, verbose_name='操作类型标签')
    
    # 分类关联（多对多）
    categories = models.ManyToManyField(
        KnowledgeCategory,
        through='KnowledgeCategoryRelation',
        related_name='knowledge_items',
        verbose_name='所属分类'
    )
    
    # 最后更新者
    updated_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='knowledge_updated',
        verbose_name='最后更新者'
    )
    
    # 阅读统计
    view_count = models.PositiveIntegerField(default=0, verbose_name='阅读次数')
    
    class Meta:
        db_table = 'lms_knowledge'
        verbose_name = '知识文档'
        verbose_name_plural = '知识文档'
        ordering = ['-updated_at']

    
    def __str__(self):
        return self.title
    
    def clean(self):
        """
        验证知识文档:
        - 应急类知识必须填写结构化字段
        - 其他类型知识必须填写正文内容
        """
        super().clean()
        if self.knowledge_type == 'EMERGENCY':
            # 应急类知识至少需要填写故障场景和解决方案
            if not self.fault_scenario:
                raise ValidationError({'fault_scenario': '应急类知识必须填写故障场景'})
            if not self.solution:
                raise ValidationError({'solution': '应急类知识必须填写解决方案'})
        else:
            # 其他类型知识必须填写正文
            if not self.content:
                raise ValidationError({'content': '其他类型知识必须填写正文内容'})
    
    def is_referenced_by_task(self):
        """
        检查知识是否被任务引用
        
        Requirements: 4.5
        Property 12: 被引用知识删除保护
        """
        # 延迟导入避免循环依赖
        # TaskKnowledge 模型将在 tasks app 中定义
        try:
            from apps.tasks.models import TaskKnowledge
            return TaskKnowledge.objects.filter(knowledge=self).exists()
        except ImportError:
            # tasks app 尚未实现
            return False
    
    def delete(self, *args, **kwargs):
        """
        重写删除方法，实现删除保护
        
        Requirements: 4.5
        Property 12: 被引用知识删除保护
        """
        if self.is_referenced_by_task():
            raise ValidationError('该知识文档已被任务引用，无法删除')
        super().delete(*args, **kwargs)
    
    def increment_view_count(self):
        """增加阅读次数"""
        self.view_count += 1
        self.save(update_fields=['view_count'])
    
    @property
    def primary_category(self):
        """获取主要一级分类"""
        relation = self.category_relations.filter(
            category__parent__isnull=True
        ).first()
        return relation.category if relation else None
    
    @property
    def secondary_category(self):
        """获取主要二级分类"""
        relation = self.category_relations.filter(
            category__parent__isnull=False
        ).first()
        return relation.category if relation else None


class KnowledgeCategoryRelation(TimestampMixin, models.Model):
    """
    知识与分类的关联模型
    
    支持知识文档关联多个分类（一级和二级）
    
    Requirements: 4.6
    """
    knowledge = models.ForeignKey(
        Knowledge,
        on_delete=models.CASCADE,
        related_name='category_relations',
        verbose_name='知识文档'
    )
    category = models.ForeignKey(
        KnowledgeCategory,
        on_delete=models.CASCADE,
        related_name='knowledge_relations',
        verbose_name='分类'
    )
    is_primary = models.BooleanField(default=False, verbose_name='是否主分类')
    
    class Meta:
        db_table = 'lms_knowledge_category_relation'
        verbose_name = '知识分类关联'
        verbose_name_plural = '知识分类关联'
        unique_together = ['knowledge', 'category']
        ordering = ['knowledge', 'category']
    
    def __str__(self):
        return f"{self.knowledge.title} - {self.category.name}"
