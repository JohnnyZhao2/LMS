"""
Serializers for question management.

Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7
"""
from rest_framework import serializers

from apps.knowledge.serializers import TagSimpleSerializer
from .models import Question


class QuestionListSerializer(serializers.ModelSerializer):
    """
    Serializer for question list view.
    
    Requirements: 5.2
    """
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    question_type_display = serializers.CharField(source='get_question_type_display', read_only=True)
    difficulty_display = serializers.CharField(source='get_difficulty_display', read_only=True)
    is_objective = serializers.ReadOnlyField()
    line_type = TagSimpleSerializer(read_only=True)
    
    class Meta:
        model = Question
        fields = [
            'id', 'resource_uuid', 'version_number',
            'content', 'question_type', 'question_type_display',
            'difficulty', 'difficulty_display', 'score',
            'is_objective', 'line_type',
            'is_current',
            'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]


class QuestionDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for question detail view.
    
    Requirements: 5.1, 5.2
    """
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    question_type_display = serializers.CharField(source='get_question_type_display', read_only=True)
    difficulty_display = serializers.CharField(source='get_difficulty_display', read_only=True)
    is_objective = serializers.ReadOnlyField()
    is_subjective = serializers.ReadOnlyField()
    line_type = TagSimpleSerializer(read_only=True)
    
    class Meta:
        model = Question
        fields = [
            'id', 'resource_uuid', 'version_number',
            'content', 'question_type', 'question_type_display',
            'options', 'answer', 'explanation', 'score',
            'difficulty', 'difficulty_display',
            'is_objective', 'is_subjective', 'line_type',
            'is_current',
            'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]


class QuestionCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating questions.
    
    Requirements:
    - 5.1: 创建题目时存储题目内容、类型、答案和解析，并记录创建者
    """
    line_type_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = Question
        fields = [
            'content', 'question_type', 'options', 'answer',
            'explanation', 'score', 'difficulty', 'line_type_id'
        ]
    
    def validate_line_type_id(self, value):
        """Validate line_type_id exists and is a LINE type tag."""
        if value is None:
            return value
        
        from apps.knowledge.models import Tag
        try:
            tag = Tag.objects.get(id=value, tag_type='LINE', is_active=True)
            return value
        except Tag.DoesNotExist:
            raise serializers.ValidationError('无效的条线类型ID')
    
    def validate(self, attrs):
        """
        Validate question data based on question type.
        """
        question_type = attrs.get('question_type')
        options = attrs.get('options', [])
        answer = attrs.get('answer')
        
        # Validate choice questions have options
        if question_type in ['SINGLE_CHOICE', 'MULTIPLE_CHOICE']:
            if not options:
                raise serializers.ValidationError({
                    'options': '选择题必须设置选项'
                })
            
            # Validate options format
            option_keys = []
            for opt in options:
                if not isinstance(opt, dict) or 'key' not in opt or 'value' not in opt:
                    raise serializers.ValidationError({
                        'options': '选项格式错误，必须包含 key 和 value'
                    })
                option_keys.append(opt['key'])
            
            # Validate answer is in options
            if question_type == 'SINGLE_CHOICE':
                if not isinstance(answer, str):
                    raise serializers.ValidationError({
                        'answer': '单选题答案必须是字符串'
                    })
                if answer not in option_keys:
                    raise serializers.ValidationError({
                        'answer': '单选题答案必须是有效的选项'
                    })
            else:  # MULTIPLE_CHOICE
                if not isinstance(answer, list):
                    raise serializers.ValidationError({
                        'answer': '多选题答案必须是列表'
                    })
                for ans in answer:
                    if ans not in option_keys:
                        raise serializers.ValidationError({
                            'answer': f'多选题答案 {ans} 不是有效的选项'
                        })
        
        # Validate true/false questions
        elif question_type == 'TRUE_FALSE':
            if answer not in ['TRUE', 'FALSE']:
                raise serializers.ValidationError({
                    'answer': '判断题答案必须是 TRUE 或 FALSE'
                })
        
        # Validate short answer questions
        elif question_type == 'SHORT_ANSWER':
            if not isinstance(answer, str):
                raise serializers.ValidationError({
                    'answer': '简答题答案必须是字符串'
                })
        
        return attrs
    
    def create(self, validated_data):
        """
        Create question - 实际创建由Service层处理
        
        注意：此方法保留是为了兼容性，实际创建逻辑在Service层
        """
        # Service层会处理创建逻辑，这里只返回验证后的数据
        return validated_data


class QuestionUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating questions.
    
    Requirements:
    - 5.3: 导师或室经理仅允许编辑自己创建的题目
    - 5.5: 管理员允许编辑所有题目
    """
    line_type_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = Question
        fields = [
            'content', 'options', 'answer', 'explanation',
            'score', 'difficulty', 'line_type_id'
        ]
    
    def validate_line_type_id(self, value):
        """Validate line_type_id exists and is a LINE type tag."""
        if value is None:
            return value
        
        from apps.knowledge.models import Tag
        try:
            tag = Tag.objects.get(id=value, tag_type='LINE', is_active=True)
            return value
        except Tag.DoesNotExist:
            raise serializers.ValidationError('无效的条线类型ID')
    
    def validate(self, attrs):
        """
        Validate question data based on question type.
        """
        instance = self.instance
        question_type = instance.question_type
        options = attrs.get('options', instance.options)
        answer = attrs.get('answer', instance.answer)
        
        # Validate choice questions have options
        if question_type in ['SINGLE_CHOICE', 'MULTIPLE_CHOICE']:
            if not options:
                raise serializers.ValidationError({
                    'options': '选择题必须设置选项'
                })
            
            # Validate options format
            option_keys = []
            for opt in options:
                if not isinstance(opt, dict) or 'key' not in opt or 'value' not in opt:
                    raise serializers.ValidationError({
                        'options': '选项格式错误，必须包含 key 和 value'
                    })
                option_keys.append(opt['key'])
            
            # Validate answer is in options
            if question_type == 'SINGLE_CHOICE':
                if not isinstance(answer, str):
                    raise serializers.ValidationError({
                        'answer': '单选题答案必须是字符串'
                    })
                if answer not in option_keys:
                    raise serializers.ValidationError({
                        'answer': '单选题答案必须是有效的选项'
                    })
            else:  # MULTIPLE_CHOICE
                if not isinstance(answer, list):
                    raise serializers.ValidationError({
                        'answer': '多选题答案必须是列表'
                    })
                for ans in answer:
                    if ans not in option_keys:
                        raise serializers.ValidationError({
                            'answer': f'多选题答案 {ans} 不是有效的选项'
                        })
        
        # Validate true/false questions
        elif question_type == 'TRUE_FALSE':
            if 'answer' in attrs and answer not in ['TRUE', 'FALSE']:
                raise serializers.ValidationError({
                    'answer': '判断题答案必须是 TRUE 或 FALSE'
                })
        
        # Validate short answer questions
        elif question_type == 'SHORT_ANSWER':
            if 'answer' in attrs and not isinstance(answer, str):
                raise serializers.ValidationError({
                    'answer': '简答题答案必须是字符串'
                })
        
        return attrs
    
    def update(self, instance, validated_data):
        """
        Update question - 实际更新由Service层处理
        
        注意：此方法保留是为了兼容性，实际更新逻辑在Service层
        """
        # Service层会处理更新逻辑，这里只返回验证后的数据
        return validated_data
