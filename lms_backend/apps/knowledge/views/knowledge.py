"""
Knowledge document management views.
Implements:
- Knowledge CRUD
- Student knowledge list
- View count increment
"""
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import serializers as drf_serializers
from rest_framework.permissions import IsAuthenticated

from apps.authorization.engine import get_engine
from apps.knowledge.serializers import (
    KnowledgeBulkDeleteSerializer,
    KnowledgeBulkImportSerializer,
    KnowledgeBulkUpdateSerializer,
    KnowledgeCreateSerializer,
    KnowledgeDetailSerializer,
    KnowledgeListSerializer,
    KnowledgeUpdateSerializer,
)
from apps.knowledge.selectors import get_knowledge_queryset, knowledge_base_queryset
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


class ViewCountResponseSerializer(drf_serializers.Serializer):
    """Serializer for view count response."""
    view_count = drf_serializers.IntegerField()


def _build_knowledge_filters(request):
    """构建并校验知识筛选参数。"""
    filters = {}

    space_tag_id = parse_int_query_param(
        request=request,
        name='space_tag_id',
        minimum=1,
    )
    if space_tag_id is not None:
        filters['space_tag_id'] = space_tag_id

    tag_ids_raw = (request.query_params.get('tag_ids') or '').strip()
    if tag_ids_raw:
        parsed_ids = []
        for part in tag_ids_raw.split(','):
            part = part.strip()
            if not part:
                continue
            if not part.isdigit() or int(part) < 1:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='无效的 tag_ids 参数',
                )
            parsed_ids.append(int(part))
        if parsed_ids:
            filters['tag_ids'] = list(dict.fromkeys(parsed_ids))
    else:
        tag_id = parse_int_query_param(
            request=request,
            name='tag_id',
            minimum=1,
        )
        if tag_id is not None:
            filters['tag_ids'] = [tag_id]

    pinned = (request.query_params.get('pinned') or '').strip().lower()
    if pinned in ('true', '1'):
        filters['pinned'] = True

    search = request.query_params.get('search')
    return filters, search


def _group_knowledge_id_rows(id_doc_rows):
    """基于轻量的 (id, doc_key, section) 序列有序归组，同文档按 section 拆卡，保持首次出现顺序。"""
    groups: list[list[int]] = []
    by_group_key: dict[tuple[str, str], list[int]] = {}
    for knowledge_id, doc_key, section in id_doc_rows:
        if not doc_key:
            groups.append([knowledge_id])
            continue
        group_key = (doc_key, (section or '').strip())
        bucket = by_group_key.get(group_key)
        if bucket is None:
            bucket = []
            by_group_key[group_key] = bucket
            groups.append(bucket)
        bucket.append(knowledge_id)
    return groups


