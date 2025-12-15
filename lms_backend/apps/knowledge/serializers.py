"""
Serializers for knowledge management.

Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
"""
from rest_framework import serializers

from .models import Knowledge, KnowledgeCategory, KnowledgeCategoryRelation


class KnowledgeCategorySerializer(serializers.ModelSerializer):
    """Serializer for KnowledgeCategory model."""
    level = serializers.ReadOnlyField()
    is_primary = serializers.ReadOnlyField()
    children_count = serializers.SerializerMethodField()
    
    class Meta:
        model = KnowledgeCategory
        fields = [
            'id', 'name', 'code', 'parent', 'description',
            'sort_order', 'level', 'is_primary', 'children_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_children_count(self, obj):
        """Get count of child categories."""
        return obj.children.count()


class KnowledgeCategoryCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating knowledge categories."""
    
    class Meta:
        model = KnowledgeCategory
        fields = ['name', 'code', 'parent', 'description', 'sort_order']
    
    def validate_code(self, value):
        """Validate code is unique."""
        if KnowledgeCategory.objects.filter(code=value).exists():
            raise serializers.ValidationError('该分类代码已存在')
        return value
    
    def validate_parent(self, value):
        """Validate parent category level."""
        if value and value.parent:
            raise serializers.ValidationError('分类最多支持两级')
        return value


class KnowledgeCategoryUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating knowledge categories."""
    
    class Meta:
        model = KnowledgeCategory
        fields = ['name', 'description', 'sort_order']


class KnowledgeCategoryTreeSerializer(serializers.ModelSerializer):
    """Serializer for category tree with children."""
    children = serializers.SerializerMethodField()
    
    class Meta:
        model = KnowledgeCategory
        fields = ['id', 'name', 'code', 'description', 'sort_order', 'children']
    
    def get_children(self, obj):
        """Get child categories."""
        children = obj.children.all().order_by('sort_order', 'code')
        return KnowledgeCategoryTreeSerializer(children, many=True).data


# ============ Knowledge Serializers ============

class KnowledgeListSerializer(serializers.ModelSerializer):
    """
    Serializer for knowledge list view.
    
    Requirements: 4.1, 4.6
    """
    created_by_name = serializers.CharField(source='created_by.real_name', read_only=True)
    updated_by_name = serializers.SerializerMethodField()
    primary_category = KnowledgeCategorySerializer(read_only=True)
    secondary_category = KnowledgeCategorySerializer(read_only=True)
    
    class Meta:
        model = Knowledge
        fields = [
            'id', 'title', 'knowledge_type', 'summary',
            'operation_tags', 'primary_category', 'secondary_category',
            'created_by_name', 'updated_by_name', 'view_count',
            'created_at', 'updated_at'
        ]
    
    def get_updated_by_name(self, obj):
        """Get name of last updater."""
        if obj.updated_by:
            return obj.updated_by.real_name
        return obj.created_by.real_name


class KnowledgeDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for knowledge detail view.
    
    Requirements: 4.1, 4.2, 4.3, 4.6
    """
    created_by_name = serializers.CharField(source='created_by.real_name', read_only=True)
    updated_by_name = serializers.SerializerMethodField()
    categories = KnowledgeCategorySerializer(many=True, read_only=True)
    primary_category = KnowledgeCategorySerializer(read_only=True)
    secondary_category = KnowledgeCategorySerializer(read_only=True)
    
    class Meta:
        model = Knowledge
        fields = [
            'id', 'title', 'knowledge_type', 'summary', 'content',
            'fault_scenario', 'trigger_process', 'solution',
            'verification_plan', 'recovery_plan', 'operation_tags',
            'categories', 'primary_category', 'secondary_category',
            'created_by_name', 'updated_by_name', 'view_count',
            'created_at', 'updated_at'
        ]
    
    def get_updated_by_name(self, obj):
        """Get name of last updater."""
        if obj.updated_by:
            return obj.updated_by.real_name
        return obj.created_by.real_name


class KnowledgeCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating knowledge documents.
    
    Requirements:
    - 4.1: 创建知识文档时要求指定知识类型
    - 4.2: 应急类知识启用结构化正文字段
    - 4.3: 其他类型知识启用 Markdown/富文本自由正文
    - 4.6: 设置知识分类
    """
    category_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True,
        help_text='分类ID列表'
    )
    
    class Meta:
        model = Knowledge
        fields = [
            'title', 'knowledge_type', 'summary', 'content',
            'fault_scenario', 'trigger_process', 'solution',
            'verification_plan', 'recovery_plan', 'operation_tags',
            'category_ids'
        ]
    
    def validate(self, attrs):
        """
        Validate based on knowledge type.
        
        Requirements: 4.2, 4.3
        """
        knowledge_type = attrs.get('knowledge_type')
        
        if knowledge_type == 'EMERGENCY':
            # 应急类知识必须填写结构化字段
            if not attrs.get('fault_scenario'):
                raise serializers.ValidationError({
                    'fault_scenario': '应急类知识必须填写故障场景'
                })
            if not attrs.get('solution'):
                raise serializers.ValidationError({
                    'solution': '应急类知识必须填写解决方案'
                })
        else:
            # 其他类型知识必须填写正文
            if not attrs.get('content'):
                raise serializers.ValidationError({
                    'content': '其他类型知识必须填写正文内容'
                })
        
        return attrs
    
    def validate_category_ids(self, value):
        """Validate category IDs exist."""
        if value:
            existing_ids = set(
                KnowledgeCategory.objects.filter(id__in=value).values_list('id', flat=True)
            )
            invalid_ids = set(value) - existing_ids
            if invalid_ids:
                raise serializers.ValidationError(f'分类不存在: {list(invalid_ids)}')
        return value
    
    def create(self, validated_data):
        """Create knowledge with categories."""
        category_ids = validated_data.pop('category_ids', [])
        
        # Set created_by from context
        validated_data['created_by'] = self.context['request'].user
        
        knowledge = Knowledge.objects.create(**validated_data)
        
        # Create category relations
        for category_id in category_ids:
            KnowledgeCategoryRelation.objects.create(
                knowledge=knowledge,
                category_id=category_id
            )
        
        return knowledge


class KnowledgeUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating knowledge documents.
    
    Requirements:
    - 4.4: 编辑知识文档时更新内容并记录最后更新时间
    """
    category_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True,
        help_text='分类ID列表'
    )
    
    class Meta:
        model = Knowledge
        fields = [
            'title', 'summary', 'content',
            'fault_scenario', 'trigger_process', 'solution',
            'verification_plan', 'recovery_plan', 'operation_tags',
            'category_ids'
        ]
    
    def validate(self, attrs):
        """
        Validate based on knowledge type.
        
        Requirements: 4.2, 4.3
        """
        instance = self.instance
        knowledge_type = instance.knowledge_type
        
        if knowledge_type == 'EMERGENCY':
            # Check if structured fields are being cleared
            fault_scenario = attrs.get('fault_scenario', instance.fault_scenario)
            solution = attrs.get('solution', instance.solution)
            
            if not fault_scenario:
                raise serializers.ValidationError({
                    'fault_scenario': '应急类知识必须填写故障场景'
                })
            if not solution:
                raise serializers.ValidationError({
                    'solution': '应急类知识必须填写解决方案'
                })
        else:
            # Check if content is being cleared
            content = attrs.get('content', instance.content)
            if not content:
                raise serializers.ValidationError({
                    'content': '其他类型知识必须填写正文内容'
                })
        
        return attrs
    
    def validate_category_ids(self, value):
        """Validate category IDs exist."""
        if value:
            existing_ids = set(
                KnowledgeCategory.objects.filter(id__in=value).values_list('id', flat=True)
            )
            invalid_ids = set(value) - existing_ids
            if invalid_ids:
                raise serializers.ValidationError(f'分类不存在: {list(invalid_ids)}')
        return value
    
    def update(self, instance, validated_data):
        """Update knowledge with categories."""
        category_ids = validated_data.pop('category_ids', None)
        
        # Set updated_by from context
        instance.updated_by = self.context['request'].user
        
        # Update fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        
        # Update category relations if provided
        if category_ids is not None:
            # Remove existing relations
            instance.category_relations.all().delete()
            
            # Create new relations
            for category_id in category_ids:
                KnowledgeCategoryRelation.objects.create(
                    knowledge=instance,
                    category_id=category_id
                )
        
        return instance
