"""
Serializers for knowledge app.
"""
from rest_framework import serializers
from .models import KnowledgeCategory, Knowledge, OperationType
from apps.users.models import User, Department


class KnowledgeCategorySerializer(serializers.ModelSerializer):
    """知识分类序列化器"""
    level_display = serializers.CharField(source='get_level_display', read_only=True)
    parent_name = serializers.CharField(source='parent.name', read_only=True, allow_null=True)
    children_count = serializers.SerializerMethodField()
    
    class Meta:
        model = KnowledgeCategory
        fields = [
            'id', 'name', 'code', 'level', 'level_display',
            'parent', 'parent_name', 'description', 'sort_order',
            'children_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_children_count(self, obj):
        """获取子分类数量"""
        return obj.children.count()
    
    def validate(self, attrs):
        """验证分类数据"""
        level = attrs.get('level')
        parent = attrs.get('parent')
        
        # 验证一级分类（条线）不能有父分类
        if level == 1 and parent is not None:
            raise serializers.ValidationError('条线不能有父分类')
        
        # 验证二级分类（系统）必须有父分类
        if level == 2 and parent is None:
            raise serializers.ValidationError('系统必须有父分类（所属条线）')
        
        # 验证父分类的层级
        if parent is not None:
            if parent.level != 1:
                raise serializers.ValidationError('系统的父分类必须是条线')
        
        return attrs


class KnowledgeCategoryTreeSerializer(serializers.ModelSerializer):
    """知识分类树形序列化器"""
    children = serializers.SerializerMethodField()
    level_display = serializers.CharField(source='get_level_display', read_only=True)
    
    class Meta:
        model = KnowledgeCategory
        fields = [
            'id', 'name', 'code', 'level', 'level_display',
            'description', 'sort_order', 'children'
        ]
    
    def get_children(self, obj):
        """递归获取子分类"""
        children = obj.children.all()
        return KnowledgeCategoryTreeSerializer(children, many=True).data


class OperationTypeSerializer(serializers.ModelSerializer):
    """操作类型序列化器"""
    
    class Meta:
        model = OperationType
        fields = ['id', 'name', 'code', 'description', 'sort_order', 'created_at']
        read_only_fields = ['created_at']


class KnowledgeSerializer(serializers.ModelSerializer):
    """应急操作手册序列化器"""
    # 只读字段
    creator_name = serializers.CharField(source='creator.real_name', read_only=True)
    modifier_name = serializers.CharField(source='modifier.real_name', read_only=True, allow_null=True)
    deliverer_name = serializers.CharField(source='deliverer.real_name', read_only=True, allow_null=True)
    creator_team_name = serializers.CharField(source='creator_team.name', read_only=True, allow_null=True)
    line_name = serializers.CharField(source='line.name', read_only=True)
    system_name = serializers.CharField(source='system.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    # 操作类型
    operation_types_detail = OperationTypeSerializer(source='operation_types', many=True, read_only=True)
    operation_type_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text='操作类型ID列表'
    )
    
    # 可执行人
    executors_detail = serializers.SerializerMethodField()
    executor_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text='可执行人ID列表'
    )
    
    # 结构化内容
    content = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Knowledge
        fields = [
            'id', 'title', 'summary', 'cover_image', 'attachment_url',
            # 结构化内容
            'content', 'content_scenario', 'content_trigger', 'content_solution',
            'content_verification', 'content_recovery',
            # 分类
            'line', 'line_name', 'system', 'system_name',
            'operation_types_detail', 'operation_type_ids',
            # 人员
            'deliverer', 'deliverer_name',
            'creator', 'creator_name',
            'creator_team', 'creator_team_name',
            'modifier', 'modifier_name',
            'executors_detail', 'executor_ids',
            # 其他
            'emergency_platform', 'status', 'status_display',
            'view_count', 'is_deleted', 'deleted_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'creator', 'modifier', 'creator_team', 'view_count',
            'deleted_at', 'created_at', 'updated_at', 'is_deleted'
        ]
    
    def get_content(self, obj):
        """获取结构化内容"""
        return obj.get_content_dict()
    
    def get_executors_detail(self, obj):
        """获取可执行人详情"""
        return [
            {
                'id': user.id,
                'username': user.username,
                'real_name': user.real_name,
                'department': user.department.name if user.department else None
            }
            for user in obj.executors.all()
        ]
    
    def create(self, validated_data):
        """创建应急操作手册"""
        operation_type_ids = validated_data.pop('operation_type_ids', [])
        executor_ids = validated_data.pop('executor_ids', [])
        
        # 设置创建人和团队
        request = self.context.get('request')
        if request and request.user:
            validated_data['creator'] = request.user
            if request.user.department:
                validated_data['creator_team'] = request.user.department
        
        # 创建文档
        knowledge = Knowledge.objects.create(**validated_data)
        
        # 设置操作类型
        if operation_type_ids:
            knowledge.operation_types.set(operation_type_ids)
        
        # 设置可执行人
        if executor_ids:
            knowledge.executors.set(executor_ids)
        
        return knowledge
    
    def update(self, instance, validated_data):
        """更新应急操作手册"""
        operation_type_ids = validated_data.pop('operation_type_ids', None)
        executor_ids = validated_data.pop('executor_ids', None)
        
        # 设置修改人
        request = self.context.get('request')
        if request and request.user:
            validated_data['modifier'] = request.user
        
        # 更新文档
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # 更新操作类型
        if operation_type_ids is not None:
            instance.operation_types.set(operation_type_ids)
        
        # 更新可执行人
        if executor_ids is not None:
            instance.executors.set(executor_ids)
        
        return instance


class KnowledgeListSerializer(serializers.ModelSerializer):
    """应急操作手册列表序列化器（简化版）"""
    creator_name = serializers.CharField(source='creator.real_name', read_only=True)
    line_name = serializers.CharField(source='line.name', read_only=True)
    system_name = serializers.CharField(source='system.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    operation_type_names = serializers.SerializerMethodField()
    
    class Meta:
        model = Knowledge
        fields = [
            'id', 'title', 'summary', 'cover_image',
            'line_name', 'system_name', 'operation_type_names',
            'status', 'status_display', 'view_count',
            'creator_name', 'created_at', 'updated_at'
        ]
    
    def get_operation_type_names(self, obj):
        """获取操作类型名称列表"""
        return [ot.name for ot in obj.operation_types.all()]
