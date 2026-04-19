from rest_framework import serializers

from .models import Tag


class TagSerializer(serializers.ModelSerializer):
    tag_type_display = serializers.CharField(source='get_tag_type_display', read_only=True)
    current_module = serializers.ChoiceField(
        choices=['knowledge', 'question'],
        required=False,
        write_only=True,
    )
    extend_scope = serializers.BooleanField(required=False, write_only=True, default=False)

    class Meta:
        model = Tag
        fields = [
            'id',
            'name',
            'color',
            'tag_type',
            'tag_type_display',
            'sort_order',
            'allow_knowledge',
            'allow_question',
            'current_module',
            'extend_scope',
        ]
        read_only_fields = ['id']
        validators = []


class TagSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'color']
