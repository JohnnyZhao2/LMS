"""
Views for quiz management.

Implements quiz CRUD endpoints with ownership control.

Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
Properties:
- Property 14: 被引用试卷删除保护
- Property 16: 试卷所有权编辑控制
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter

from core.exceptions import BusinessError, ErrorCodes
from core.pagination import StandardResultsSetPagination
from apps.users.permissions import IsAdminOrMentorOrDeptManager
from apps.questions.models import Question

from .models import Quiz, QuizQuestion
from .serializers import (
    QuizListSerializer,
    QuizDetailSerializer,
    QuizCreateSerializer,
    QuizUpdateSerializer,
    AddQuestionsSerializer,
    RemoveQuestionsSerializer,
    ReorderQuestionsSerializer,
)


class QuizListCreateView(APIView):
    """
    Quiz list and create endpoint.
    
    Requirements: 6.1, 6.4
    """
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]
    
    @extend_schema(
        summary='获取试卷列表',
        description='获取所有试卷，支持搜索和筛选',
        parameters=[
            OpenApiParameter(name='search', type=str, description='搜索试卷标题'),
            OpenApiParameter(name='created_by', type=int, description='创建者ID'),
            OpenApiParameter(name='page', type=int, description='页码'),
            OpenApiParameter(name='page_size', type=int, description='每页数量'),
        ],
        responses={200: QuizListSerializer(many=True)},
        tags=['试卷管理']
    )
    def get(self, request):
        """
        Get quiz list with pagination.
        
        Requirements: 6.4 - 导师或室经理查看试卷列表时展示所有试卷
        """
        queryset = Quiz.objects.filter(
            is_deleted=False
        ).select_related('created_by')
        
        # Search by title
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)
        
        # Filter by creator
        created_by = request.query_params.get('created_by')
        if created_by:
            queryset = queryset.filter(created_by_id=created_by)
        
        queryset = queryset.order_by('-created_at')
        
        # Apply pagination
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request)
        if page is not None:
            serializer = QuizListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        
        serializer = QuizListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @extend_schema(
        summary='创建试卷',
        description='创建新试卷（导师/室经理/管理员）',
        request=QuizCreateSerializer,
        responses={
            201: QuizDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['试卷管理']
    )
    def post(self, request):
        """
        Create a new quiz.
        
        Requirements: 6.1 - 创建试卷时存储试卷名称、描述，并记录创建者
        """
        serializer = QuizCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        quiz = serializer.save()
        
        response_serializer = QuizDetailSerializer(quiz)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)



class QuizDetailView(APIView):
    """
    Quiz detail, update, delete endpoint.
    
    Requirements: 6.5, 6.6, 6.7, 6.8
    Properties:
    - Property 14: 被引用试卷删除保护
    - Property 16: 试卷所有权编辑控制
    """
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]
    
    def get_object(self, pk):
        """Get quiz by ID."""
        try:
            return Quiz.objects.select_related('created_by').get(
                pk=pk, is_deleted=False
            )
        except Quiz.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='试卷不存在'
            )
    
    def check_edit_permission(self, request, quiz):
        """
        Check if user can edit/delete the quiz.
        
        Requirements: 6.5, 6.6, 6.7
        Property 16: 试卷所有权编辑控制
        
        - Admin can edit/delete any quiz
        - Mentor/DeptManager can only edit/delete their own quizzes
        """
        # Admin can edit/delete any quiz
        if request.user.is_admin:
            return True
        if hasattr(request.user, 'current_role') and request.user.current_role == 'ADMIN':
            return True
        
        # Others can only edit/delete their own quizzes
        return quiz.created_by_id == request.user.id
    
    @extend_schema(
        summary='获取试卷详情',
        description='获取指定试卷的详细信息，包含题目列表',
        responses={
            200: QuizDetailSerializer,
            404: OpenApiResponse(description='试卷不存在'),
        },
        tags=['试卷管理']
    )
    def get(self, request, pk):
        """Get quiz detail."""
        quiz = self.get_object(pk)
        serializer = QuizDetailSerializer(quiz)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @extend_schema(
        summary='更新试卷',
        description='更新试卷信息（仅创建者或管理员）',
        request=QuizUpdateSerializer,
        responses={
            200: QuizDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='试卷不存在'),
        },
        tags=['试卷管理']
    )
    def patch(self, request, pk):
        """
        Update quiz.
        
        Requirements: 6.5, 6.7
        Property 16: 试卷所有权编辑控制
        """
        quiz = self.get_object(pk)
        
        # Check edit permission
        if not self.check_edit_permission(request, quiz):
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有试卷创建者或管理员可以编辑此试卷'
            )
        
        serializer = QuizUpdateSerializer(
            quiz, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        quiz = serializer.save()
        
        response_serializer = QuizDetailSerializer(quiz)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
    
    @extend_schema(
        summary='删除试卷',
        description='删除试卷（仅创建者或管理员，被任务引用时禁止删除）',
        responses={
            204: OpenApiResponse(description='删除成功'),
            400: OpenApiResponse(description='试卷被任务引用，无法删除'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='试卷不存在'),
        },
        tags=['试卷管理']
    )
    def delete(self, request, pk):
        """
        Delete quiz.
        
        Requirements: 6.6, 6.7, 6.8
        Property 14: 被引用试卷删除保护
        Property 16: 试卷所有权编辑控制
        """
        quiz = self.get_object(pk)
        
        # Check edit permission
        if not self.check_edit_permission(request, quiz):
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有试卷创建者或管理员可以删除此试卷'
            )
        
        # Check if referenced by task (Property 14)
        if quiz.is_referenced_by_task():
            raise BusinessError(
                code=ErrorCodes.RESOURCE_REFERENCED,
                message='该试卷已被任务引用，无法删除'
            )
        
        # Soft delete
        quiz.soft_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class QuizAddQuestionsView(APIView):
    """
    Add questions to a quiz endpoint.
    
    Requirements: 6.2, 6.3
    """
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]
    
    def get_object(self, pk):
        """Get quiz by ID."""
        try:
            return Quiz.objects.select_related('created_by').get(
                pk=pk, is_deleted=False
            )
        except Quiz.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='试卷不存在'
            )
    
    def check_edit_permission(self, request, quiz):
        """Check if user can edit the quiz."""
        if request.user.is_admin:
            return True
        if hasattr(request.user, 'current_role') and request.user.current_role == 'ADMIN':
            return True
        return quiz.created_by_id == request.user.id
    
    @extend_schema(
        summary='向试卷添加题目',
        description='向试卷添加已有题目或新建题目（仅创建者或管理员）',
        request=AddQuestionsSerializer,
        responses={
            200: QuizDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='试卷不存在'),
        },
        tags=['试卷管理']
    )
    def post(self, request, pk):
        """
        Add questions to quiz.
        
        Requirements:
        - 6.2: 向试卷添加题目时允许从全平台题库选择已有题目或新建题目
        - 6.3: 在创建试卷时新建的题目纳入题库，题目作者为当前用户
        """
        quiz = self.get_object(pk)
        
        # Check edit permission
        if not self.check_edit_permission(request, quiz):
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有试卷创建者或管理员可以编辑此试卷'
            )
        
        serializer = AddQuestionsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        existing_question_ids = serializer.validated_data.get('existing_question_ids', [])
        new_questions_data = serializer.validated_data.get('new_questions', [])
        
        # Get existing questions that are already in the quiz
        existing_quiz_question_ids = set(
            quiz.quiz_questions.values_list('question_id', flat=True)
        )
        
        # Add existing questions
        for question_id in existing_question_ids:
            if question_id not in existing_quiz_question_ids:
                question = Question.objects.get(pk=question_id)
                quiz.add_question(question)
        
        # Create and add new questions
        for question_data in new_questions_data:
            line_type_id = question_data.pop('line_type_id', None)
            question = Question.objects.create(
                created_by=request.user,
                **question_data
            )
            # Set line_type if provided
            if line_type_id:
                from apps.knowledge.models import Tag
                line_type = Tag.objects.get(id=line_type_id, tag_type='LINE', is_active=True)
                question.set_line_type(line_type)
            quiz.add_question(question)
        
        response_serializer = QuizDetailSerializer(quiz)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class QuizRemoveQuestionsView(APIView):
    """
    Remove questions from a quiz endpoint.
    """
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]
    
    def get_object(self, pk):
        """Get quiz by ID."""
        try:
            return Quiz.objects.select_related('created_by').get(
                pk=pk, is_deleted=False
            )
        except Quiz.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='试卷不存在'
            )
    
    def check_edit_permission(self, request, quiz):
        """Check if user can edit the quiz."""
        if request.user.is_admin:
            return True
        if hasattr(request.user, 'current_role') and request.user.current_role == 'ADMIN':
            return True
        return quiz.created_by_id == request.user.id
    
    @extend_schema(
        summary='从试卷移除题目',
        description='从试卷移除指定题目（仅创建者或管理员）',
        request=RemoveQuestionsSerializer,
        responses={
            200: QuizDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='试卷不存在'),
        },
        tags=['试卷管理']
    )
    def post(self, request, pk):
        """Remove questions from quiz."""
        quiz = self.get_object(pk)
        
        # Check edit permission
        if not self.check_edit_permission(request, quiz):
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有试卷创建者或管理员可以编辑此试卷'
            )
        
        serializer = RemoveQuestionsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        question_ids = serializer.validated_data['question_ids']
        
        # Remove questions from quiz
        QuizQuestion.objects.filter(
            quiz=quiz,
            question_id__in=question_ids
        ).delete()
        
        response_serializer = QuizDetailSerializer(quiz)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class QuizReorderQuestionsView(APIView):
    """
    Reorder questions in a quiz endpoint.
    """
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]
    
    def get_object(self, pk):
        """Get quiz by ID."""
        try:
            return Quiz.objects.select_related('created_by').get(
                pk=pk, is_deleted=False
            )
        except Quiz.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='试卷不存在'
            )
    
    def check_edit_permission(self, request, quiz):
        """Check if user can edit the quiz."""
        if request.user.is_admin:
            return True
        if hasattr(request.user, 'current_role') and request.user.current_role == 'ADMIN':
            return True
        return quiz.created_by_id == request.user.id
    
    @extend_schema(
        summary='重新排序试卷题目',
        description='重新排序试卷中的题目（仅创建者或管理员）',
        request=ReorderQuestionsSerializer,
        responses={
            200: QuizDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='试卷不存在'),
        },
        tags=['试卷管理']
    )
    def post(self, request, pk):
        """Reorder questions in quiz."""
        quiz = self.get_object(pk)
        
        # Check edit permission
        if not self.check_edit_permission(request, quiz):
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有试卷创建者或管理员可以编辑此试卷'
            )
        
        serializer = ReorderQuestionsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        question_ids = serializer.validated_data['question_ids']
        
        # Reorder questions
        quiz.reorder_questions(question_ids)
        
        response_serializer = QuizDetailSerializer(quiz)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class QuizCreateFromQuestionsView(APIView):
    """
    Create a quiz from selected questions endpoint.
    
    Allows users to select multiple questions and create a quiz with them.
    """
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]
    
    @extend_schema(
        summary='从题目创建试卷',
        description='选择多个题目一键创建试卷',
        request={
            'type': 'object',
            'properties': {
                'title': {'type': 'string', 'description': '试卷名称'},
                'description': {'type': 'string', 'description': '试卷描述'},
                'question_ids': {
                    'type': 'array',
                    'items': {'type': 'integer'},
                    'description': '题目ID列表'
                }
            },
            'required': ['title', 'question_ids']
        },
        responses={
            201: QuizDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['试卷管理']
    )
    def post(self, request):
        """
        Create a quiz from selected questions.
        
        Requirements:
        - 6.1: 创建试卷时存储试卷名称、描述，并记录创建者
        - 6.2: 向试卷添加题目时允许从全平台题库选择已有题目
        """
        title = request.data.get('title')
        description = request.data.get('description', '')
        question_ids = request.data.get('question_ids', [])
        
        if not title:
            raise BusinessError(
                code=ErrorCodes.INVALID_INPUT,
                message='试卷名称不能为空'
            )
        
        if not question_ids:
            raise BusinessError(
                code=ErrorCodes.INVALID_INPUT,
                message='必须选择至少一道题目'
            )
        
        # Validate all questions exist
        existing_ids = set(
            Question.objects.filter(
                id__in=question_ids,
                is_deleted=False
            ).values_list('id', flat=True)
        )
        invalid_ids = set(question_ids) - existing_ids
        if invalid_ids:
            raise BusinessError(
                code=ErrorCodes.INVALID_INPUT,
                message=f'题目不存在: {list(invalid_ids)}'
            )
        
        # Create quiz
        quiz = Quiz.objects.create(
            title=title,
            description=description,
            created_by=request.user
        )
        
        # Add questions to quiz
        for question_id in question_ids:
            question = Question.objects.get(pk=question_id)
            quiz.add_question(question)
        
        response_serializer = QuizDetailSerializer(quiz)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
