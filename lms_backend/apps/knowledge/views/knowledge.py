"""
Knowledge document management views.
Implements:
- Knowledge CRUD
- Knowledge stats
- Student knowledge list
- View count increment
"""
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import serializers as drf_serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.utils.html import strip_tags

from apps.authorization.services import AuthorizationService
from apps.knowledge.serializers import (
    KnowledgeCreateSerializer,
    KnowledgeDetailSerializer,
    KnowledgeListSerializer,
    KnowledgeStatsSerializer,
    KnowledgeUpdateSerializer,
)
from apps.knowledge.services import KnowledgeService
from apps.tasks.models import TaskAssignment, TaskKnowledge
from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes, get_status_code_for_error
from core.pagination import StandardResultsSetPagination
from core.query_params import parse_int_query_param
from core.responses import (
    created_response,
    error_response,
    list_response,
    no_content_response,
    success_response,
)


class ViewCountResponseSerializer(drf_serializers.Serializer):
    """Serializer for view count response."""
    view_count = drf_serializers.IntegerField()


def _enforce_knowledge_view_permission(request, error_message: str = '无权访问知识内容') -> None:
    authorization_service = AuthorizationService(request)
    if authorization_service.can('knowledge.view'):
        return
    raise BusinessError(
        code=ErrorCodes.PERMISSION_DENIED,
        message=error_message,
    )


def _enforce_knowledge_action_permission(request, permission_code: str, error_message: str) -> None:
    AuthorizationService(request).enforce(permission_code, error_message=error_message)


def _build_knowledge_filters(request):
    """构建并校验知识筛选参数。"""
    filters = {}

    line_tag_id = parse_int_query_param(
        request=request,
        name='line_tag_id',
        minimum=1,
    )
    if line_tag_id is not None:
        filters['line_tag_id'] = line_tag_id

    tag_id = parse_int_query_param(
        request=request,
        name='tag_id',
        minimum=1,
    )
    if tag_id is not None:
        filters['tag_id'] = tag_id

    search = request.query_params.get('search')
    return filters, search


def _handle_business_error(error: BusinessError):
    """统一业务异常响应映射。"""
    return error_response(
        code=error.code,
        message=error.message,
        details=error.details,
        status_code=get_status_code_for_error(error.code),
    )


