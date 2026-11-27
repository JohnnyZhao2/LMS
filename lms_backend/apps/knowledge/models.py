"""Knowledge models for LMS."""

import re

from django.db import models

from apps.tags.models import Tag
from core.mixins import CreatorMixin, TimestampMixin

from .doc_url import normalize_doc_key


_STEPS_ALLOWED_TAG_RE = re.compile(r'<(/?(?:br|strong|b))\b[^<>]*>', re.IGNORECASE)
_STEPS_PLACEHOLDERS = {
    'br': '\x00BR\x00',
    'strong': '\x00STRONG_OPEN\x00',
    'b': '\x00STRONG_OPEN\x00',
    '/strong': '\x00STRONG_CLOSE\x00',
    '/b': '\x00STRONG_CLOSE\x00',
}


def sanitize_steps_html(html: str) -> str:
    """清洗步骤摘要，仅保留裸 br / strong（剥掉全部属性，防 XSS）。"""
    text = (html or '').replace('\x00', '')
    while True:
        stripped = re.sub(r'<(script|style)\b[^>]*>.*?</\1>', '', text, flags=re.IGNORECASE | re.DOTALL)
        if stripped == text:
            break
        text = stripped
    text = re.sub(r'<!--.*?-->', '', text, flags=re.DOTALL)
    # 先剥除非白名单标签（暂留 div/p/br/strong/b），避免夹杂标签导致 </p> 与 <div> 重复生成 <br>
    text = re.sub(r'</?(?!(?:div|p|br|strong|b)\b)[a-zA-Z!?][^<>]*>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'<(div|p)\b[^<>]*>\s*<br\s*/?>\s*</\1\s*>', r'<\1></\1>', text, flags=re.IGNORECASE)
    text = re.sub(r'</(?:div|p)\s*>(?!\s*(?:<(?:div|p|br)\b|$))', '<br>', text, flags=re.IGNORECASE)
    text = re.sub(r'</(?:div|p)\s*>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'^\s*<(?:div|p)\b[^<>]*>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'<(?:div|p)\b[^<>]*>', '<br>', text, flags=re.IGNORECASE)
    text = _STEPS_ALLOWED_TAG_RE.sub(
        lambda m: _STEPS_PLACEHOLDERS.get(m.group(1).lower(), ''),
        text,
    )
    text = re.sub(r'</?[a-zA-Z!?][^<>]*>', '', text)
    text = text.replace('<', '&lt;').replace('>', '&gt;')
    text = (
        text.replace('\x00BR\x00', '<br>')
        .replace('\x00STRONG_OPEN\x00', '<strong>')
        .replace('\x00STRONG_CLOSE\x00', '</strong>')
    )
    text = re.sub(r'(?:<br>\s*)+$', '', text, flags=re.IGNORECASE)
    return text.strip()


def build_content_preview(content: str, max_chars: int = 800) -> str:
    """列表预览：轻量 HTML；超长硬截断后再洗一次（视觉截断交给前端 line-clamp）。"""
    html = sanitize_steps_html(content)
    if len(html) <= max_chars:
        return html
    return sanitize_steps_html(html[:max_chars])


def build_extra_search_text(extra_fields) -> str:
    if not isinstance(extra_fields, list):
        return ''
    parts = []
    for item in extra_fields:
        if not isinstance(item, dict):
            continue
        label = str(item.get('label') or '').strip()
        value = str(item.get('value') or '').strip()
        if label or value:
            parts.append(f'{label} {value}'.strip())
    return '\n'.join(parts)


class Knowledge(TimestampMixin, CreatorMixin, models.Model):
    """当前可编辑知识文档。"""

    title = models.CharField(max_length=200, verbose_name='标题')
    section = models.CharField(
        max_length=100,
        blank=True,
        default='',
        db_index=True,
        verbose_name='分组/所属系统',
    )
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
    summary = models.TextField(blank=True, default='', verbose_name='适用场景/针对故障')
    content = models.TextField(blank=True, default='', verbose_name='步骤摘要')
    extra_fields = models.JSONField(
        verbose_name='详情扩展字段',
        default=list,
        blank=True,
        help_text='有序键值列表，格式为 [{"label": "针对故障", "value": "..."}]',
    )
    extra_search_text = models.TextField(
        blank=True,
        default='',
        editable=False,
        verbose_name='扩展字段搜索文本',
    )
    external_doc_url = models.URLField(
        max_length=500,
        blank=True,
        default='',
        verbose_name='文档链接',
        help_text='第三方文档查看链接，编辑时追加 mode=edit',
    )
    doc_key = models.CharField(
        max_length=500,
        blank=True,
        default='',
        db_index=True,
        verbose_name='文档归一化标识',
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
    pinned_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name='置顶时间',
    )
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
        indexes = [
            models.Index(fields=['-updated_at', '-id'], name='idx_knowledge_updated_id'),
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        computed_doc_key = normalize_doc_key(self.external_doc_url) or ''
        computed_extra_text = build_extra_search_text(self.extra_fields)
        update_fields = kwargs.get('update_fields')
        if update_fields is not None:
            update_set = set(update_fields)
            if 'external_doc_url' in update_set:
                self.doc_key = computed_doc_key
                update_set.add('doc_key')
            if 'extra_fields' in update_set:
                self.extra_search_text = computed_extra_text
                update_set.add('extra_search_text')
            kwargs['update_fields'] = list(update_set)
        else:
            self.doc_key = computed_doc_key
            self.extra_search_text = computed_extra_text
        return super().save(*args, **kwargs)

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
    section = models.CharField(max_length=100, blank=True, default='', verbose_name='分组/所属系统')
    summary = models.TextField(blank=True, default='', verbose_name='适用场景/针对故障')
    content = models.TextField(blank=True, default='', verbose_name='步骤摘要')
    extra_fields = models.JSONField(verbose_name='详情扩展字段', default=list, blank=True)
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
