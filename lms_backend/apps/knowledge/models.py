"""
Knowledge models for LMS.

Implements:
- Tag: 统一标签模型（条线类型/系统标签/操作标签）
- ResourceLineType: 资源条线类型关系表（通用多态关系）
- Knowledge: 知识文档

Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
"""
from django.db import models
from django.core.exceptions import ValidationError
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey

from core.mixins import TimestampMixin, SoftDeleteMixin, CreatorMixin


class Tag(TimestampMixin, models.Model):
    """
    统一标签模型
    
    支持三种标签类型：
    - LINE: 条线类型（一级分类）
    - SYSTEM: 系统标签（二级分类，可关联条线）
    - OPERATION: 操作标签
    
    Attributes:
        name: 标签名称
        tag_type: 标签类型
        parent: 父标签（系统标签可关联条线类型）
        sort_order: 排序序号
        is_active: 是否启用
    
    Requirements: 4.6
    """
    TAG_TYPE_CHOICES = [
        ('LINE', '条线类型'),
        ('SYSTEM', '系统标签'),
        ('OPERATION', '操作标签'),
    ]
    
    name = models.CharField(max_length=100, verbose_name='标签名称')
    tag_type = models.CharField(
        max_length=20,
        choices=TAG_TYPE_CHOICES,
        verbose_name='标签类型'
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='children',
        verbose_name='父标签',
        help_text='系统标签可关联条线类型'
    )
    sort_order = models.IntegerField(default=0, verbose_name='排序序号')
    is_active = models.BooleanField(default=True, verbose_name='是否启用')
    
    class Meta:
        db_table = 'lms_tag'
        verbose_name = '标签'
        verbose_name_plural = '标签'
        ordering = ['tag_type', 'sort_order', 'name']
        # 同类型下标签名称唯一
        unique_together = [['name', 'tag_type']]
    
    def __str__(self):
        return f"{self.name} ({self.get_tag_type_display()})"
    
    def clean(self):
        """验证标签"""
        super().clean()
        # 只有系统标签可以有父标签，且父标签必须是条线类型
        if self.parent:
            if self.tag_type != 'SYSTEM':
                raise ValidationError({
                    'parent': '只有系统标签可以关联父标签'
                })
            if self.parent.tag_type != 'LINE':
                raise ValidationError({
                    'parent': '父标签必须是条线类型'
                })


class ResourceLineType(TimestampMixin, models.Model):
    """
    资源条线类型关系表（通用多态关系）
    
    用于统一管理所有资源（知识、题目等）与条线类型的关系。
    使用Django ContentType实现多态关系，支持未来扩展。
    
    Attributes:
        content_type: 资源类型（Knowledge, Question等）
        object_id: 资源ID
        content_object: 通用外键，指向具体资源
        line_type: 条线类型Tag
    """
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        verbose_name='资源类型'
    )
    object_id = models.PositiveIntegerField(verbose_name='资源ID')
    content_object = GenericForeignKey('content_type', 'object_id')
    
    line_type = models.ForeignKey(
        Tag,
        on_delete=models.PROTECT,
        related_name='resource_line_types',
        verbose_name='条线类型',
        limit_choices_to={'tag_type': 'LINE', 'is_active': True}
    )
    
    class Meta:
        db_table = 'lms_resource_line_type'
        verbose_name = '资源条线类型'
        verbose_name_plural = '资源条线类型'
        unique_together = [['content_type', 'object_id', 'line_type']]
        indexes = [
            models.Index(fields=['content_type', 'object_id']),
        ]
    
    def __str__(self):
        return f"{self.content_object} - {self.line_type.name}"


