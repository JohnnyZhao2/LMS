"""
试卷视图
只处理 HTTP 请求/响应，所有业务逻辑在 Service 层。
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter
from core.exceptions import BusinessError
from core.pagination import StandardResultsSetPagination
from core.mixins import BusinessErrorHandlerMixin
from apps.users.permissions import IsAdminOrMentorOrDeptManager
from .services import QuizService
from .serializers import (
    QuizListSerializer,
    QuizDetailSerializer,
    QuizCreateSerializer,
    QuizUpdateSerializer,
    AddQuestionsSerializer,
    RemoveQuestionsSerializer,
)
class QuizListCreateView(BusinessErrorHandlerMixin, APIView):
    """
    试卷列表和创建
    """
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = QuizService()
    @extend_schema(
        summary='获取试卷列表',
        description='获取所有试卷，支持搜索和筛选',
        parameters=[
            OpenApiParameter(name='search', type=str, description='搜索试卷标题'),
            OpenApiParameter(name='created_by', type=int, description='创建者ID'),
            OpenApiParameter(name='status', type=str, description='状态（DRAFT/PUBLISHED）'),
            OpenApiParameter(name='page', type=int, description='页码'),
            OpenApiParameter(name='page_size', type=int, description='每页数量'),
        ],
        responses={200: QuizListSerializer(many=True)},
        tags=['试卷管理']
    )
    def get(self, request):
        """
        获取试卷列表
        """
        # 1. 获取查询参数
        filters = {}
        if request.query_params.get('created_by'):
            filters['created_by_id'] = int(request.query_params.get('created_by'))
        if request.query_params.get('status'):
            filters['status'] = request.query_params.get('status')
        search = request.query_params.get('search')
        # 2. 调用 Service
        try:
            quiz_list = self.service.get_list(
                filters=filters,
                search=search,
                ordering='-created_at'
            )
        except BusinessError as e:
            return self.handle_business_error(e)
        # 3. 分页
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(quiz_list, request)
        if page is not None:
            serializer = QuizListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        # 4. 序列化输出
        serializer = QuizListSerializer(quiz_list, many=True)
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
        创建试卷
        """
        # 1. 反序列化输入
        serializer = QuizCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        # 2. 提取数据
        validated_data = serializer.validated_data
        existing_question_ids = validated_data.pop('existing_question_ids', [])
        new_questions_data = validated_data.pop('new_questions', [])
        # 3. 调用 Service
        try:
            quiz = self.service.create(
                data=validated_data,
                user=request.user,
                existing_question_ids=existing_question_ids,
                new_questions_data=new_questions_data
            )
        except BusinessError as e:
            return self.handle_business_error(e)
        # 4. 序列化输出
        output = QuizDetailSerializer(quiz)
        return Response(output.data, status=status.HTTP_201_CREATED)
class QuizDetailView(BusinessErrorHandlerMixin, APIView):
    """
    试卷详情、更新、删除
    Properties:
    - Property 14: 被引用试卷删除保护
    - Property 16: 试卷所有权编辑控制
    """
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = QuizService()
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
        """获取试卷详情"""
        try:
            quiz = self.service.get_by_id(pk)
        except BusinessError as e:
            return self.handle_business_error(e)
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
        更新试卷
        Property 16: 试卷所有权编辑控制
        """
        # 1. 反序列化输入
        serializer = QuizUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        # 2. 提取数据
        validated_data = serializer.validated_data
        question_ids = validated_data.pop('existing_question_ids', None)
        # 3. 调用 Service
        try:
            quiz = self.service.update(
                pk=pk,
                data=validated_data,
                user=request.user,
                question_ids=question_ids
            )
        except BusinessError as e:
            return self.handle_business_error(e)
        # 4. 序列化输出
        output = QuizDetailSerializer(quiz)
        return Response(output.data, status=status.HTTP_200_OK)
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
        删除试卷
        Property 14: 被引用试卷删除保护
        Property 16: 试卷所有权编辑控制
        """
        try:
            self.service.delete(pk, request.user)
        except BusinessError as e:
            return self.handle_business_error(e)
        return Response(status=status.HTTP_204_NO_CONTENT)
class QuizAddQuestionsView(BusinessErrorHandlerMixin, APIView):
    """
    向试卷添加题目
    """
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = QuizService()
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
        向试卷添加题目
        """
        # 1. 反序列化输入
        serializer = AddQuestionsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # 2. 提取数据
        validated_data = serializer.validated_data
        existing_question_ids = validated_data.get('existing_question_ids', [])
        new_questions_data = validated_data.get('new_questions', [])
        # 3. 调用 Service
        try:
            quiz = self.service.add_questions(
                pk=pk,
                user=request.user,
                existing_question_ids=existing_question_ids,
                new_questions_data=new_questions_data
            )
        except BusinessError as e:
            return self.handle_business_error(e)
        # 4. 序列化输出
        output = QuizDetailSerializer(quiz)
        return Response(output.data, status=status.HTTP_200_OK)
class QuizRemoveQuestionsView(BusinessErrorHandlerMixin, APIView):
    """
    从试卷移除题目
    """
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = QuizService()
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
        """从试卷移除题目"""
        # 1. 反序列化输入
        serializer = RemoveQuestionsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # 2. 提取数据
        question_ids = serializer.validated_data['question_ids']
        # 3. 调用 Service
        try:
            quiz = self.service.remove_questions(
                pk=pk,
                user=request.user,
                question_ids=question_ids
            )
        except BusinessError as e:
            return self.handle_business_error(e)
        # 4. 序列化输出
        output = QuizDetailSerializer(quiz)
        return Response(output.data, status=status.HTTP_200_OK)
