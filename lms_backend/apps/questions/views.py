"""题目视图。"""
import uuid

from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from apps.authorization.engine import enforce
from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes
from core.pagination import StandardResultsSetPagination
from core.query_params import parse_int_query_param
from core.responses import created_response, list_response, no_content_response, success_response

from .serializers import (
    QuestionCreateSerializer,
    QuestionDetailSerializer,
    QuestionListSerializer,
    QuestionUpdateSerializer,
)
from .services import QuestionService


class QuestionListCreateView(BaseAPIView):
    """题目列表与创建。"""
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    service_class = QuestionService

    @extend_schema(
        summary='获取题目列表',
        description='获取所有题目，支持类型、标签筛选',
        parameters=[
            OpenApiParameter(name='question_type', type=str, description='题目类型'),
            OpenApiParameter(name='tag_id', type=int, description='题目标签ID'),
            OpenApiParameter(name='search', type=str, description='搜索题目内容'),
            OpenApiParameter(name='resource_uuid', type=str, description='题目资源 UUID'),
            OpenApiParameter(name='created_by', type=int, description='创建者ID'),
            OpenApiParameter(name='space_tag_id', type=int, description='space ID'),
            OpenApiParameter(name='page', type=int, description='页码'),
            OpenApiParameter(name='page_size', type=int, description='每页数量'),
        ],
        responses={200: QuestionListSerializer(many=True)},
        tags=['题库管理']
    )
    def get(self, request):
        """
        Get question list.
        """
        enforce('question.view', request, error_message='无权查看题目列表')

        # 构建过滤条件
        filters = {}
        if request.query_params.get('question_type'):
            filters['question_type'] = request.query_params.get('question_type')
        created_by_id = parse_int_query_param(
            request=request,
            name='created_by',
            minimum=1,
        )
        if created_by_id is not None:
            filters['created_by_id'] = created_by_id

        space_tag_id = parse_int_query_param(
            request=request,
            name='space_tag_id',
            minimum=1,
        )
        if space_tag_id is not None:
            filters['space_tag_id'] = space_tag_id
        tag_id = parse_int_query_param(
            request=request,
            name='tag_id',
            minimum=1,
        )
        if tag_id is not None:
            filters['tag_id'] = tag_id
        resource_uuid = request.query_params.get('resource_uuid')
        if resource_uuid:
            try:
                filters['resource_uuid'] = uuid.UUID(resource_uuid)
            except (TypeError, ValueError):
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='参数 resource_uuid 必须是合法 UUID',
                )

        search = request.query_params.get('search')

        queryset = self.service.get_queryset(
            filters=filters if filters else None,
            search=search,
            ordering='-created_at'
        )

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        if page is not None:
            serializer = QuestionListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = QuestionListSerializer(queryset, many=True)
        return list_response(serializer.data)

    @extend_schema(
        summary='创建题目',
        description='创建新题目（导师/室经理/管理员）',
        request=QuestionCreateSerializer,
        responses={
            201: QuestionDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['题库管理']
    )
    def post(self, request):
        """
        Create a new question.
        """
        enforce('question.create', request, error_message='无权创建题目')
        serializer = QuestionCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        question = self.service.create(data=serializer.validated_data)
        response_serializer = QuestionDetailSerializer(question)
        return created_response(response_serializer.data)


class QuestionDetailView(BaseAPIView):
    """题目详情、更新、删除。"""
    permission_classes = [IsAuthenticated]
    service_class = QuestionService

    @extend_schema(
        summary='获取题目详情',
        description='获取指定题目的详细信息',
        responses={
            200: QuestionDetailSerializer,
            404: OpenApiResponse(description='题目不存在'),
        },
        tags=['题库管理']
    )
    def get(self, request, pk):
        """Get question detail."""
        enforce('question.view', request, error_message='无权查看题目详情')
        question = self.service.get_by_id(pk)
        serializer = QuestionDetailSerializer(question)
        return success_response(serializer.data)

    @extend_schema(
        summary='更新题目',
        description='更新题目信息',
        request=QuestionUpdateSerializer,
        responses={
            200: QuestionDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='题目不存在'),
        },
        tags=['题库管理']
    )
    def patch(self, request, pk):
        """更新题目。"""
        question = self.service.get_by_id(pk)
        serializer = QuestionUpdateSerializer(
            instance=question,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)

        updated_question = self.service.update(
            pk=pk,
            data=serializer.validated_data
        )
        response_serializer = QuestionDetailSerializer(updated_question)
        return success_response(response_serializer.data)

    @extend_schema(
        summary='删除题目',
        description='删除题目，被试卷引用时禁止删除',
        responses={
            200: OpenApiResponse(description='删除成功'),
            400: OpenApiResponse(description='题目被试卷引用，无法删除'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='题目不存在'),
        },
        tags=['题库管理']
    )
    def delete(self, request, pk):
        """删除题目。"""
        self.service.delete(pk=pk)
        return no_content_response()
