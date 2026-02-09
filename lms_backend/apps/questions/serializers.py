"""
Serializers for question management.
"""
from rest_framework import serializers

from apps.knowledge.serializers import TagSimpleSerializer

from .models import Question


def validate_line_type_id(value):
    """校验条线类型ID是否有效（共享验证函数）"""
    if value is None:
        return value
    from apps.knowledge.models import Tag
    try:
        Tag.objects.get(id=value, tag_type='LINE', is_active=True)
        return value
    except Tag.DoesNotExist:
        raise serializers.ValidationError('无效的条线类型ID')


class QuestionListSerializer(serializers.ModelSerializer):
    """
    Serializer for question list view.
    """
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True, allow_null=True)
    question_type_display = serializers.CharField(source='get_question_type_display', read_only=True)
    is_objective = serializers.ReadOnlyField()
    line_type = TagSimpleSerializer(read_only=True)
    class Meta:
        model = Question
        fields = [
            'id', 'resource_uuid', 'version_number',
            'content', 'question_type', 'question_type_display',
            'options', 'answer', 'explanation',
            'score',
            'is_objective', 'line_type',
            'is_current',
            'created_by', 'created_by_name', 'updated_by', 'updated_by_name',
            'created_at', 'updated_at'

        ]
class QuestionDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for question detail view.
    """
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True, allow_null=True)
    question_type_display = serializers.CharField(source='get_question_type_display', read_only=True)
    is_objective = serializers.ReadOnlyField()
    is_subjective = serializers.ReadOnlyField()
    line_type = TagSimpleSerializer(read_only=True)
    class Meta:
        model = Question
        fields = [
            'id', 'resource_uuid', 'version_number',
            'content', 'question_type', 'question_type_display',
            'options', 'answer', 'explanation', 'score',
            'is_objective', 'is_subjective', 'line_type',
            'is_current',
            'created_by', 'created_by_name', 'updated_by', 'updated_by_name',
            'created_at', 'updated_at'
        ]


class QuestionCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating questions.
    业务验证（选项/答案格式）由 Service._validate_question_data 统一处理。
    """
    line_type_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    class Meta:
        model = Question
        fields = [
            'content', 'question_type', 'options', 'answer',
            'explanation', 'score', 'line_type_id'
        ]

    def validate_line_type_id(self, value):
        return validate_line_type_id(value)


class QuestionUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating questions.
    业务验证（选项/答案格式）由 Service._validate_question_data 统一处理。
    """
    line_type_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    class Meta:
        model = Question
        fields = [
            'content', 'options', 'answer', 'explanation',
            'score', 'line_type_id'
        ]

    def validate_line_type_id(self, value):
        return validate_line_type_id(value)
