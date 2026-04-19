"""Serializers for knowledge management."""

from rest_framework import serializers

from apps.tags.serializers import TagSimpleSerializer

from .models import Knowledge


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
    if 'related_links' in attrs:
        attrs['related_links'] = _normalize_related_links(attrs['related_links'])
    return attrs


class KnowledgeListSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    title = serializers.CharField(read_only=True)
    space_tag = serializers.SerializerMethodField()
    content = serializers.CharField(read_only=True)
    related_links = RelatedLinkSerializer(many=True, read_only=True)
    view_count = serializers.IntegerField(read_only=True, required=False)
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
        created_by = getattr(obj, 'created_by', None)
        return created_by.username if created_by else None

    def get_updated_by_name(self, obj):
        updated_by = getattr(obj, 'updated_by', None)
        return updated_by.username if updated_by else None


class KnowledgeDetailSerializer(KnowledgeListSerializer):
    tags = serializers.SerializerMethodField()

    class Meta:
        fields = [
            'id',
            'title',
            'space_tag',
            'tags',
            'content',
            'related_links',
            'view_count',
            'content_preview',
            'created_by_name',
            'created_at',
            'updated_by_name',
            'updated_at',
        ]

    def get_tags(self, obj):
        if hasattr(obj, 'tags'):
            return TagSimpleSerializer(obj.tags.all(), many=True).data
        return getattr(obj, 'tags_json', [])


class KnowledgeCreateSerializer(serializers.ModelSerializer):
    title = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')
    space_tag_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        default=list,
    )
    related_links = RelatedLinkSerializer(many=True, required=False, default=list)

    class Meta:
        model = Knowledge
        fields = ['title', 'space_tag_id', 'tag_ids', 'related_links', 'content']

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

    class Meta:
        model = Knowledge
        fields = ['title', 'space_tag_id', 'tag_ids', 'related_links', 'content']

    def validate(self, attrs):
        return _normalize_knowledge_payload(attrs)
