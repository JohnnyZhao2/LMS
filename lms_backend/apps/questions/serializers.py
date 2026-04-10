"""
Serializers for question management.
"""
from rest_framework import serializers

from apps.tags.serializers import TagSimpleSerializer

from .models import Question


class QuestionSerializer(serializers.ModelSerializer):
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
    业务验证（选项/答案格式）由 QuestionService.validate_question_payload 统一处理。
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


class QuestionUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating questions.
    业务验证（选项/答案格式）由 QuestionService.validate_question_payload 统一处理。
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
