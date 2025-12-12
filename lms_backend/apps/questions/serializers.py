"""
Serializers for questions app.
"""
from rest_framework import serializers
from .models import Question, Quiz, QuizQuestion
from apps.users.models import User


class QuestionSerializer(serializers.ModelSerializer):
    """题目序列化器"""
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    creator_name = serializers.CharField(source='created_by.real_name', read_only=True, allow_null=True)
    
    class Meta:
        model = Question
        fields = [
            'id', 'type', 'type_display', 'content', 'options',
            'correct_answer', 'analysis', 'difficulty', 'is_public',
            'is_deleted', 'created_by', 'creator_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'is_deleted', 'created_at', 'updated_at']
    
    def validate_type(self, value):
        """验证题目类型"""
        valid_types = ['SINGLE', 'MULTIPLE', 'JUDGE', 'ESSAY']
        if value not in valid_types:
            raise serializers.ValidationError(f'题目类型必须是以下之一: {", ".join(valid_types)}')
        return value
    
    def validate_options(self, value):
        """验证选项格式"""
        if value is not None:
            if not isinstance(value, dict):
                raise serializers.ValidationError('选项必须是JSON对象格式')
            # 验证选项格式：应该是 {"A": "选项A", "B": "选项B", ...}
            if not all(isinstance(k, str) and isinstance(v, str) for k, v in value.items()):
                raise serializers.ValidationError('选项格式错误，应为 {"A": "选项A", "B": "选项B"}')
        return value
    
    def validate_correct_answer(self, value):
        """验证正确答案格式"""
        if not isinstance(value, dict):
            raise serializers.ValidationError('正确答案必须是JSON对象格式')
        
        if 'answer' not in value:
            raise serializers.ValidationError('正确答案必须包含 "answer" 字段')
        
        return value
    
    def validate(self, attrs):
        """验证题目数据"""
        question_type = attrs.get('type')
        options = attrs.get('options')
        correct_answer = attrs.get('correct_answer')
        
        # 选择题和判断题必须有选项
        if question_type in ['SINGLE', 'MULTIPLE', 'JUDGE']:
            if not options:
                raise serializers.ValidationError('选择题和判断题必须提供选项')
        
        # 简答题不需要选项
        if question_type == 'ESSAY' and options:
            raise serializers.ValidationError('简答题不需要选项')
        
        # 验证答案格式
        if correct_answer:
            answer = correct_answer.get('answer')
            if question_type == 'SINGLE':
                if not isinstance(answer, str):
                    raise serializers.ValidationError('单选题答案必须是字符串（如 "A"）')
            elif question_type == 'MULTIPLE':
                if not isinstance(answer, list):
                    raise serializers.ValidationError('多选题答案必须是列表（如 ["A", "B"]）')
            elif question_type == 'JUDGE':
                if not isinstance(answer, bool):
                    raise serializers.ValidationError('判断题答案必须是布尔值（true/false）')
        
        return attrs
    
    def create(self, validated_data):
        """创建题目"""
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user
        
        return super().create(validated_data)


class QuestionListSerializer(serializers.ModelSerializer):
    """题目列表序列化器（简化版）"""
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    creator_name = serializers.CharField(source='created_by.real_name', read_only=True, allow_null=True)
    
    class Meta:
        model = Question
        fields = [
            'id', 'type', 'type_display', 'content', 'difficulty',
            'is_public', 'creator_name', 'created_at'
        ]


class QuizQuestionSerializer(serializers.ModelSerializer):
    """测验题目关联序列化器"""
    question_detail = QuestionSerializer(source='question', read_only=True)
    question_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = QuizQuestion
        fields = [
            'id', 'question_id', 'question_detail',
            'sort_order', 'score', 'created_at'
        ]
        read_only_fields = ['created_at']
    
    def validate_score(self, value):
        """验证分值"""
        if value <= 0:
            raise serializers.ValidationError('分值必须大于0')
        return value


class QuizSerializer(serializers.ModelSerializer):
    """测验序列化器"""
    creator_name = serializers.CharField(source='created_by.real_name', read_only=True, allow_null=True)
    question_count = serializers.SerializerMethodField()
    questions_detail = serializers.SerializerMethodField()
    
    class Meta:
        model = Quiz
        fields = [
            'id', 'title', 'description', 'total_score', 'pass_score',
            'is_public', 'is_deleted', 'created_by', 'creator_name',
            'question_count', 'questions_detail',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'is_deleted', 'created_at', 'updated_at']
    
    def get_question_count(self, obj):
        """获取题目数量"""
        return obj.get_question_count()
    
    def get_questions_detail(self, obj):
        """获取题目详情（按顺序）"""
        quiz_questions = obj.get_questions_ordered()
        return QuizQuestionSerializer(quiz_questions, many=True).data
    
    def validate_pass_score(self, value):
        """验证及格分"""
        if value < 0:
            raise serializers.ValidationError('及格分不能为负数')
        return value
    
    def validate_total_score(self, value):
        """验证总分"""
        if value <= 0:
            raise serializers.ValidationError('总分必须大于0')
        return value
    
    def validate(self, attrs):
        """验证测验数据"""
        total_score = attrs.get('total_score')
        pass_score = attrs.get('pass_score')
        
        # 如果两个字段都存在，验证及格分不能大于总分
        if total_score is not None and pass_score is not None:
            if pass_score > total_score:
                raise serializers.ValidationError('及格分不能大于总分')
        
        return attrs
    
    def create(self, validated_data):
        """创建测验"""
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user
        
        return super().create(validated_data)


class QuizListSerializer(serializers.ModelSerializer):
    """测验列表序列化器（简化版）"""
    creator_name = serializers.CharField(source='created_by.real_name', read_only=True, allow_null=True)
    question_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Quiz
        fields = [
            'id', 'title', 'description', 'total_score', 'pass_score',
            'is_public', 'question_count', 'creator_name', 'created_at'
        ]
    
    def get_question_count(self, obj):
        """获取题目数量"""
        return obj.get_question_count()


class AddQuestionsSerializer(serializers.Serializer):
    """添加题目到测验的序列化器"""
    questions = serializers.ListField(
        child=serializers.DictField(),
        help_text='题目列表，每个题目包含 question_id, score, sort_order'
    )
    
    def validate_questions(self, value):
        """验证题目列表"""
        if not value:
            raise serializers.ValidationError('题目列表不能为空')
        
        for item in value:
            if 'question_id' not in item:
                raise serializers.ValidationError('每个题目必须包含 question_id')
            if 'score' not in item:
                raise serializers.ValidationError('每个题目必须包含 score')
            if 'sort_order' not in item:
                raise serializers.ValidationError('每个题目必须包含 sort_order')
            
            # 验证分值
            if item['score'] <= 0:
                raise serializers.ValidationError('分值必须大于0')
        
        return value


class ReorderQuestionsSerializer(serializers.Serializer):
    """重新排序题目的序列化器"""
    question_orders = serializers.ListField(
        child=serializers.DictField(),
        help_text='题目顺序列表，每个项包含 question_id 和 sort_order'
    )
    
    def validate_question_orders(self, value):
        """验证题目顺序列表"""
        if not value:
            raise serializers.ValidationError('题目顺序列表不能为空')
        
        for item in value:
            if 'question_id' not in item:
                raise serializers.ValidationError('每个项必须包含 question_id')
            if 'sort_order' not in item:
                raise serializers.ValidationError('每个项必须包含 sort_order')
        
        return value


class QuestionImportSerializer(serializers.Serializer):
    """题目批量导入序列化器"""
    file = serializers.FileField(
        help_text='Excel文件 (.xlsx)',
        required=True
    )
    
    def validate_file(self, value):
        """验证文件格式"""
        if not value.name.endswith('.xlsx'):
            raise serializers.ValidationError('只支持 .xlsx 格式的Excel文件')
        
        # Check file size (max 10MB)
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError('文件大小不能超过10MB')
        
        return value


class QuestionImportSerializer(serializers.Serializer):
    """题目导入序列化器"""
    file = serializers.FileField(
        help_text='Excel文件 (.xlsx格式)',
        required=True
    )
    
    def validate_file(self, value):
        """验证文件"""
        if not value:
            raise serializers.ValidationError('请上传文件')
        
        # 验证文件大小（限制10MB）
        max_size = 10 * 1024 * 1024  # 10MB
        if value.size > max_size:
            raise serializers.ValidationError('文件大小不能超过10MB')
        
        return value
