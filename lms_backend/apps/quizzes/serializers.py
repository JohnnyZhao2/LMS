"""
Serializers for quiz management.

Implements quiz CRUD serializers with ownership control.

Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
Properties:
- Property 14: 被引用试卷删除保护
- Property 16: 试卷所有权编辑控制
"""
from django.utils import timezone
from rest_framework import serializers

from apps.questions.models import Question
from apps.questions.serializers import QuestionDetailSerializer, QuestionCreateSerializer
from .models import Quiz, QuizQuestion


class QuizQuestionSerializer(serializers.ModelSerializer):
    """
    Serializer for quiz-question relationship.
    
    Shows question details with order in the quiz.
    Returns flattened structure for frontend compatibility.
    """
    question = serializers.IntegerField(source='question.id', read_only=True)
    question_content = serializers.CharField(source='question.content', read_only=True)
    question_type = serializers.CharField(source='question.question_type', read_only=True)
    question_type_display = serializers.CharField(source='question.get_question_type_display', read_only=True)
    score = serializers.DecimalField(source='question.score', max_digits=5, decimal_places=2, read_only=True)
    
    class Meta:
        model = QuizQuestion
        fields = ['id', 'question', 'question_content', 'question_type', 'question_type_display', 'score', 'order']


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
            'id', 'resource_uuid', 'version_number',
            'title', 'description', 'question_count', 'total_score',
            'has_subjective_questions',
            'status', 'is_current', 'published_at',
            'created_by', 'created_by_name',
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
            'id', 'resource_uuid', 'version_number',
            'title', 'description', 'question_count', 'total_score',
            'has_subjective_questions', 'objective_question_count',
            'subjective_question_count', 'questions',
            'status', 'is_current', 'published_at',
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
        validated_data.setdefault('status', 'PUBLISHED')
        validated_data.setdefault('is_current', True)
        validated_data.setdefault('published_at', timezone.now())
        validated_data.setdefault(
            'version_number',
            Quiz.next_version_number(validated_data.get('resource_uuid'))
        )
        quiz = Quiz.objects.create(**validated_data)
        
        # Add existing questions
        for question_id in existing_question_ids:
            question = Question.objects.get(pk=question_id)
            quiz.add_question(question)
        
        # Create and add new questions
        for question_data in new_questions_data:
            line_type_id = question_data.pop('line_type_id', None)
            question_attrs = {
                'created_by': self.context['request'].user,
                'status': 'PUBLISHED',
                'is_current': True,
                'published_at': timezone.now(),
                'version_number': Question.next_version_number(question_data.get('resource_uuid')),
                **question_data,
            }
            question = Question.objects.create(**question_attrs)
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
    
    Extends basic metadata updates with question list synchronization so
    that the frontend can submit the完整题目顺序。
    
    Requirements:
    - 6.2: 允许调整试卷包含的题目
    - 6.5: 导师或室经理仅允许编辑自己创建的试卷
    - 6.7: 管理员允许编辑所有试卷
    """
    existing_question_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
        help_text='新的题目 ID 顺序列表'
    )
    
    class Meta:
        model = Quiz
        fields = ['title', 'description', 'existing_question_ids']
    
    def validate_existing_question_ids(self, value):
        """Validate provided question ids."""
        if value is None:
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
    
    def update(self, instance, validated_data):
        """Update quiz info and synchronize question ordering."""
        question_ids = validated_data.pop('existing_question_ids', None)
        instance = instance.clone_new_version()
        quiz = super().update(instance, validated_data)
        
        if question_ids is not None:
            current_relations = {
                qq.question_id: qq
                for qq in quiz.quiz_questions.all()
            }
            new_id_set = set(question_ids)
            
            # Remove questions that are no longer present
            to_remove = [qid for qid in current_relations.keys() if qid not in new_id_set]
            if to_remove:
                QuizQuestion.objects.filter(
                    quiz=quiz,
                    question_id__in=to_remove
                ).delete()
            
            # Recreate ordering / add missing questions
            for order, question_id in enumerate(question_ids, start=1):
                relation = current_relations.get(question_id)
                if relation:
                    if relation.order != order:
                        relation.order = order
                        relation.save(update_fields=['order'])
                else:
                    question = Question.objects.get(pk=question_id)
                    quiz.add_question(question, order=order)
        
        return quiz



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