class KnowledgeListCreateView(BaseAPIView):
    """
    Knowledge list and create endpoint.
    """
    permission_classes = [IsAuthenticated]
    service_class = KnowledgeService

    def _get_knowledge_list(self, request):
        """共享的知识列表获取逻辑"""
        filters, search = _build_knowledge_filters(request)

        knowledge_list = self.service.get_all_with_filters(
            filters=filters,
            search=search
        )

        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(knowledge_list, request)
        if page is not None:
            serializer = KnowledgeListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = KnowledgeListSerializer(knowledge_list, many=True)
        return list_response(serializer.data)
    @extend_schema(
        summary='获取知识文档列表',
        description='''获取知识文档列表，支持条线类型和知识标签筛选。
所有用户只能看到当前版本的知识。
**注意：** 保存即发布，所有显示的知识都是当前版本（is_current=True）。
''',
        parameters=[
            OpenApiParameter(name='line_tag_id', type=int, description='条线标签ID'),
            OpenApiParameter(name='tag_id', type=int, description='知识标签ID'),
            OpenApiParameter(name='search', type=str, description='搜索标题或内容'),
            OpenApiParameter(name='page', type=int, description='页码（默认1）'),
            OpenApiParameter(name='page_size', type=int, description='每页数量（默认20）'),
        ],
        responses={200: KnowledgeListSerializer(many=True)},
        tags=['知识管理']
    )
    def get(self, request):
        _enforce_knowledge_view_permission(request, '无权查看知识列表')
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
        _enforce_knowledge_action_permission(request, 'knowledge.create', '无权创建知识文档')
        # 3. 反序列化输入
        serializer = KnowledgeCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        # 4. 调用 Service
        try:
            knowledge = self.service.create(
                data=serializer.validated_data
            )
        except BusinessError as e:
            return _handle_business_error(e)
        # 5. 序列化输出
        response_serializer = KnowledgeDetailSerializer(knowledge)
        return created_response(response_serializer.data)
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
        _enforce_knowledge_view_permission(request, '无权查看知识详情')
        # 1. 调用 Service
        try:
            knowledge = self.service.get_by_id(pk)
        except BusinessError as e:
            return _handle_business_error(e)
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
        _enforce_knowledge_action_permission(request, 'knowledge.update', '无权更新知识文档')
        # 2. 获取对象（用于序列化校验的 instance）
        try:
            knowledge = self.service.get_by_id(pk)
        except BusinessError as e:
            return _handle_business_error(e)
        # 3. 反序列化输入
        serializer = KnowledgeUpdateSerializer(
            instance=knowledge,
            data=request.data, partial=True,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        # 4. 调用 Service
        try:
            knowledge = self.service.update(
                pk=pk,
                data=serializer.validated_data
            )
        except BusinessError as e:
            return _handle_business_error(e)
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
        _enforce_knowledge_action_permission(request, 'knowledge.delete', '无权删除知识文档')
        # 2. 调用 Service
        try:
            self.service.delete(pk)
        except BusinessError as e:
            return _handle_business_error(e)
        return no_content_response()
class KnowledgeStatsView(BaseAPIView):
    """知识统计端点"""
    permission_classes = [IsAuthenticated]
    service_class = KnowledgeService
    @extend_schema(
        summary='获取知识统计',
        description='获取知识文档的统计数据，统计维度已统一到正文内容。',
        parameters=[
            OpenApiParameter(name='line_tag_id', type=int, description='条线标签ID'),
            OpenApiParameter(name='tag_id', type=int, description='知识标签ID'),
            OpenApiParameter(name='search', type=str, description='搜索标题或内容'),
        ],
        responses={200: KnowledgeStatsSerializer},
        tags=['知识管理']
    )
    def get(self, request):
        _enforce_knowledge_view_permission(request, '无权查看知识统计')
        filters, search = _build_knowledge_filters(request)
        # 2. 调用 Service 获取知识列表（只返回当前版本）
        knowledge_list = self.service.get_all_with_filters(
            filters=filters,
            search=search
        )
        # 3. 计算统计信息
        from django.utils import timezone
        now = timezone.now()
        first_day_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        stats = {
            'total': len(knowledge_list),
            'published': len(knowledge_list),  # 所有返回的都是当前版本
            'with_content': len([k for k in knowledge_list if strip_tags(k.content).strip()]),
            'monthly_new': len([k for k in knowledge_list if k.created_at >= first_day_of_month]),
        }
        # 4. 序列化输出
        serializer = KnowledgeStatsSerializer(stats)
        return success_response(serializer.data)


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
        _enforce_knowledge_view_permission(request, '无权查看任务知识详情')
        task_knowledge = TaskKnowledge.objects.select_related('task', 'knowledge').filter(
            id=task_knowledge_id
        ).first()
        if not task_knowledge:
            return error_response(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='任务知识不存在',
                status_code=status.HTTP_404_NOT_FOUND,
            )
        if not AuthorizationService(request).can('knowledge.view'):
            has_assignment = TaskAssignment.objects.filter(
                task_id=task_knowledge.task_id,
                assignee=request.user
            ).exists()
            if not has_assignment:
                return error_response(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='无权访问该知识文档',
                    status_code=status.HTTP_403_FORBIDDEN,
                )
        knowledge = task_knowledge.knowledge
        serializer = KnowledgeDetailSerializer(knowledge)
        return success_response(serializer.data)
class KnowledgeIncrementViewCountView(BaseAPIView):
    """Increment knowledge view count endpoint."""
    permission_classes = [IsAuthenticated]
    serializer_class = ViewCountResponseSerializer
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
        _enforce_knowledge_view_permission(request, '无权记录知识阅读')
        # 1. 权限检查（先获取知识文档）
        try:
            self.service.get_by_id(pk)
        except BusinessError as e:
            return _handle_business_error(e)
        # 2. 调用 Service
        try:
            view_count = self.service.increment_view_count(pk)
        except BusinessError as e:
            return _handle_business_error(e)
        return success_response({'view_count': view_count})
