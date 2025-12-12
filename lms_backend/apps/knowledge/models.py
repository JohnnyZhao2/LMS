"""
Knowledge and Category models for Emergency Operation Manual System.
"""
from django.db import models
from django.core.exceptions import ValidationError
from apps.users.models import User, Department


class KnowledgeCategoryManager(models.Manager):
    """知识分类管理器"""
    
    def get_by_level(self, level):
        """根据层级获取分类"""
        return self.filter(level=level)
    
    def get_children(self, parent):
        """获取指定父分类的所有子分类"""
        return self.filter(parent=parent)
    
    def get_root_categories(self):
        """获取所有一级分类（条线）"""
        return self.filter(level=1, parent__isnull=True)


class KnowledgeCategory(models.Model):
    """知识分类模型 - 两级分类：条线和系统"""
    
    LEVEL_CHOICES = [
        (1, '条线'),
        (2, '系统'),
    ]
    
    name = models.CharField(max_length=50, verbose_name='分类名称')
    code = models.CharField(max_length=20, unique=True, verbose_name='分类代码')
    level = models.IntegerField(choices=LEVEL_CHOICES, verbose_name='层级')
    parent = models.ForeignKey(
        'self',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='children',
        verbose_name='父分类'
    )
    description = models.TextField(null=True, blank=True, verbose_name='描述')
    sort_order = models.IntegerField(default=0, verbose_name='排序')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    objects = KnowledgeCategoryManager()
    
    class Meta:
        db_table = 'knowledge_categories'
        verbose_name = '知识分类'
        verbose_name_plural = '知识分类'
        ordering = ['level', 'sort_order', 'name']
    
    def __str__(self):
        return f"{self.get_level_display()} - {self.name}"
    
    def clean(self):
        """验证分类层级和父子关系"""
        # 验证一级分类（条线）不能有父分类
        if self.level == 1 and self.parent is not None:
            raise ValidationError('条线不能有父分类')
        
        # 验证二级分类（系统）必须有父分类
        if self.level == 2 and self.parent is None:
            raise ValidationError('系统必须有父分类（所属条线）')
        
        # 验证父分类的层级必须是1
        if self.parent is not None:
            if self.parent.level != 1:
                raise ValidationError('系统的父分类必须是条线')
    
    def save(self, *args, **kwargs):
        """保存前验证"""
        self.clean()
        super().save(*args, **kwargs)
    
    def get_all_children(self):
        """获取所有子分类"""
        return list(self.children.all())
    
    def can_delete(self):
        """检查是否可以删除（没有关联的知识文档）"""
        # 检查是否有关联的知识文档（条线或系统）
        has_line_relation = self.knowledge_line.exists()
        has_system_relation = self.knowledge_system.exists()
        return not (has_line_relation or has_system_relation)


class OperationType(models.Model):
    """操作类型标签"""
    
    name = models.CharField(max_length=20, unique=True, verbose_name='操作类型')
    code = models.CharField(max_length=20, unique=True, verbose_name='类型代码')
    description = models.TextField(null=True, blank=True, verbose_name='描述')
    sort_order = models.IntegerField(default=0, verbose_name='排序')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    
    class Meta:
        db_table = 'operation_types'
        verbose_name = '操作类型'
        verbose_name_plural = '操作类型'
        ordering = ['sort_order', 'name']
    
    def __str__(self):
        return self.name


class KnowledgeManager(models.Manager):
    """知识文档管理器"""
    
    def published(self):
        """获取已发布的文档"""
        return self.filter(status='PUBLISHED', is_deleted=False)
    
    def search(self, keyword):
        """根据关键词搜索"""
        return self.filter(
            models.Q(title__icontains=keyword) | 
            models.Q(content_scenario__icontains=keyword) |
            models.Q(content_solution__icontains=keyword),
            is_deleted=False
        )


class Knowledge(models.Model):
    """应急操作手册文档模型"""
    
    STATUS_CHOICES = [
        ('DRAFT', '草稿'),
        ('PUBLISHED', '已发布'),
        ('ARCHIVED', '已归档'),
    ]
    
    # 基本信息
    title = models.CharField(max_length=200, verbose_name='标题')
    summary = models.TextField(null=True, blank=True, verbose_name='摘要')
    cover_image = models.CharField(max_length=500, null=True, blank=True, verbose_name='封面图片URL')
    attachment_url = models.CharField(max_length=500, null=True, blank=True, verbose_name='附带链接')
    
    # 结构化内容（JSON格式）
    content_scenario = models.TextField(verbose_name='故障场景')
    content_trigger = models.TextField(verbose_name='触发流程')
    content_solution = models.TextField(verbose_name='解决方案')
    content_verification = models.TextField(verbose_name='验证方案')
    content_recovery = models.TextField(verbose_name='恢复方案')
    
    # 分类信息
    line = models.ForeignKey(
        KnowledgeCategory,
        on_delete=models.PROTECT,
        related_name='knowledge_line',
        limit_choices_to={'level': 1},
        verbose_name='所属条线'
    )
    system = models.ForeignKey(
        KnowledgeCategory,
        on_delete=models.PROTECT,
        related_name='knowledge_system',
        limit_choices_to={'level': 2},
        verbose_name='所属系统'
    )
    
    # 操作类型（多对多）
    operation_types = models.ManyToManyField(
        OperationType,
        related_name='knowledge_docs',
        verbose_name='操作类型'
    )
    
    # 人员信息
    deliverer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='delivered_knowledge',
        verbose_name='场景交付人'
    )
    creator = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_knowledge',
        verbose_name='创建人'
    )
    creator_team = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_knowledge',
        verbose_name='创建人所属团队'
    )
    modifier = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='modified_knowledge',
        verbose_name='修改人'
    )
    executors = models.ManyToManyField(
        User,
        related_name='executable_knowledge',
        blank=True,
        verbose_name='可执行人'
    )
    
    # 其他信息
    emergency_platform = models.CharField(max_length=100, null=True, blank=True, verbose_name='应急平台')
    
    # 状态和统计
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT', verbose_name='状态')
    view_count = models.IntegerField(default=0, verbose_name='阅读次数')
    
    # 软删除
    is_deleted = models.BooleanField(default=False, verbose_name='是否删除')
    deleted_at = models.DateTimeField(null=True, blank=True, verbose_name='删除时间')
    
    # 时间戳
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='最后更新时间')
    
    objects = KnowledgeManager()
    
    class Meta:
        db_table = 'knowledge'
        verbose_name = '应急操作手册'
        verbose_name_plural = '应急操作手册'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['line', 'system']),
            models.Index(fields=['status', 'is_deleted']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        return self.title
    
    def soft_delete(self, user=None):
        """软删除"""
        from django.utils import timezone
        self.is_deleted = True
        self.deleted_at = timezone.now()
        if user:
            self.modifier = user
        self.save()
    
    def publish(self, user=None):
        """发布文档"""
        self.status = 'PUBLISHED'
        if user:
            self.modifier = user
        self.save()
    
    def archive(self, user=None):
        """归档文档"""
        self.status = 'ARCHIVED'
        if user:
            self.modifier = user
        self.save()
    
    def get_content_dict(self):
        """获取结构化内容字典"""
        return {
            'scenario': self.content_scenario,
            'trigger': self.content_trigger,
            'solution': self.content_solution,
            'verification': self.content_verification,
            'recovery': self.content_recovery,
        }