class Knowledge(TimestampMixin, SoftDeleteMixin, CreatorMixin, models.Model):
    """
    知识文档模型
    
    知识类型:
    - EMERGENCY: 应急类知识 - 使用结构化字段（故障场景/触发流程/解决方案/验证方案/恢复方案）
    - OTHER: 其他类型知识 - 使用 Markdown/富文本自由正文
    
    发布状态:
    - DRAFT: 草稿 - 仅创建者和管理员可见，不能用于任务分配
    - PUBLISHED: 已发布 - 所有人可见，可用于任务分配
    
    标签关系:
    - line_type: 通过ResourceLineType关联（多态关系，单选）
    - system_tags: 系统标签（多对多，多选）
    - operation_tags: 操作标签（多对多，多选）
    
    Requirements:
    - 4.1: 创建知识文档时要求指定知识类型
    - 4.2: 应急类知识使用结构化正文字段
    - 4.3: 其他类型知识使用 Markdown/富文本自由正文
    - 4.4: 编辑知识文档时更新内容并记录最后更新时间
    - 4.5: 删除知识文档时检查是否被任务引用
    - 4.6: 存储所属条线（一级分类）、所属系统（二级分类）和操作类型标签
    """
    KNOWLEDGE_TYPE_CHOICES = [
        ('EMERGENCY', '应急类'),
        ('OTHER', '其他类型'),
    ]
    
    STATUS_CHOICES = [
        ('DRAFT', '草稿'),
        ('PUBLISHED', '已发布'),
    ]
    
    title = models.CharField(max_length=200, verbose_name='标题')
    knowledge_type = models.CharField(
        max_length=20,
        choices=KNOWLEDGE_TYPE_CHOICES,
        verbose_name='知识类型'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='DRAFT',
        verbose_name='发布状态',
        help_text='草稿状态仅创建者和管理员可见，已发布状态可用于任务分配'
    )
    
    # 条线类型通过ResourceLineType关联（多态关系）
    # 使用property提供便捷访问
    @property
    def line_type(self):
        """获取条线类型（单选）"""
        relation = ResourceLineType.objects.filter(
            content_type=ContentType.objects.get_for_model(self),
            object_id=self.id
        ).first()
        return relation.line_type if relation else None
    
    def set_line_type(self, line_type):
        """设置条线类型"""
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
    
    # 系统标签（二级分类）- 多对多，多选
    system_tags = models.ManyToManyField(
        Tag,
        related_name='knowledge_by_system',
        blank=True,
        verbose_name='系统标签',
        limit_choices_to={'tag_type': 'SYSTEM', 'is_active': True}
    )
    
    # 操作类型标签 - 多对多，多选
    operation_tags = models.ManyToManyField(
        Tag,
        related_name='knowledge_by_operation',
        blank=True,
        verbose_name='操作标签',
        limit_choices_to={'tag_type': 'OPERATION', 'is_active': True}
    )
    
    # 应急类知识的结构化字段（Requirements: 4.2）
    fault_scenario = models.TextField(blank=True, default='', verbose_name='故障场景')
    trigger_process = models.TextField(blank=True, default='', verbose_name='触发流程')
    solution = models.TextField(blank=True, default='', verbose_name='解决方案')
    verification_plan = models.TextField(blank=True, default='', verbose_name='验证方案')
    recovery_plan = models.TextField(blank=True, default='', verbose_name='恢复方案')
    
    # 其他类型知识的正文内容（Requirements: 4.3）
    content = models.TextField(blank=True, default='', verbose_name='正文内容')
    
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
    
    # 关联已发布版本（用于草稿关联其对应的已发布版本）
    published_version = models.OneToOneField(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='draft_version',
        verbose_name='已发布版本',
        help_text='草稿关联的已发布版本'
    )
    
    class Meta:
        db_table = 'lms_knowledge'
        verbose_name = '知识文档'
        verbose_name_plural = '知识文档'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title
    
    def clean(self):
        """验证知识文档数据"""
        super().clean()
        
        # 应急类知识必须至少填写一个结构化字段
        if self.knowledge_type == 'EMERGENCY':
            structured_fields = [
                self.fault_scenario,
                self.trigger_process,
                self.solution,
                self.verification_plan,
                self.recovery_plan,
            ]
            if not any(field.strip() for field in structured_fields):
                raise ValidationError({
                    'knowledge_type': '应急类知识必须至少填写一个结构化字段'
                })
        
        # 其他类型知识必须有正文内容
        elif self.knowledge_type == 'OTHER':
            if not self.content.strip():
                raise ValidationError({
                    'content': '其他类型知识必须填写正文内容'
                })
    
    def is_referenced_by_task(self):
        """
        检查知识文档是否被任务引用
        
        Requirements: 4.5
        Property 12: 被引用知识删除保护
        
        Returns:
            bool: 如果被任务引用则返回 True
        """
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
    
    def publish(self):
        """
        发布知识文档
        
        如果存在已发布版本，则更新它；否则创建新的已发布版本。
        """
        if self.status == 'PUBLISHED':
            return self
        
        # 如果存在已发布版本，更新它
        if self.published_version:
            published = self.published_version
            # 更新所有字段
            published.title = self.title
            published.knowledge_type = self.knowledge_type
            published.fault_scenario = self.fault_scenario
            published.trigger_process = self.trigger_process
            published.solution = self.solution
            published.verification_plan = self.verification_plan
            published.recovery_plan = self.recovery_plan
            published.content = self.content
            published.status = 'PUBLISHED'
            published.updated_by = self.updated_by
            
            # 更新条线类型关系
            if self.line_type:
                published.set_line_type(self.line_type)
            
            # 更新系统标签和操作标签
            published.system_tags.set(self.system_tags.all())
            published.operation_tags.set(self.operation_tags.all())
            
            published.save()
            return published
        else:
            # 创建新的已发布版本
            published = Knowledge.objects.create(
                title=self.title,
                knowledge_type=self.knowledge_type,
                fault_scenario=self.fault_scenario,
                trigger_process=self.trigger_process,
                solution=self.solution,
                verification_plan=self.verification_plan,
                recovery_plan=self.recovery_plan,
                content=self.content,
                status='PUBLISHED',
                created_by=self.created_by,
                updated_by=self.updated_by,
            )
            
            # 设置条线类型关系
            if self.line_type:
                published.set_line_type(self.line_type)
            
            # 设置系统标签和操作标签
            published.system_tags.set(self.system_tags.all())
            published.operation_tags.set(self.operation_tags.all())
            
            # 关联草稿和已发布版本
            self.published_version = published
            self.save()
            
            return published
