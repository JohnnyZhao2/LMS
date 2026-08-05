"""知识文档接口：CRUD、任务快照详情、阅读计数。"""

from __future__ import annotations

from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import serializers as drf_serializers
from rest_framework.permissions import IsAuthenticated

from apps.authorization.engine import enforce
from apps.knowledge.serializers import (
    KnowledgeBulkDeleteSerializer,
    KnowledgeBulkImportSerializer,
    KnowledgeCreateSerializer,
    KnowledgeDetailSerializer,
    KnowledgeListSerializer,
    KnowledgeUpdateSerializer,
)
from apps.knowledge.selectors import get_knowledge_queryset
from apps.knowledge.services import KnowledgeService
from apps.tasks.models import KnowledgeLearningProgress, TaskAssignment, TaskKnowledge
from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes
from core.pagination import StandardResultsSetPagination
from core.query_params import parse_int_query_param
from core.responses import (
    created_response,
    no_content_response,
    success_response,
)

from .models import Knowledge
from .selectors import get_knowledge_queryset
from .serializers import (
    KnowledgeDetailSerializer,
    KnowledgeListSerializer,
    KnowledgeWriteSerializer,
)
from .services import KnowledgeService


class ViewCountResponseSerializer(drf_serializers.Serializer):
    view_count = drf_serializers.IntegerField()


def _build_knowledge_filters(request):
    filters = {}

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

    search = request.query_params.get('search')
    return filters, search


def _enforce_knowledge_view(request, *, error_message: str = '无权查看知识') -> None:
    """capability gate：学员工作台放行；管理者要求 knowledge.view。"""
    if is_student_workspace(request):
        enforce_student_workspace(request, error_message=error_message)
        return
    enforce('knowledge.view', request, error_message=error_message)


def _get_viewable_knowledge(service: KnowledgeService, request, pk: int, *, error_message: str) -> Knowledge:
    """
    获取可查看的当前知识。
    学员工作台：知识中心为全员公共库，不按 owner 做 scope/resource 过滤。
    管理者：capability + resource owner gate。
    """
    _enforce_knowledge_view(request, error_message=error_message)
    knowledge = service.get_by_id(pk)
    if not is_student_workspace(request):
        enforce('knowledge.view', request, resource=knowledge, error_message=error_message)
    return knowledge


