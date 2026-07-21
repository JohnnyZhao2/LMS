"""试卷视图。"""

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
        tags=['试卷管理'],
    )
    def get(self, request):
        enforce('quiz.view', request, error_message='无权查看试卷列表')
        filters = {}
        created_by_id = parse_int_query_param(request=request, name='created_by', minimum=1)
        if created_by_id is not None:
            filters['created_by_id'] = created_by_id
        if request.query_params.get('quiz_type'):
            filters['quiz_type'] = request.query_params.get('quiz_type')
        search = request.query_params.get('search')
        quiz_list = self.service.get_list(filters=filters, search=search, ordering='-updated_at')
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(quiz_list, request)
        serializer = QuizListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        summary='创建试卷',
        description='创建新试卷，保存时以整份题目列表重建当前试卷',
        request=QuizCreateSerializer,
        responses={
            201: QuizDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['试卷管理'],
    )
    def post(self, request):
        enforce('quiz.create', request, error_message='无权创建试卷')
        serializer = QuizCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        questions = validated_data.pop('questions', [])
        quiz = self.service.create(data=validated_data, questions=questions)
        return created_response(QuizDetailSerializer(quiz).data)


class QuizDetailView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = QuizService

    @extend_schema(
        summary='获取试卷详情',
        description='获取指定试卷的详细信息，包含当前试卷题目副本',
        responses={
            200: QuizDetailSerializer,
            404: OpenApiResponse(description='试卷不存在'),
        },
        tags=['试卷管理'],
    )
    def get(self, request, pk):
        enforce('quiz.view', request, error_message='无权查看试卷详情')
        quiz = self.service.get_by_id(pk)
        return success_response(QuizDetailSerializer(quiz).data)

    @extend_schema(
        summary='更新试卷',
        description='更新试卷信息，保存时以整份题目列表重建当前试卷',
        request=QuizUpdateSerializer,
        responses={
            200: QuizDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='试卷不存在'),
        },
        tags=['试卷管理'],
    )
    def patch(self, request, pk):
        enforce('quiz.update', request, error_message='无权更新试卷')
        quiz = self.service.get_by_id(pk)
        serializer = QuizUpdateSerializer(instance=quiz, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        questions = validated_data.pop('questions', None)
        quiz = self.service.update(pk=pk, data=validated_data, questions=questions)
        return success_response(QuizDetailSerializer(quiz).data)

    @extend_schema(
        summary='删除试卷',
        description='删除当前试卷；已进入任务执行的试卷快照会保留',
        responses={
            200: OpenApiResponse(description='删除成功'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='试卷不存在'),
        },
        tags=['试卷管理'],
    )
    def delete(self, request, pk):
        enforce('quiz.delete', request, error_message='无权删除试卷')
        self.service.delete(pk)
        return no_content_response()
