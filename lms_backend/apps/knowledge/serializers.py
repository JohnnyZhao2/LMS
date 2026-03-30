"""
Serializers for knowledge management.
"""
from django.utils.html import strip_tags
from rest_framework import serializers

from apps.tags.serializers import TagSimpleSerializer

from .models import Knowledge


class RelatedLinkSerializer(serializers.Serializer):
    """相关链接序列化器。"""
    title = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=200,
        trim_whitespace=True,
    )
    url = serializers.URLField(max_length=500)


def _normalize_related_links(related_links):
    """标准化相关链接列表，去重并清理标题。"""
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
        normalized_links.append({
            'title': title,
            'url': url,
        })

    return normalized_links
class KnowledgeListSerializer(serializers.ModelSerializer):
    """
    Serializer for knowledge list view.
    Returns full content for mymind-style card rendering.
    """
    space_tag = TagSimpleSerializer(read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True, allow_null=True)
    content_preview = serializers.CharField(read_only=True)
    table_of_contents = serializers.ListField(read_only=True)
    related_links = RelatedLinkSerializer(many=True, read_only=True)
    class Meta:
        model = Knowledge
        fields = [
            'id', 'resource_uuid', 'version_number',
            'title',
            'is_current',
            'space_tag',
            'content', 'related_links',
            'view_count', 'content_preview', 'table_of_contents',
            'created_by', 'created_by_name', 'updated_by', 'updated_by_name', 'created_at', 'updated_at'
        ]


class KnowledgeDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for knowledge detail view.
    Returns full knowledge document details.
    """
    space_tag = TagSimpleSerializer(read_only=True)
    tags = TagSimpleSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True, allow_null=True)
    table_of_contents = serializers.ListField(read_only=True)
    related_links = RelatedLinkSerializer(many=True, read_only=True)
    class Meta:
        model = Knowledge
        fields = [
            'id', 'resource_uuid', 'version_number',
            'title',
            'is_current',
            'space_tag', 'tags',
            'content', 'related_links',
            # 元数据
            'view_count', 'table_of_contents',
            'created_by', 'created_by_name', 'created_at',
            'updated_by', 'updated_by_name', 'updated_at'
        ]


class KnowledgeCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating knowledge documents.
    """
    title = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        default='',
    )
    # 前端传入标签ID
    space_tag_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        default=list
    )
    related_links = RelatedLinkSerializer(many=True, required=False, default=list)

    class Meta:
        model = Knowledge
        fields = [
            'title',
            'space_tag_id',
            'tag_ids',
            'related_links',
            'content',
        ]
    def validate(self, attrs):
        """
        Validate knowledge document.
        """
        if attrs.get('title') is None:
            attrs['title'] = ''
        content = attrs.get('content', '')
        if not content or not strip_tags(str(content)).strip():
            raise serializers.ValidationError({
                'content': '必须填写正文内容'
            })
        if 'related_links' in attrs:
            attrs['related_links'] = _normalize_related_links(attrs['related_links'])
        return attrs


class KnowledgeUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating knowledge documents.
    """
    title = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    space_tag_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    related_links = RelatedLinkSerializer(many=True, required=False)

    class Meta:
        model = Knowledge
        fields = [
            'title',
            'space_tag_id',
            'tag_ids',
            'related_links',
            'content',
        ]
    def validate(self, attrs):
        """
        Validate knowledge document.
        """
        if 'title' in attrs and attrs['title'] is None:
            attrs['title'] = ''
        instance = self.instance
        content = attrs.get('content', instance.content if instance else '')
        if not content or not strip_tags(str(content)).strip():
            raise serializers.ValidationError({
                'content': '必须填写正文内容'
            })
        if 'related_links' in attrs:
            attrs['related_links'] = _normalize_related_links(attrs['related_links'])
        return attrs


class KnowledgeStatsSerializer(serializers.Serializer):
    """
    知识统计序列化器
    返回知识文档的统计数据。
    """
    total = serializers.IntegerField(help_text='总文档数')
    published = serializers.IntegerField(help_text='已发布数')
    monthly_new = serializers.IntegerField(help_text='本月新增文档数')
    with_content = serializers.IntegerField(help_text='包含正文的文档数')