class KnowledgeListCreateView(BaseAPIView):
    """
    Knowledge list and create endpoint.
    """
    permission_classes = [IsAuthenticated]
    service_class = KnowledgeService

    def _get_knowledge_list(self, request):
        """共享的知识列表获取逻辑"""
        filters, search = _build_knowledge_filters(request)

        knowledge_queryset = get_knowledge_queryset(
            filters=filters,
            search=search
        )

        group_by_doc = (request.query_params.get('group_by_doc') or '').strip().lower() in ('true', '1')
        paginator = StandardResultsSetPagination()

        if group_by_doc and not filters.get('pinned'):
            # shortcut: 万篇以内直接拉轻量 (id, doc_key, section) 在内存归组分页；超万篇时再改用窗口函数分组分页
            id_doc_rows = list(knowledge_queryset.values_list('id', 'doc_key', 'section'))
            id_groups = _group_knowledge_id_rows(id_doc_rows)
            page_id_groups = paginator.paginate_queryset(id_groups, request)
            page_ids = [kid for group in page_id_groups for kid in group]
            items_by_id = {
                obj.id: obj
                for obj in knowledge_base_queryset().filter(id__in=page_ids)
            }
            serialized = []
            for id_group in page_id_groups:
                group_objs = [items_by_id[kid] for kid in id_group if kid in items_by_id]
                if not group_objs:
                    continue
                lead_data = KnowledgeListSerializer(group_objs[0]).data
                if len(group_objs) > 1:
                    lead_data['grouped_items'] = KnowledgeListSerializer(group_objs, many=True).data
                serialized.append(lead_data)
            response = paginator.get_paginated_response(serialized)
            response.data['data']['total_knowledge_count'] = len(id_doc_rows)
            return response

        page = paginator.paginate_queryset(knowledge_queryset, request)
        serializer = KnowledgeListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
    @extend_schema(
        summary='获取知识文档列表',
        description='''获取知识文档列表，支持按 space 和知识标签筛选。
所有用户只能看到当前版本的知识。
**注意：** 保存只会更新当前知识，不会生成历史版本。
''',
        parameters=[
            OpenApiParameter(name='space_tag_id', type=int, description='space ID'),
            OpenApiParameter(name='tag_id', type=int, description='知识标签ID'),
            OpenApiParameter(name='search', type=str, description='搜索标题或内容'),
            OpenApiParameter(name='page', type=int, description='页码（默认1）'),
            OpenApiParameter(name='page_size', type=int, description='每页数量（默认20）'),
        ],
        responses={200: KnowledgeListSerializer(many=True)},
        tags=['知识管理']
    )
    def get(self, request):
        return self._get_knowledge_list(request)
    @extend_schema(
        summary='创建知识文档',
        description='创建新的知识文档（管理员或室经理）',
        request=KnowledgeCreateSerializer,
        responses={
            201: KnowledgeDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['知识管理']
    )
    def post(self, request):
        get_engine(request).enforce('knowledge.add_knowledge', error_message='无权创建知识文档')
        # 3. 反序列化输入
        serializer = KnowledgeCreateSerializer(
            data=request.data,
            context={'request': request}
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
        get_engine(request).enforce('knowledge.add_knowledge', error_message='无权导入知识文档')
        serializer = KnowledgeBulkImportSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        return success_response(self.service.bulk_import(items=serializer.validated_data['items']))


class KnowledgeBulkDeleteView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = KnowledgeService

    @extend_schema(summary='批量删除知识文档', request=KnowledgeBulkDeleteSerializer, tags=['知识管理'])
    def post(self, request):
        get_engine(request).enforce('knowledge.delete_knowledge', error_message='无权删除知识文档')
        serializer = KnowledgeBulkDeleteSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        return success_response(
            self.service.bulk_delete(
                ids=serializer.validated_data.get('ids'),
                items=serializer.validated_data.get('items'),
            )
        )


class KnowledgeBulkUpdateView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = KnowledgeService

    @extend_schema(summary='批量更新知识文档', request=KnowledgeBulkUpdateSerializer, tags=['知识管理'])
    def post(self, request):
        get_engine(request).enforce('knowledge.change_knowledge', error_message='无权更新知识文档')
        serializer = KnowledgeBulkUpdateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        return success_response(self.service.bulk_update(**serializer.validated_data))


class KnowledgeDetailView(BaseAPIView):
    """
    Knowledge detail, update, delete endpoint.
    """
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
        tags=['知识管理']
    )
    def get(self, request, pk):
        knowledge = self.service.get_by_id(pk)
        # 2. 序列化输出
        serializer = KnowledgeDetailSerializer(knowledge)
        return success_response(serializer.data)
    @extend_schema(
        summary='更新知识文档',
        description='更新知识文档内容（管理员或室经理）',
        request=KnowledgeUpdateSerializer,
        responses={
            200: KnowledgeDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='知识文档不存在'),
        },
        tags=['知识管理']
    )
    def patch(self, request, pk):
        get_engine(request).enforce('knowledge.change_knowledge', error_message='无权更新知识文档')
        # 2. 反序列化输入
        serializer = KnowledgeUpdateSerializer(
            data=request.data, partial=True,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        knowledge = self.service.update(
            pk=pk,
            data=serializer.validated_data
        )
        # 4. 序列化输出
        response_serializer = KnowledgeDetailSerializer(knowledge)
        return success_response(response_serializer.data)
    @extend_schema(
        summary='删除知识文档',
        description='删除知识文档（管理员或室经理，被任务引用时禁止删除）',
        responses={
            200: OpenApiResponse(description='删除成功'),
            400: OpenApiResponse(description='知识文档被任务引用，无法删除'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='知识文档不存在'),
        },
        tags=['知识管理']
    )
    def delete(self, request, pk):
        get_engine(request).enforce('knowledge.delete_knowledge', error_message='无权删除知识文档')
        self.service.delete(pk)
        return no_content_response()
class StudentTaskKnowledgeDetailView(BaseAPIView):
    """学员任务知识详情端点 - 允许访问任务锁定版本"""
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
        tags=['知识管理']
    )
    def get(self, request, task_knowledge_id):
        task_knowledge = TaskKnowledge.objects.select_related('task', 'knowledge').filter(
            id=task_knowledge_id
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
        if assignment:
            KnowledgeLearningProgress.objects.get_or_create(
                assignment=assignment,
                task_knowledge=task_knowledge,
                defaults={'is_completed': False, 'started_at': timezone.now()},
            )
        elif not get_engine(request).has_permission('knowledge.view_knowledge'):
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='无权查看任务知识详情',
            )

        knowledge = task_knowledge.knowledge
        serializer = KnowledgeDetailSerializer(knowledge)
        return success_response(serializer.data)


class KnowledgeIncrementViewCountView(BaseAPIView):
    """Increment knowledge view count endpoint."""
    permission_classes = [IsAuthenticated]
    service_class = KnowledgeService

    @extend_schema(
        summary='增加知识阅读次数',
        description='记录知识文档被阅读',
        responses={
            200: ViewCountResponseSerializer,
            404: OpenApiResponse(description='知识文档不存在'),
        },
        tags=['知识管理']
    )
    def post(self, request, pk):
        view_count = self.service.increment_view_count(pk)
        return success_response({'view_count': view_count})
