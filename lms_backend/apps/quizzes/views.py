"""
试卷视图
只处理 HTTP 请求/响应，所有业务逻辑在 Service 层。
"""
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from apps.authorization.engine import enforce
from core.base_view import BaseAPIView
from core.pagination import StandardResultsSetPagination
from core.query_params import parse_int_query_param
from core.responses import created_response, no_content_response, success_response

from .serializers import (
    QuizCreateSerializer,
    QuizDetailSerializer,
    QuizListSerializer,
    QuizUpdateSerializer,
)
from .services import QuizService


class QuizListCreateView(BaseAPIView):
    """
    试卷列表和创建
    """
    permission_classes = [IsAuthenticated]
    service_class = QuizService

    @extend_schema(
        summary='获取试卷列表',
        description='获取所有试卷，支持搜索和筛选',
        parameters=[
            OpenApiParameter(name='search', type=str, description='搜索试卷标题'),
            OpenApiParameter(name='created_by', type=int, description='创建者ID'),
            OpenApiParameter(name='quiz_type', type=str, description='试卷类型: EXAM/PRACTICE'),
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
        enforce('quiz.view', request, error_message='无权查看试卷列表')
        # 1. 获取查询参数
        filters = {}
        created_by_id = parse_int_query_param(
            request=request,
            name='created_by',
            minimum=1,
        )
        if created_by_id is not None:
            filters['created_by_id'] = created_by_id
        if request.query_params.get('quiz_type'):
            filters['quiz_type'] = request.query_params.get('quiz_type')
        search = request.query_params.get('search')
        
        # 2. 调用 Service
        quiz_list = self.service.get_list(
            filters=filters,
            search=search,
            ordering='-updated_at'
        )
        
        # 3. 分页
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(quiz_list, request)
        serializer = QuizListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        summary='创建试卷',
        description='创建新试卷（导师/室经理/管理员），题目绑定统一使用 question_versions',
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
        enforce('quiz.create', request, error_message='无权创建试卷')
        # 1. 反序列化输入
        serializer = QuizCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        # 2. 提取数据
        validated_data = serializer.validated_data
        question_versions = validated_data.pop('question_versions', [])

        # 3. 调用 Service
        quiz = self.service.create(
            data=validated_data,
            question_versions=question_versions,
        )
        
        # 4. 序列化输出
        output = QuizDetailSerializer(quiz)
        return created_response(output.data)


class QuizDetailView(BaseAPIView):
    """
    试卷详情、更新、删除
    Properties:
    - Property 14: 被引用试卷删除保护
    - Property 16: 试卷所有权编辑控制
    """
    permission_classes = [IsAuthenticated]
    service_class = QuizService

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
        enforce('quiz.view', request, error_message='无权查看试卷详情')
        quiz = self.service.get_by_id(pk)
        serializer = QuizDetailSerializer(quiz)
        return success_response(serializer.data)

    @extend_schema(
        summary='更新试卷',
        description='更新试卷信息（仅创建者或管理员），题目绑定统一使用 question_versions',
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
        enforce('quiz.update', request, error_message='无权更新试卷')
        quiz = self.service.get_by_id(pk)

        # 1. 反序列化输入
        serializer = QuizUpdateSerializer(instance=quiz, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        # 2. 提取数据
        validated_data = serializer.validated_data
        question_versions = validated_data.pop('question_versions', None)

        # 3. 调用 Service
        quiz = self.service.update(
            pk=pk,
            data=validated_data,
            question_versions=question_versions,
        )

        # 4. 序列化输出
        output = QuizDetailSerializer(quiz)
        return success_response(output.data)

    @extend_schema(
        summary='删除试卷',
        description='删除试卷（仅创建者或管理员，被任务引用时禁止删除）',
        responses={
            200: OpenApiResponse(description='删除成功'),
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
        enforce('quiz.delete', request, error_message='无权删除试卷')
        self.service.delete(pk)
        return no_content_response()
