"""
Serializers for question management.
"""
from rest_framework import serializers

from apps.tags.models import Tag
from apps.tags.serializers import TagSimpleSerializer

from .models import Question


def validate_space_tag_id(value):
    """校验 space ID 是否有效（共享验证函数）"""
    if value is None:
        return value
    try:
        Tag.objects.get(id=value, tag_type='SPACE')
        return value
    except Tag.DoesNotExist:
        raise serializers.ValidationError('无效的 space ID')


def validate_question_tag_ids(value):
    if value is None:
        return value
    valid_tag_ids = set(
        Tag.objects.filter(
            id__in=value,
            tag_type='TAG',
            allow_question=True,
        ).values_list('id', flat=True)
    )
    invalid_tag_ids = [tag_id for tag_id in value if tag_id not in valid_tag_ids]
    if invalid_tag_ids:
        raise serializers.ValidationError('包含无效的题目标签ID')
    return value


class QuestionListSerializer(serializers.ModelSerializer):
    """
    Serializer for question list view.
    """
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True, allow_null=True)
    question_type_display = serializers.CharField(source='get_question_type_display', read_only=True)
    space_tag = TagSimpleSerializer(read_only=True)
    tags = TagSimpleSerializer(many=True, read_only=True)
    class Meta:
        model = Question
        fields = [
            'id', 'resource_uuid', 'version_number',
            'content', 'question_type', 'question_type_display',
            'options', 'answer', 'explanation',
            'space_tag', 'tags',
            'is_current',
            'created_by_name', 'updated_by_name',
            'created_at', 'updated_at'

        ]
class QuestionDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for question detail view.
    """
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True, allow_null=True)
    question_type_display = serializers.CharField(source='get_question_type_display', read_only=True)
    space_tag = TagSimpleSerializer(read_only=True)
    tags = TagSimpleSerializer(many=True, read_only=True)
    class Meta:
        model = Question
        fields = [
            'id', 'resource_uuid', 'version_number',
            'content', 'question_type', 'question_type_display',
            'options', 'answer', 'explanation',
            'space_tag', 'tags',
            'is_current',
            'created_by_name', 'updated_by_name',
            'created_at', 'updated_at'
        ]


class QuestionCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating questions.
    业务验证（选项/答案格式）由 Service._validate_question_data 统一处理。
    """
    space_tag_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    tag_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False, default=list)
    source_question_id = serializers.IntegerField(write_only=True, required=False)
    sync_to_bank = serializers.BooleanField(write_only=True, required=False, default=True)
    class Meta:
        model = Question
        fields = [
            'content', 'question_type', 'options', 'answer',
            'explanation', 'space_tag_id', 'tag_ids',
            'source_question_id', 'sync_to_bank',
        ]

    def validate_space_tag_id(self, value):
        return validate_space_tag_id(value)

    def validate_tag_ids(self, value):
        return validate_question_tag_ids(value)

    def validate_source_question_id(self, value):
        if not Question.objects.filter(id=value, is_deleted=False).exists():
            raise serializers.ValidationError('来源题目不存在')
        return value


class QuestionUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating questions.
    业务验证（选项/答案格式）由 Service._validate_question_data 统一处理。
    """
    space_tag_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    tag_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    sync_to_bank = serializers.BooleanField(write_only=True, required=False, default=True)
    class Meta:
        model = Question
        fields = [
            'content', 'options', 'answer', 'explanation',
            'space_tag_id', 'tag_ids', 'sync_to_bank'
        ]

    def validate_space_tag_id(self, value):
        return validate_space_tag_id(value)

    def validate_tag_ids(self, value):
        return validate_question_tag_ids(value)
