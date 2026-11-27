"""Serializers for knowledge management."""

from rest_framework import serializers

from apps.tags.serializers import TagSimpleSerializer

from .doc_url import normalize_doc_key
from .models import Knowledge, sanitize_steps_html


class RelatedLinkSerializer(serializers.Serializer):
    title = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=200,
        trim_whitespace=True,
    )
    url = serializers.URLField(max_length=500)


def _normalize_related_links(related_links):
    if related_links is None:
        return None

    normalized_links = []
    seen_urls = set()
    for item in related_links:
        title = (item.get('title') or '').strip()
        url = item['url'].strip()
        if url in seen_urls:
            continue
        seen_urls.add(url)
        normalized_links.append({'title': title, 'url': url})
    return normalized_links


class ExtraFieldSerializer(serializers.Serializer):
    label = serializers.CharField(
        required=True,
        allow_blank=True,
        max_length=100,
        trim_whitespace=True,
    )
    value = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=2000,
        trim_whitespace=True,
    )


def _normalize_extra_fields(extra_fields):
    if extra_fields is None:
        return None
    normalized = []
    for item in extra_fields:
        label = str(item.get('label') or '').strip()
        value = str(item.get('value') or '').strip()
        if not label or not value:
            continue
        normalized.append({'label': label, 'value': value})
    return normalized


def _normalize_knowledge_payload(attrs, *, normalize_missing_title: bool = False):
    if 'title' in attrs and attrs['title'] is None:
        attrs['title'] = ''
    elif normalize_missing_title and attrs.get('title') is None:
        attrs['title'] = ''
    if 'section' in attrs:
        attrs['section'] = str(attrs['section'] or '').strip()
    if 'summary' in attrs:
        attrs['summary'] = str(attrs['summary'] or '').strip()
    if 'content' in attrs and attrs['content'] is not None:
        attrs['content'] = sanitize_steps_html(str(attrs['content']))
    if 'external_doc_url' in attrs and attrs['external_doc_url'] is not None:
        attrs['external_doc_url'] = str(attrs['external_doc_url']).strip()
    if 'related_links' in attrs:
        attrs['related_links'] = _normalize_related_links(attrs['related_links'])
    if 'extra_fields' in attrs:
        attrs['extra_fields'] = _normalize_extra_fields(attrs['extra_fields'])
    return attrs


class KnowledgeListSerializer(serializers.Serializer):
    """列表/仪表盘：只下发 content_preview，不下发完整 content。"""

    id = serializers.IntegerField(read_only=True)
    title = serializers.CharField(read_only=True)
    section = serializers.CharField(read_only=True, default='')
    summary = serializers.CharField(read_only=True, default='')
    space_tag = serializers.SerializerMethodField()
    tags = serializers.SerializerMethodField()
    external_doc_url = serializers.CharField(read_only=True)
    doc_key = serializers.SerializerMethodField()
    related_links = RelatedLinkSerializer(many=True, read_only=True)
    view_count = serializers.IntegerField(read_only=True, required=False)
    is_pinned = serializers.SerializerMethodField()
    pinned_at = serializers.DateTimeField(read_only=True, required=False, allow_null=True)
    content_preview = serializers.CharField(read_only=True)
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def get_space_tag(self, obj):
        if hasattr(obj, 'space_tag'):
            return TagSimpleSerializer(obj.space_tag).data if obj.space_tag else None
        space_tag_name = getattr(obj, 'space_tag_name', '')
        if not space_tag_name:
            return None
        return {'id': None, 'name': space_tag_name, 'tag_type': 'SPACE'}

    def get_tags(self, obj):
        if hasattr(obj, 'tags'):
            return TagSimpleSerializer(obj.tags.all(), many=True).data
        return getattr(obj, 'tags_json', [])

    def get_doc_key(self, obj):
        stored = getattr(obj, 'doc_key', None)
        if stored is not None:
            return stored
        return normalize_doc_key(getattr(obj, 'external_doc_url', '') or '') or ''

    def get_is_pinned(self, obj):
        return bool(getattr(obj, 'pinned_at', None))

    def get_created_by_name(self, obj):
        created_by = getattr(obj, 'created_by', None)
        return created_by.username if created_by else None

    def get_updated_by_name(self, obj):
        updated_by = getattr(obj, 'updated_by', None)
        return updated_by.username if updated_by else None


class KnowledgeDetailSerializer(KnowledgeListSerializer):
    content = serializers.CharField(read_only=True)
    extra_fields = ExtraFieldSerializer(many=True, read_only=True)
    doc_siblings = serializers.SerializerMethodField()

    def get_doc_siblings(self, obj):
        if not isinstance(obj, Knowledge) or not obj.doc_key:
            return []
        siblings = [
            {'id': kid, 'title': title or '未命名知识', 'section': section or ''}
            for kid, title, section in Knowledge.objects.filter(doc_key=obj.doc_key)
            .order_by('id')
            .values_list('id', 'title', 'section')
        ]
        return siblings if len(siblings) > 1 else []


