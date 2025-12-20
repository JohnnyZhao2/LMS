"""
Serializers for question management.

Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
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
            'id', 'content', 'question_type', 'question_type_display',
            'difficulty', 'difficulty_display', 'score',
            'is_objective', 'line_type', 'created_by', 'created_by_name',
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
            'id', 'content', 'question_type', 'question_type_display',
            'options', 'answer', 'explanation', 'score',
            'difficulty', 'difficulty_display',
            'is_objective', 'is_subjective', 'line_type',
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
        """Create question with creator from context."""
        from apps.knowledge.models import Tag
        
        line_type_id = validated_data.pop('line_type_id', None)
        validated_data['created_by'] = self.context['request'].user
        
        question = Question.objects.create(**validated_data)
        
        # 设置条线类型关系
        if line_type_id:
            line_type = Tag.objects.get(id=line_type_id, tag_type='LINE', is_active=True)
            question.set_line_type(line_type)
        
        return question


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
        """Update question with line_type handling."""
        from apps.knowledge.models import Tag
        
        line_type_id = validated_data.pop('line_type_id', None)
        
        # 更新条线类型关系
        if line_type_id is not None:
            if line_type_id:
                line_type = Tag.objects.get(id=line_type_id, tag_type='LINE', is_active=True)
                instance.set_line_type(line_type)
            else:
                instance.set_line_type(None)
        
        return super().update(instance, validated_data)


class QuestionImportSerializer(serializers.Serializer):
    """
    Serializer for bulk importing questions from Excel.
    
    Requirements:
    - 5.6: 管理员批量导入题目时解析 Excel 模板并创建题目记录
    """
    file = serializers.FileField(help_text='Excel 文件')
    
    def validate_file(self, value):
        """Validate file is an Excel file."""
        if not value.name.endswith(('.xlsx', '.xls')):
            raise serializers.ValidationError('请上传 Excel 文件（.xlsx 或 .xls）')
        return value


class QuestionImportItemSerializer(serializers.Serializer):
    """
    Serializer for a single question in import data.
    """
    content = serializers.CharField()
    question_type = serializers.ChoiceField(choices=Question.QUESTION_TYPE_CHOICES)
    options = serializers.JSONField(required=False, default=list)
    answer = serializers.JSONField()
    explanation = serializers.CharField(required=False, default='')
    score = serializers.DecimalField(max_digits=5, decimal_places=2, default=1.0)
    difficulty = serializers.ChoiceField(
        choices=Question.DIFFICULTY_CHOICES,
        default='MEDIUM'
    )
