"""
Knowledge models for LMS.
Implements:
- Knowledge: 统一知识文档
"""
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils.html import strip_tags

from apps.tags.models import Tag
from core.mixins import CreatorMixin, SoftDeleteMixin, TimestampMixin, VersionedResourceMixin


class Knowledge(TimestampMixin, SoftDeleteMixin, CreatorMixin, VersionedResourceMixin, models.Model):
    """
    统一知识文档模型
    所有知识都使用富文本正文 content，不再区分知识类型或结构化子字段。
    标签关系:
    - space_tag: space（单选）
    - tags: 知识标签（多对多，多选）
    """
    title = models.CharField(max_length=200, verbose_name='标题')
    space_tag = models.ForeignKey(
        Tag,
        on_delete=models.PROTECT,
        related_name='knowledge_by_space',
        null=True,
        blank=True,
        verbose_name='space',
        limit_choices_to={'tag_type': 'SPACE', 'is_active': True}
    )
    tags = models.ManyToManyField(
        Tag,
        related_name='knowledge_items',
        blank=True,
        verbose_name='知识标签',
        limit_choices_to={'tag_type': 'TAG', 'is_active': True}
    )
    # 统一正文内容
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
    # 相关链接列表
    related_links = models.JSONField(
        verbose_name='相关链接',
        default=list,
        blank=True,
        help_text='相关资料链接列表，格式为 [{"title": "文档标题", "url": "https://example.com"}]'
    )
    class Meta:
        db_table = 'lms_knowledge'
        verbose_name = '知识文档'
        verbose_name_plural = '知识文档'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['resource_uuid', 'version_number'],
                name='uniq_knowledge_resource_version'
            ),
            models.UniqueConstraint(
                fields=['resource_uuid'],
                condition=Q(is_current=True),
                name='uniq_knowledge_current'
            )
        ]
    def __str__(self):
        return self.title
    def clean(self):
        """验证知识文档数据"""
        super().clean()
        if not strip_tags(self.content).strip():
            raise ValidationError({
                'content': '知识文档必须填写正文内容'
            })
    def increment_view_count(self):
        """
        增加知识文档的阅读次数
        使用原子操作确保并发安全，每次调用增加1次计数。
        用于记录学员点击查看知识文档的次数。
        Returns:
            int: 更新后的阅读次数
        """
        from django.db.models import F

        # 使用原子操作更新计数
        Knowledge.objects.filter(pk=self.pk).update(view_count=F('view_count') + 1)
        # 刷新对象以获取最新值
        self.refresh_from_db()
        return self.view_count
    @property
    def content_preview(self):
        """
        生成内容预览（用于列表显示）
        从 content 字段中提取并清洗 HTML 标签，供卡片和列表展示。
        """
        preview_text = self.content.strip()

        # 清洗 HTML 标签
        if preview_text:
            preview_text = strip_tags(preview_text)
            # 去除多余的空白字符和换行
            preview_text = ' '.join(preview_text.split())
            # 限制长度
            if len(preview_text) > 150:
                return preview_text[:150] + '...'
            return preview_text
        return ''
    @property
    def table_of_contents(self):
        """
        从 HTML 内容中提取目录结构（用于卡片预览显示）
        返回格式: [{"level": 1, "text": "标题1"}, {"level": 2, "text": "标题2"}, ...]
        从 HTML 内容中解析 h1/h2/h3 标签。
        """
        import re
        if not self.content:
            return []
        toc = []
        # 匹配 HTML 标题标签 <h1>~<h3>
        pattern = r'<h([1-3])[^>]*>(.*?)</h\1>'
        matches = re.findall(pattern, self.content, re.IGNORECASE | re.DOTALL)
        for level_str, text in matches:
            level = int(level_str)
            # 清除 HTML 标签，只保留纯文本
            clean_text = strip_tags(text).strip()
            if clean_text and len(toc) < 10:
                toc.append({'level': level, 'text': clean_text})
        return toc
