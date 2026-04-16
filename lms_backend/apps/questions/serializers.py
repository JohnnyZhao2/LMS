"""Serializers for question management."""

from rest_framework import serializers

from apps.tags.serializers import TagSimpleSerializer

from .models import Question


class QuestionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True, allow_null=True)
    question_type_display = serializers.CharField(source='get_question_type_display', read_only=True)
    options = serializers.JSONField(read_only=True)
    answer = serializers.JSONField(read_only=True)
    space_tag = TagSimpleSerializer(read_only=True)
    tags = TagSimpleSerializer(many=True, read_only=True)
    usage_count = serializers.SerializerMethodField()
    is_referenced = serializers.SerializerMethodField()
    created_from_quiz_id = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = Question
        fields = [
            'id',
            'content',
            'question_type',
            'question_type_display',
            'options',
            'answer',
            'explanation',
            'score',
            'space_tag',
            'tags',
            'usage_count',
            'is_referenced',
            'created_from_quiz_id',
            'created_by_name',
            'updated_by_name',
            'created_at',
            'updated_at',
        ]

    def get_usage_count(self, obj) -> int:
        annotated_value = getattr(obj, 'usage_count', None)
        if annotated_value is not None:
            return annotated_value
        return obj.quiz_copies.count()

    def get_is_referenced(self, obj) -> bool:
        annotated_value = getattr(obj, 'is_referenced', None)
        if annotated_value is not None:
            return annotated_value
        return self.get_usage_count(obj) > 0


class QuestionCreateSerializer(serializers.Serializer):
    content = serializers.CharField()
    question_type = serializers.ChoiceField(choices=Question.QUESTION_TYPE_CHOICES)
    options = serializers.JSONField(required=False)
    answer = serializers.JSONField(required=False)
    explanation = serializers.CharField(required=False, allow_blank=True, default='')
    space_tag_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    tag_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False, default=list)
    score = serializers.DecimalField(max_digits=5, decimal_places=2, required=False)


class QuestionUpdateSerializer(serializers.Serializer):
    content = serializers.CharField(required=False)
    question_type = serializers.ChoiceField(choices=Question.QUESTION_TYPE_CHOICES, required=False)
    options = serializers.JSONField(required=False)
    answer = serializers.JSONField(required=False)
    explanation = serializers.CharField(required=False, allow_blank=True)
    space_tag_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    tag_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    score = serializers.DecimalField(max_digits=5, decimal_places=2, required=False)
