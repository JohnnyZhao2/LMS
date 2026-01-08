"""
Serializers for knowledge management.
"""
from rest_framework import serializers
from .models import Knowledge, Tag
class TagSerializer(serializers.ModelSerializer):
    """
    标签序列化器
    """
    tag_type_display = serializers.CharField(source='get_tag_type_display', read_only=True)
    parent_name = serializers.CharField(source='parent.name', read_only=True, allow_null=True)
    class Meta:
        model = Tag
        fields = ['id', 'name', 'tag_type', 'tag_type_display', 'parent', 'parent_name', 'sort_order', 'is_active']
        read_only_fields = ['id']
class TagSimpleSerializer(serializers.ModelSerializer):
    """
    标签简单序列化器（用于知识列表）
    """
    class Meta:
        model = Tag
        fields = ['id', 'name']
class KnowledgeListSerializer(serializers.ModelSerializer):
    """
    Serializer for knowledge list view.
    Returns a summary of knowledge documents for list display.
    """
    knowledge_type_display = serializers.CharField(source='get_knowledge_type_display', read_only=True)
    line_type = TagSimpleSerializer(read_only=True)
    system_tags = TagSimpleSerializer(many=True, read_only=True)
    operation_tags = TagSimpleSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True, allow_null=True)
    content_preview = serializers.CharField(read_only=True)
    table_of_contents = serializers.ListField(read_only=True)
    class Meta:
        model = Knowledge
        fields = [
            'id', 'resource_uuid', 'version_number',
            'title', 'knowledge_type', 'knowledge_type_display',
            'is_current',
            'line_type', 'system_tags', 'operation_tags',
            'view_count', 'summary', 'content_preview', 'table_of_contents',
            'created_by', 'created_by_name', 'updated_by', 'updated_by_name', 'created_at', 'updated_at'
        ]
class KnowledgeDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for knowledge detail view.
    Returns full knowledge document details.
    """
    knowledge_type_display = serializers.CharField(source='get_knowledge_type_display', read_only=True)
    line_type = TagSimpleSerializer(read_only=True)
    system_tags = TagSimpleSerializer(many=True, read_only=True)
    operation_tags = TagSimpleSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True, allow_null=True)
    source_version_id = serializers.IntegerField(source='source_version.id', read_only=True, allow_null=True)
    table_of_contents = serializers.ListField(read_only=True)
    class Meta:
        model = Knowledge
        fields = [
            'id', 'resource_uuid', 'version_number',
            'title', 'knowledge_type', 'knowledge_type_display',
            'is_current',
            'line_type', 'system_tags', 'operation_tags',
            # 应急类知识结构化字段
            'fault_scenario', 'trigger_process', 'solution',
            'verification_plan', 'recovery_plan',
            # 其他类型知识正文
            'content',
            # 概要
            'summary',
            # 元数据
            'view_count', 'table_of_contents',
            'source_version_id',
            'created_by', 'created_by_name', 'created_at',
            'updated_by', 'updated_by_name', 'updated_at'
        ]
class KnowledgeCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating knowledge documents.
    """
    # 前端传入标签ID
    line_type_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    system_tag_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        default=list
    )
    operation_tag_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        default=list
    )
    class Meta:
        model = Knowledge
        fields = [
            'title', 'knowledge_type',
            'line_type_id',
            'system_tag_ids', 'operation_tag_ids',
            # 应急类知识的结构化字段
            'fault_scenario', 'trigger_process', 'solution',
            'verification_plan', 'recovery_plan',
            # 其他类型知识的正文内容
            'content',
            # 知识概要
            'summary',
        ]
    def validate(self, attrs):
        """
        Validate knowledge document based on knowledge type.
        """
        knowledge_type = attrs.get('knowledge_type')
        # 验证条线类型
        if not attrs.get('line_type_id'):
            raise serializers.ValidationError({
                'line_type_id': '必须提供条线类型ID'
            })
        if knowledge_type == 'EMERGENCY':
            # 应急类知识：至少填写一个结构化字段
            has_content = any([
                attrs.get('fault_scenario'),
                attrs.get('trigger_process'),
                attrs.get('solution'),
                attrs.get('verification_plan'),
                attrs.get('recovery_plan'),
            ])
            if not has_content:
                raise serializers.ValidationError({
                    'fault_scenario': '应急类知识至少需要填写一个结构化字段（故障场景/触发流程/解决方案/验证方案/恢复方案）'
                })
        else:
            # 其他类型知识：必须填写正文内容
            if not attrs.get('content'):
                raise serializers.ValidationError({
                    'content': '必须填写正文内容'
                })
        return attrs
class KnowledgeUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating knowledge documents.
    """
    line_type_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    system_tag_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    operation_tag_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    class Meta:
        model = Knowledge
        fields = [
            'title', 'knowledge_type',
            'line_type_id',
            'system_tag_ids', 'operation_tag_ids',
            # 应急类知识的结构化字段
            'fault_scenario', 'trigger_process', 'solution',
            'verification_plan', 'recovery_plan',
            # 其他类型知识的正文内容
            'content',
            # 知识概要
            'summary',
        ]
    def validate(self, attrs):
        """
        Validate knowledge document based on knowledge type.
        """
        instance = self.instance
        knowledge_type = attrs.get('knowledge_type', instance.knowledge_type if instance else None)
        if knowledge_type == 'EMERGENCY':
            # 应急类知识：至少填写一个结构化字段
            fault_scenario = attrs.get('fault_scenario', instance.fault_scenario if instance else '')
            trigger_process = attrs.get('trigger_process', instance.trigger_process if instance else '')
            solution = attrs.get('solution', instance.solution if instance else '')
            verification_plan = attrs.get('verification_plan', instance.verification_plan if instance else '')
            recovery_plan = attrs.get('recovery_plan', instance.recovery_plan if instance else '')
            has_content = any([
                fault_scenario,
                trigger_process,
                solution,
                verification_plan,
                recovery_plan,
            ])
            if not has_content:
                raise serializers.ValidationError({
                    'fault_scenario': '应急类知识至少需要填写一个结构化字段（故障场景/触发流程/解决方案/验证方案/恢复方案）'
                })
        else:
            # 其他类型知识：必须填写正文内容
            content = attrs.get('content', instance.content if instance else '')
            if not content:
                raise serializers.ValidationError({
                    'content': '必须填写正文内容'
                })
        return attrs
    def update(self, instance, validated_data):
        """
        Update knowledge document with tag handling.
        重要：如果知识当前是当前版本，更新时应该保存为新版本，不影响已发布版本的查看。
        只有通过发布操作才会更新已发布的内容。
        实现方式：
        - 如果当前是当前版本，检查是否已存在关联的草稿
        - 如果存在草稿，更新草稿记录；如果不存在，创建新草稿记录
        - 原记录保持当前版本状态不变，其他人仍可查看
        - 新草稿记录保存修改内容，只有发布后才会更新原记录
        """
        # Set updated_by from context
        user = self.context['request'].user
        instance.updated_by = user
        # 如果当前是当前版本，需要创建或更新草稿而不是直接修改原记录
        if instance.is_current:
            from .services import KnowledgeService
            service = KnowledgeService()
            instance = service.create_or_get_draft_from_published(instance, user)
        # 处理条线类型
        line_type_id = validated_data.pop('line_type_id', None)
        if line_type_id is not None:
            instance.set_line_type(Tag.objects.get(id=line_type_id, tag_type='LINE'))
        # 处理系统标签
        system_tag_ids = validated_data.pop('system_tag_ids', None)
        if system_tag_ids is not None:
            instance.system_tags.set(system_tag_ids)
        # 处理操作标签
        operation_tag_ids = validated_data.pop('operation_tag_ids', None)
        if operation_tag_ids is not None:
            instance.operation_tags.set(operation_tag_ids)
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
class KnowledgeStatsSerializer(serializers.Serializer):
    """
    知识统计序列化器
    返回知识文档的统计数据。
    """
    total = serializers.IntegerField(help_text='总文档数')
    published = serializers.IntegerField(help_text='已发布数')
    emergency = serializers.IntegerField(help_text='应急类型文档数')
    monthly_new = serializers.IntegerField(help_text='本月新增文档数')
