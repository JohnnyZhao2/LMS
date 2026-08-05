"""Serializers for knowledge management."""

from rest_framework import serializers

from apps.tags.serializers import TagSimpleSerializer

from .models import Knowledge, sanitize_steps_html


def _get_metadata_source(obj):
    if hasattr(obj, 'source_knowledge'):
        return obj.source_knowledge
    return obj


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


def _normalize_knowledge_payload(attrs, *, normalize_missing_title: bool = False):
    if 'title' in attrs and attrs['title'] is None:
        attrs['title'] = ''
    elif normalize_missing_title and attrs.get('title') is None:
        attrs['title'] = ''
    if 'content' in attrs and attrs['content'] is not None:
        attrs['content'] = sanitize_steps_html(str(attrs['content']))
    if 'external_doc_url' in attrs and attrs['external_doc_url'] is not None:
        attrs['external_doc_url'] = str(attrs['external_doc_url']).strip()
    if 'related_links' in attrs:
        attrs['related_links'] = _normalize_related_links(attrs['related_links'])
    return attrs


class KnowledgeListSerializer(serializers.Serializer):
    """列表/仪表盘：只下发 content_preview，不下发完整 content。"""

    id = serializers.IntegerField(read_only=True)
    title = serializers.CharField(read_only=True)
    space_tag = serializers.SerializerMethodField()
    external_doc_url = serializers.CharField(read_only=True)
    related_links = RelatedLinkSerializer(many=True, read_only=True)
    view_count = serializers.SerializerMethodField()
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

    def get_created_by_name(self, obj):
        source = _get_metadata_source(obj)
        if source is None:
            return None
        created_by = getattr(source, 'created_by', None)
        return created_by.username if created_by else None

    def get_updated_by_name(self, obj):
        source = _get_metadata_source(obj)
        if source is None:
            return None
        updated_by = getattr(source, 'updated_by', None)
        return updated_by.username if updated_by else None

    def get_view_count(self, obj):
        source = _get_metadata_source(obj)
        if source is None:
            return None
        return source.view_count


class KnowledgeDetailSerializer(KnowledgeListSerializer):
    content = serializers.CharField(read_only=True)
    tags = serializers.SerializerMethodField()

    def get_tags(self, obj):
        if hasattr(obj, 'tags'):
            return TagSimpleSerializer(obj.tags.all(), many=True).data
        return getattr(obj, 'tags_json', [])


class KnowledgeWriteSerializer(serializers.ModelSerializer):
    title = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')
    space_tag_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        default=list,
    )
    related_links = RelatedLinkSerializer(many=True, required=False, default=list)
    content = serializers.CharField(required=False, allow_blank=True, default='')
    external_doc_url = serializers.URLField(required=False, allow_blank=True, max_length=500, default='')

    class Meta:
        model = Knowledge
        fields = ['title', 'space_tag_id', 'tag_ids', 'related_links', 'content', 'external_doc_url']

    def validate(self, attrs):
        return _normalize_knowledge_payload(attrs, normalize_missing_title=True)


class KnowledgeUpdateSerializer(serializers.ModelSerializer):
    title = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    space_tag_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
    )
    related_links = RelatedLinkSerializer(many=True, required=False)
    content = serializers.CharField(required=False, allow_blank=True)
    external_doc_url = serializers.URLField(required=False, allow_blank=True, max_length=500)

    class Meta:
        model = Knowledge
        fields = ['title', 'space_tag_id', 'tag_ids', 'related_links', 'content', 'external_doc_url']

    def validate(self, attrs):
        return _normalize_knowledge_payload(attrs)


class KnowledgeImportItemSerializer(KnowledgeCreateSerializer):
    row_number = serializers.IntegerField(min_value=1)

    class Meta(KnowledgeCreateSerializer.Meta):
        fields = [*KnowledgeCreateSerializer.Meta.fields, 'row_number']


class KnowledgeBulkImportSerializer(serializers.Serializer):
    items = KnowledgeImportItemSerializer(many=True, allow_empty=False)


class KnowledgeBulkDeleteItemSerializer(serializers.Serializer):
    row_number = serializers.IntegerField(min_value=1)
    external_doc_url = serializers.URLField(max_length=500)
    title = serializers.CharField(required=False, allow_blank=True, default='')


class KnowledgeBulkDeleteSerializer(serializers.Serializer):
    items = KnowledgeBulkDeleteItemSerializer(many=True, allow_empty=False)