class KnowledgeListCreateView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = KnowledgeService

    def _get_knowledge_list(self, request):
        filters, search = _build_knowledge_filters(request)

        knowledge_queryset = get_knowledge_queryset(
            filters=filters,
            search=search,
        )
        # 学员工作台：公共知识库，不做 owner scope；管理者按 knowledge.view scope 过滤
        if not is_student_workspace(request):
            knowledge_queryset = scope_filter(
                'knowledge.view',
                request,
                base_queryset=knowledge_queryset,
            )

        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(knowledge_queryset, request)
        serializer = KnowledgeListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        summary='获取知识文档列表',
        description='''获取知识文档列表，支持按 space 和知识标签筛选。
所有用户只能看到当前版本的知识。
学员工作台为全员公共知识库；任务内锁定快照请走任务知识详情接口。
**注意：** 保存只会更新当前知识，不会生成历史版本。
''',
        parameters=[
            OpenApiParameter(name='space_tag_id', type=int, description='space ID'),
            OpenApiParameter(name='tag_id', type=int, description='知识标签ID'),
            OpenApiParameter(name='search', type=str, description='搜索标题、内容、space 或标签，支持空格分词与模糊匹配'),
            OpenApiParameter(name='page', type=int, description='页码（默认1）'),
            OpenApiParameter(name='page_size', type=int, description='每页数量（默认20）'),
        ],
        responses={200: KnowledgeListSerializer(many=True)},
        tags=['知识管理'],
    )
    def get(self, request):
        _enforce_knowledge_view(request)
        return self._get_knowledge_list(request)

    @extend_schema(
        summary='创建知识文档',
        description='创建新的知识文档',
        request=KnowledgeWriteSerializer,
        responses={
            201: KnowledgeDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['知识管理'],
    )
    def post(self, request):
        # capability gate
        enforce('knowledge.create', request, error_message='无权创建知识文档')
        serializer = KnowledgeWriteSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        knowledge = self.service.create(
            data=serializer.validated_data
        )
        # 5. 序列化输出
        response_serializer = KnowledgeDetailSerializer(knowledge)
        return created_response(response_serializer.data)
class KnowledgeBulkImportView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = KnowledgeService

    @extend_schema(summary='批量导入知识文档', request=KnowledgeBulkImportSerializer, tags=['知识管理'])
    def post(self, request):
        enforce('knowledge.create', request, error_message='无权导入知识文档')
        serializer = KnowledgeBulkImportSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        return success_response(self.service.bulk_import(items=serializer.validated_data['items']))


class KnowledgeBulkDeleteView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = KnowledgeService

    @extend_schema(summary='批量删除知识文档', request=KnowledgeBulkDeleteSerializer, tags=['知识管理'])
    def post(self, request):
        enforce('knowledge.delete', request, error_message='无权删除知识文档')
        serializer = KnowledgeBulkDeleteSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        return success_response(self.service.bulk_delete(items=serializer.validated_data['items']))


class KnowledgeDetailView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = KnowledgeService

    @extend_schema(
        summary='获取知识文档详情',
        description='获取指定知识文档的详细信息',
        responses={
            200: KnowledgeDetailSerializer,
            403: OpenApiResponse(description='无权访问该知识文档'),
            404: OpenApiResponse(description='知识文档不存在'),
        },
        tags=['知识管理'],
    )
    def get(self, request, pk):
        knowledge = _get_viewable_knowledge(
            self.service,
            request,
            pk,
            error_message='无权访问该知识文档',
        )
        return success_response(KnowledgeDetailSerializer(knowledge).data)

    @extend_schema(
        summary='更新知识文档',
        description='更新知识文档内容',
        request=KnowledgeWriteSerializer,
        responses={
            200: KnowledgeDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='知识文档不存在'),
        },
        tags=['知识管理'],
    )
    def patch(self, request, pk):
        # capability gate；owner gate 在 Service.update
        enforce('knowledge.update', request, error_message='无权更新知识文档')
        serializer = KnowledgeWriteSerializer(
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        knowledge = self.service.update(pk=pk, data=serializer.validated_data)
        return success_response(KnowledgeDetailSerializer(knowledge).data)

    @extend_schema(
        summary='删除知识文档',
        description='删除当前知识；任务已锁定快照继续保留',
        responses={
            204: OpenApiResponse(description='删除成功'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='知识文档不存在'),
        },
        tags=['知识管理'],
    )
    def delete(self, request, pk):
        # capability gate；owner gate 在 Service.delete
        enforce('knowledge.delete', request, error_message='无权删除知识文档')
        self.service.delete(pk)
        return no_content_response()


class StudentTaskKnowledgeDetailView(BaseAPIView):
    """学员任务知识详情 — 仅已分配任务可访问锁定快照。"""

    permission_classes = [IsAuthenticated]
    service_class = KnowledgeService

    @extend_schema(
        summary='获取任务内知识详情',
        description='根据任务知识关联ID获取知识详情，返回任务锁定版本。',
        responses={
            200: KnowledgeDetailSerializer,
            403: OpenApiResponse(description='无权访问'),
            404: OpenApiResponse(description='知识文档不存在'),
        },
        tags=['知识管理'],
    )
    def get(self, request, task_knowledge_id):
        enforce_student_workspace(request, error_message='无权查看任务知识详情')
        task_knowledge = TaskKnowledge.objects.select_related(
            'task',
            'knowledge',
            'knowledge__source_knowledge',
            'knowledge__source_knowledge__created_by',
            'knowledge__source_knowledge__updated_by',
        ).filter(
            id=task_knowledge_id,
        ).first()
        if not task_knowledge:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='任务知识不存在',
            )

        assignment = TaskAssignment.objects.filter(
            task_id=task_knowledge.task_id,
            assignee_id=request.user.id,
        ).first()
        if not assignment:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='无权访问该任务知识',
            )

        KnowledgeLearningProgress.objects.get_or_create(
            assignment=assignment,
            task_knowledge=task_knowledge,
            defaults={'is_completed': False, 'started_at': timezone.now()},
        )
        return success_response(KnowledgeDetailSerializer(task_knowledge.knowledge).data)


class KnowledgeIncrementViewCountView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = KnowledgeService

    @extend_schema(
        summary='增加知识阅读次数',
        description='记录知识文档被阅读',
        responses={
            200: ViewCountResponseSerializer,
            404: OpenApiResponse(description='知识文档不存在'),
        },
        tags=['知识管理'],
    )
    def post(self, request, pk):
        _get_viewable_knowledge(
            self.service,
            request,
            pk,
            error_message='无权记录知识阅读',
        )
        view_count = self.service.increment_view_count(pk)
        return success_response({'view_count': view_count})
