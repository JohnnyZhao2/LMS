"""
Serializers for knowledge management.

Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
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
    
    新增字段用于区分知识状态：
    - has_pending_draft: 已发布版本是否有待发布的草稿修改
    - pending_draft_id: 待发布草稿的ID
    - source_version_id: 草稿对应的来源已发布版本ID
    - source_version_title: 草稿对应的来源已发布版本标题
    - edit_status: 编辑状态（PUBLISHED_CLEAN/REVISING/UNPUBLISHED）
    
    Requirements: 4.1, 4.6
    """
    knowledge_type_display = serializers.CharField(source='get_knowledge_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    line_type = TagSimpleSerializer(read_only=True)
    system_tags = TagSimpleSerializer(many=True, read_only=True)
    operation_tags = TagSimpleSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True, allow_null=True)
    content_preview = serializers.CharField(read_only=True)
    table_of_contents = serializers.ListField(read_only=True)
    
    # 新增：用于区分知识状态的字段
    has_pending_draft = serializers.SerializerMethodField()
    pending_draft_id = serializers.SerializerMethodField()
    source_version_id = serializers.IntegerField(source='source_version.id', read_only=True, allow_null=True)
    source_version_title = serializers.CharField(source='source_version.title', read_only=True, allow_null=True)
    edit_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Knowledge
        fields = [
            'id', 'resource_uuid', 'version_number',
            'title', 'knowledge_type', 'knowledge_type_display',
            'status', 'status_display', 'is_current', 'published_at',
            'line_type', 'system_tags', 'operation_tags',
            'view_count', 'summary', 'content_preview', 'table_of_contents',
            # 新增字段
            'has_pending_draft', 'pending_draft_id',
            'source_version_id', 'source_version_title', 'edit_status',
            'created_by', 'created_by_name', 'updated_by', 'updated_by_name', 'created_at', 'updated_at'
        ]
    
    def get_has_pending_draft(self, obj):
        """
        检查已发布版本是否有待发布的草稿修改
        仅对已发布版本有效
        """
        if obj.status != 'PUBLISHED':
            return False
        # 使用 prefetch 的数据或查询
        if hasattr(obj, '_pending_draft'):
            return obj._pending_draft is not None
        return Knowledge.objects.filter(
            source_version=obj,
            status='DRAFT',
            is_deleted=False
        ).exists()
    
    def get_pending_draft_id(self, obj):
        """
        获取待发布草稿的ID
        仅对已发布版本有效
        """
        if obj.status != 'PUBLISHED':
            return None
        if hasattr(obj, '_pending_draft'):
            return obj._pending_draft.id if obj._pending_draft else None
        draft = Knowledge.objects.filter(
            source_version=obj,
            status='DRAFT',
            is_deleted=False
        ).first()
        return draft.id if draft else None
    
    def get_edit_status(self, obj):
        """
        获取编辑状态:
        - PUBLISHED_CLEAN: 已发布且无待发布修改
        - REVISING: 已发布但有待发布的草稿修改
        - UNPUBLISHED: 从未发布过的新草稿
        - DRAFT_OF_PUBLISHED: 某个已发布版本的草稿（不在主列表显示，仅用于判断）
        """
        if obj.status == 'PUBLISHED':
            has_draft = self.get_has_pending_draft(obj)
            return 'REVISING' if has_draft else 'PUBLISHED_CLEAN'
        else:  # DRAFT
            if obj.source_version_id:
                return 'DRAFT_OF_PUBLISHED'
            else:
                return 'UNPUBLISHED'


class KnowledgeDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for knowledge detail view.
    
    Returns full knowledge document details.
    
    Requirements: 4.1, 4.2, 4.3, 4.6
    """
    knowledge_type_display = serializers.CharField(source='get_knowledge_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
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
            'status', 'status_display', 'is_current', 'published_at',
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
    
    支持自定义输入标签，自动创建不存在的标签。
    
    Requirements:
    - 4.1: 创建知识文档时要求指定知识类型
    - 4.2: 应急类知识使用结构化正文字段
    - 4.3: 其他类型知识使用 Markdown/富文本自由正文
    """
    # 前端传入标签名称/ID
    line_type_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    line_type_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    system_tag_names = serializers.ListField(
        child=serializers.CharField(max_length=100),
        write_only=True,
        required=False,
        default=list
    )
    operation_tag_names = serializers.ListField(
        child=serializers.CharField(max_length=100),
        write_only=True,
        required=False,
        default=list
    )
    
    class Meta:
        model = Knowledge
        fields = [
            'title', 'knowledge_type',
            'line_type_id', 'line_type_name',
            'system_tag_names', 'operation_tag_names',
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
        
        Requirements: 4.2, 4.3
        """
        knowledge_type = attrs.get('knowledge_type')
        
        # 验证条线类型
        line_type_id = attrs.get('line_type_id')
        line_type_name = attrs.get('line_type_name')
        if not line_type_id and not line_type_name:
            raise serializers.ValidationError({
                'line_type_id': '必须提供条线类型（line_type_id 或 line_type_name）'
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
    
    def create(self, validated_data):
        """Create knowledge document with tag handling."""
        # 提取标签数据
        line_type_id = validated_data.pop('line_type_id', None)
        line_type_name = validated_data.pop('line_type_name', None)
        system_tag_names = validated_data.pop('system_tag_names', [])
        operation_tag_names = validated_data.pop('operation_tag_names', [])
        
        # 处理条线类型
        if line_type_id:
            line_type = Tag.objects.get(id=line_type_id, tag_type='LINE')
        else:
            line_type, _ = Tag.objects.get_or_create(
                name=line_type_name,
                tag_type='LINE',
                defaults={'is_active': True}
            )
        
        # Set created_by and updated_by from context
        user = self.context['request'].user
        validated_data['created_by'] = user
        validated_data['updated_by'] = user
        # 新建知识默认保存为草稿
        validated_data.setdefault('status', 'DRAFT')
        validated_data.setdefault('is_current', False)
        validated_data.setdefault('version_number', Knowledge.next_version_number(validated_data.get('resource_uuid')))
        
        knowledge = Knowledge.objects.create(**validated_data)
        
        # 设置条线类型关系
        if line_type:
            knowledge.set_line_type(line_type)
        
        # 处理系统标签 - 不存在则自动创建
        for name in system_tag_names:
            if name.strip():
                tag, _ = Tag.objects.get_or_create(
                    name=name.strip(),
                    tag_type='SYSTEM',
                    defaults={'is_active': True}
                )
                knowledge.system_tags.add(tag)
        
        # 处理操作标签 - 不存在则自动创建
        for name in operation_tag_names:
            if name.strip():
                tag, _ = Tag.objects.get_or_create(
                    name=name.strip(),
                    tag_type='OPERATION',
                    defaults={'is_active': True}
                )
                knowledge.operation_tags.add(tag)
        
        return knowledge


class KnowledgeUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating knowledge documents.
    
    支持自定义输入标签，自动创建不存在的标签。
    
    Requirements:
    - 4.4: 编辑知识文档时更新内容并记录最后更新时间
    - 4.2: 应急类知识使用结构化正文字段
    - 4.3: 其他类型知识使用 Markdown/富文本自由正文
    """
    line_type_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    line_type_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    system_tag_names = serializers.ListField(
        child=serializers.CharField(max_length=100),
        write_only=True,
        required=False
    )
    operation_tag_names = serializers.ListField(
        child=serializers.CharField(max_length=100),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Knowledge
        fields = [
            'title', 'knowledge_type',
            'line_type_id', 'line_type_name',
            'system_tag_names', 'operation_tag_names',
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
        
        Requirements: 4.2, 4.3
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
        
        重要：如果知识当前是已发布状态，更新时应该保存为草稿，不影响已发布版本的查看。
        只有通过发布操作才会更新已发布的内容。
        
        实现方式：
        - 如果当前是已发布状态，检查是否已存在关联的草稿
        - 如果存在草稿，更新草稿记录；如果不存在，创建新草稿记录
        - 原记录保持已发布状态不变，其他人仍可查看
        - 新草稿记录保存修改内容，只有发布后才会更新原记录
        """
        # Set updated_by from context
        user = self.context['request'].user
        instance.updated_by = user
        
        # 如果当前是已发布状态，需要创建或更新草稿而不是直接修改原记录
        if instance.status == 'PUBLISHED':
            existing_draft = Knowledge.objects.filter(
                source_version=instance,
                status='DRAFT',
                is_deleted=False
            ).first()
            
            if existing_draft:
                instance = existing_draft
                instance.updated_by = user
            else:
                instance = instance.clone_as_draft(user)
        
        # 处理条线类型
        line_type_id = validated_data.pop('line_type_id', None)
        line_type_name = validated_data.pop('line_type_name', None)
        
        if line_type_id or line_type_name:
            if line_type_id:
                line_type = Tag.objects.get(id=line_type_id, tag_type='LINE')
            else:
                line_type, _ = Tag.objects.get_or_create(
                    name=line_type_name,
                    tag_type='LINE',
                    defaults={'is_active': True}
                )
            instance.set_line_type(line_type)
        
        # 处理系统标签
        system_tag_names = validated_data.pop('system_tag_names', None)
        if system_tag_names is not None:
            instance.system_tags.clear()
            for name in system_tag_names:
                if name.strip():
                    tag, _ = Tag.objects.get_or_create(
                        name=name.strip(),
                        tag_type='SYSTEM',
                        defaults={'is_active': True}
                    )
                    instance.system_tags.add(tag)
        
        # 处理操作标签
        operation_tag_names = validated_data.pop('operation_tag_names', None)
        if operation_tag_names is not None:
            instance.operation_tags.clear()
            for name in operation_tag_names:
                if name.strip():
                    tag, _ = Tag.objects.get_or_create(
                        name=name.strip(),
                        tag_type='OPERATION',
                        defaults={'is_active': True}
                    )
                    instance.operation_tags.add(tag)
        
        # Update other fields (不包括 status，status 通过发布接口单独处理)
        validated_data.pop('status', None)  # 移除 status，不允许通过更新接口修改
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
