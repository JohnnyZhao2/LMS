"""Knowledge models for LMS."""

from django.db import models

from apps.tags.models import Tag
from core.mixins import CreatorMixin, TimestampMixin

from .html_sanitize import build_content_preview


class Knowledge(TimestampMixin, CreatorMixin, models.Model):
    """当前可编辑知识文档。"""

    title = models.CharField(max_length=200, verbose_name='标题')
    space_tag = models.ForeignKey(
        Tag,
        on_delete=models.PROTECT,
        related_name='knowledge_by_space',
        null=True,
        blank=True,
        verbose_name='space',
        limit_choices_to={'tag_type': 'SPACE'},
    )
    tags = models.ManyToManyField(
        Tag,
        related_name='knowledge_items',
        blank=True,
        verbose_name='知识标签',
        limit_choices_to={'tag_type': 'TAG'},
    )
    content = models.TextField(blank=True, default='', verbose_name='步骤摘要')
    external_doc_url = models.URLField(
        max_length=500,
        blank=True,
        default='',
        verbose_name='文档链接',
        help_text='第三方文档查看链接，编辑时追加 mode=edit',
    )
    updated_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='knowledge_updated',
        verbose_name='最后更新者',
    )
    view_count = models.PositiveIntegerField(default=0, verbose_name='阅读次数')
    related_links = models.JSONField(
        verbose_name='相关链接',
        default=list,
        blank=True,
        help_text='相关资料链接列表，格式为 [{"title": "链接名称", "url": "https://example.com"}]',
    )

    class Meta:
        db_table = 'lms_knowledge'
        verbose_name = '知识文档'
        verbose_name_plural = '知识文档'
        ordering = ['-updated_at', '-id']

    def __str__(self):
        return self.title

    def increment_view_count(self):
        from django.db.models import F

        Knowledge.objects.filter(pk=self.pk).update(view_count=F('view_count') + 1)
        self.refresh_from_db()
        return self.view_count

    @property
    def content_preview(self):
        return build_content_preview(self.content)


class KnowledgeRevision(TimestampMixin, CreatorMixin, models.Model):
    """任务执行链路使用的知识快照。"""

    source_knowledge = models.ForeignKey(
        Knowledge,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='revisions',
        verbose_name='来源知识',
    )
    revision_number = models.PositiveIntegerField(default=1, verbose_name='快照版本号')
    title = models.CharField(max_length=200, verbose_name='标题')
    content = models.TextField(blank=True, default='', verbose_name='步骤摘要')
    external_doc_url = models.URLField(
        max_length=500,
        blank=True,
        default='',
        verbose_name='文档链接',
    )
    related_links = models.JSONField(verbose_name='相关链接', default=list, blank=True)
    space_tag_name = models.CharField(max_length=100, blank=True, default='', verbose_name='space 名称')
    tags_json = models.JSONField(verbose_name='标签快照', default=list, blank=True)
    content_hash = models.CharField(max_length=64, db_index=True, verbose_name='内容哈希')

    class Meta:
        db_table = 'lms_knowledge_revision'
        verbose_name = '知识快照'
        verbose_name_plural = '知识快照'
        ordering = ['-created_at', '-revision_number']
        constraints = [
            models.UniqueConstraint(
                fields=['source_knowledge', 'revision_number'],
                name='uniq_knowledge_revision_number',
            ),
        ]

    def __str__(self):
        return f'{self.title} v{self.revision_number}'

    @property
    def content_preview(self):
        return build_content_preview(self.content)