class KnowledgeUpdateSerializer(serializers.ModelSerializer):
    title = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    section = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=100)
    summary = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    space_tag_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
    )
    related_links = RelatedLinkSerializer(many=True, required=False)
    extra_fields = ExtraFieldSerializer(many=True, required=False)
    content = serializers.CharField(required=False, allow_blank=True)
    external_doc_url = serializers.URLField(required=False, allow_blank=True, max_length=500)
    is_pinned = serializers.BooleanField(write_only=True, required=False)

    class Meta:
        model = Knowledge
        fields = [
            'title', 'section', 'summary', 'space_tag_id', 'tag_ids',
            'related_links', 'extra_fields', 'content', 'external_doc_url', 'is_pinned',
        ]

    def validate(self, attrs):
        return _normalize_knowledge_payload(attrs)


class KnowledgeCreateSerializer(KnowledgeUpdateSerializer):
    def validate(self, attrs):
        attrs.pop('is_pinned', None)
        attrs.setdefault('title', '')
        attrs.setdefault('section', '')
        attrs.setdefault('summary', '')
        attrs.setdefault('tag_ids', [])
        attrs.setdefault('related_links', [])
        attrs.setdefault('extra_fields', [])
        attrs.setdefault('content', '')
        attrs.setdefault('external_doc_url', '')
        return _normalize_knowledge_payload(attrs, normalize_missing_title=True)


class ImportTagItemSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100, trim_whitespace=True)
    category = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=50,
        default='',
        trim_whitespace=True,
    )


class KnowledgeImportItemSerializer(serializers.Serializer):
    row_number = serializers.IntegerField(min_value=1)
    id = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    title = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')
    section = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=100,
        default='',
        trim_whitespace=True,
    )
    summary = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        default='',
    )
    space_name = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=100,
        default='',
        trim_whitespace=True,
    )
    tag_names = serializers.ListField(
        child=serializers.CharField(max_length=100, trim_whitespace=True),
        required=False,
        default=list,
    )
    tag_items = ImportTagItemSerializer(many=True, required=False, default=list)
    related_links = RelatedLinkSerializer(many=True, required=False, default=list)
    extra_fields = ExtraFieldSerializer(many=True, required=False, default=list)
    content = serializers.CharField(required=False, allow_blank=True, default='')
    external_doc_url = serializers.URLField(required=False, allow_blank=True, max_length=500, default='')

    def validate(self, attrs):
        _normalize_knowledge_payload(attrs, normalize_missing_title=True)
        attrs['space_name'] = str(attrs.get('space_name') or '').strip()
        attrs['tag_names'] = list(dict.fromkeys(
            name.strip() for name in (attrs.get('tag_names') or []) if name and name.strip()
        ))
        normalized_tag_items = []
        seen_names = set()
        for item in (attrs.get('tag_items') or []):
            name = str(item.get('name') or '').strip()
            category = str(item.get('category') or '').strip()
            if not name or name in seen_names:
                continue
            seen_names.add(name)
            normalized_tag_items.append({'name': name, 'category': category})
        attrs['tag_items'] = normalized_tag_items
        return attrs


class KnowledgeBulkImportSerializer(serializers.Serializer):
    items = KnowledgeImportItemSerializer(many=True, allow_empty=False)


class KnowledgeBulkDeleteItemSerializer(serializers.Serializer):
    row_number = serializers.IntegerField(min_value=1)
    id = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    external_doc_url = serializers.URLField(required=False, allow_blank=True, max_length=500, default='')
    title = serializers.CharField(required=False, allow_blank=True, default='')
    section = serializers.CharField(required=False, allow_blank=True, max_length=100, default='')

    def validate(self, attrs):
        if not attrs.get('id') and not (attrs.get('external_doc_url') or '').strip():
            raise serializers.ValidationError('请提供知识 ID 或文档链接')
        return attrs


class KnowledgeBulkDeleteSerializer(serializers.Serializer):
    ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=False,
    )
    items = KnowledgeBulkDeleteItemSerializer(
        many=True,
        required=False,
        allow_empty=False,
    )

    def validate(self, attrs):
        if not attrs.get('ids') and not attrs.get('items'):
            raise serializers.ValidationError('请提供 ids 或 items')
        return attrs


class KnowledgeBulkUpdateSerializer(serializers.Serializer):
    ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
    )
    update_space = serializers.BooleanField(required=False, default=False)
    space_tag_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    add_tag_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        default=list,
    )
