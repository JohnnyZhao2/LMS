"""
Serializers for quiz management.

Implements quiz CRUD serializers with ownership control.

Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
Properties:
- Property 14: 被引用试卷删除保护
- Property 16: 试卷所有权编辑控制
"""
from rest_framework import serializers

from apps.questions.models import Question
from apps.questions.serializers import QuestionDetailSerializer, QuestionCreateSerializer
from .models import Quiz, QuizQuestion


class QuizQuestionSerializer(serializers.ModelSerializer):
    """
    Serializer for quiz-question relationship.
    
    Shows question details with order in the quiz.
    """
    question = QuestionDetailSerializer(read_only=True)
    
    class Meta:
        model = QuizQuestion
        fields = ['id', 'question', 'order']


class QuizListSerializer(serializers.ModelSerializer):
    """
    Serializer for quiz list view.
    
    Requirements: 6.4 - 导师或室经理查看试卷列表时展示所有试卷
    """
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    question_count = serializers.ReadOnlyField()
    total_score = serializers.ReadOnlyField()
    has_subjective_questions = serializers.ReadOnlyField()
    
    class Meta:
        model = Quiz
        fields = [
            'id', 'title', 'description', 'question_count', 'total_score',
            'has_subjective_questions', 'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]


class QuizDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for quiz detail view.
    
    Requirements: 6.1, 6.2
    """
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    question_count = serializers.ReadOnlyField()
    total_score = serializers.ReadOnlyField()
    has_subjective_questions = serializers.ReadOnlyField()
    objective_question_count = serializers.ReadOnlyField()
    subjective_question_count = serializers.ReadOnlyField()
    questions = serializers.SerializerMethodField()
    
    class Meta:
        model = Quiz
        fields = [
            'id', 'title', 'description', 'question_count', 'total_score',
            'has_subjective_questions', 'objective_question_count',
            'subjective_question_count', 'questions',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
    
    def get_questions(self, obj):
        """Get ordered questions with details."""
        quiz_questions = obj.get_ordered_questions()
        return QuizQuestionSerializer(quiz_questions, many=True).data


class AddNewQuestionSerializer(serializers.Serializer):
    """
    Serializer for adding a new question to a quiz.
    
    Requirements:
    - 6.2: 向试卷添加题目时允许新建题目
    - 6.3: 在创建试卷时新建的题目纳入题库，题目作者为当前用户
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
    line_type_id = serializers.IntegerField(required=False, allow_null=True)
    
    def validate(self, attrs):
        """Validate question data based on question type."""
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


class QuizCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating quizzes.
    
    Requirements:
    - 6.1: 创建试卷时存储试卷名称、描述，并记录创建者
    - 6.2: 创建试卷时可同时添加已有题目或新建题目
    - 6.3: 在创建试卷时新建的题目纳入题库，题目作者为当前用户
    """
    existing_question_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list,
        help_text='要添加的已有题目ID列表'
    )
    new_questions = AddNewQuestionSerializer(
        many=True,
        required=False,
        default=list,
        help_text='要新建的题目列表'
    )
    
    class Meta:
        model = Quiz
        fields = ['title', 'description', 'existing_question_ids', 'new_questions']
    
    def validate_existing_question_ids(self, value):
        """Validate that all question IDs exist and are not deleted."""
        if not value:
            return value
        
        existing_ids = set(
            Question.objects.filter(
                id__in=value,
                is_deleted=False
            ).values_list('id', flat=True)
        )
        invalid_ids = set(value) - existing_ids
        if invalid_ids:
            raise serializers.ValidationError(f'题目不存在: {list(invalid_ids)}')
        return value
    
    def create(self, validated_data):
        """Create quiz with creator and questions from context."""
        existing_question_ids = validated_data.pop('existing_question_ids', [])
        new_questions_data = validated_data.pop('new_questions', [])
        
        validated_data['created_by'] = self.context['request'].user
        quiz = Quiz.objects.create(**validated_data)
        
        # Add existing questions
        for question_id in existing_question_ids:
            question = Question.objects.get(pk=question_id)
            quiz.add_question(question)
        
        # Create and add new questions
        for question_data in new_questions_data:
            line_type_id = question_data.pop('line_type_id', None)
            question = Question.objects.create(
                created_by=self.context['request'].user,
                **question_data
            )
            # Set line_type if provided
            if line_type_id:
                from apps.knowledge.models import Tag
                line_type = Tag.objects.get(id=line_type_id, tag_type='LINE', is_active=True)
                question.set_line_type(line_type)
            quiz.add_question(question)
        
        return quiz


class QuizUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating quizzes.
    
    Requirements:
    - 6.5: 导师或室经理仅允许编辑自己创建的试卷
    - 6.7: 管理员允许编辑所有试卷
    """
    
    class Meta:
        model = Quiz
        fields = ['title', 'description']



class AddExistingQuestionSerializer(serializers.Serializer):
    """
    Serializer for adding existing questions to a quiz.
    
    Requirements:
    - 6.2: 向试卷添加题目时允许从全平台题库选择已有题目
    """
    question_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        help_text='要添加的题目ID列表'
    )
    
    def validate_question_ids(self, value):
        """Validate that all question IDs exist and are not deleted."""
        existing_ids = set(
            Question.objects.filter(
                id__in=value,
                is_deleted=False
            ).values_list('id', flat=True)
        )
        invalid_ids = set(value) - existing_ids
        if invalid_ids:
            raise serializers.ValidationError(f'题目不存在: {list(invalid_ids)}')
        return value


class AddQuestionsSerializer(serializers.Serializer):
    """
    Serializer for adding questions to a quiz.
    
    Supports both adding existing questions and creating new ones.
    
    Requirements:
    - 6.2: 向试卷添加题目时允许从全平台题库选择已有题目或新建题目
    - 6.3: 在创建试卷时新建的题目纳入题库，题目作者为当前用户
    """
    existing_question_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list,
        help_text='要添加的已有题目ID列表'
    )
    new_questions = AddNewQuestionSerializer(
        many=True,
        required=False,
        default=list,
        help_text='要新建的题目列表'
    )
    
    def validate_existing_question_ids(self, value):
        """Validate that all question IDs exist and are not deleted."""
        if not value:
            return value
        
        existing_ids = set(
            Question.objects.filter(
                id__in=value,
                is_deleted=False
            ).values_list('id', flat=True)
        )
        invalid_ids = set(value) - existing_ids
        if invalid_ids:
            raise serializers.ValidationError(f'题目不存在: {list(invalid_ids)}')
        return value
    
    def validate(self, attrs):
        """Ensure at least one question is being added."""
        existing_ids = attrs.get('existing_question_ids', [])
        new_questions = attrs.get('new_questions', [])
        
        if not existing_ids and not new_questions:
            raise serializers.ValidationError('必须添加至少一道题目')
        
        return attrs


class RemoveQuestionsSerializer(serializers.Serializer):
    """
    Serializer for removing questions from a quiz.
    """
    question_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        help_text='要移除的题目ID列表'
    )


class ReorderQuestionsSerializer(serializers.Serializer):
    """
    Serializer for reordering questions in a quiz.
    """
    question_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        help_text='按新顺序排列的题目ID列表'
    )
