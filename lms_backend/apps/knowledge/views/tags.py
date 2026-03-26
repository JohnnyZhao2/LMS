"""
Tag management views.
Implements:
- Tag CRUD
- Tag listing
"""
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.authorization.services import AuthorizationService
from apps.knowledge.models import Tag
from apps.knowledge.serializers import TagSerializer
from apps.knowledge.services import TagService
from core.exceptions import BusinessError, ErrorCodes, get_status_code_for_error
from core.query_params import parse_bool_query_param, parse_int_query_param
from core.responses import created_response, error_response, list_response, no_content_response


def _enforce_knowledge_view_permission(request, error_message: str = '无权查看标签') -> None:
    authorization_service = AuthorizationService(request)
    if authorization_service.can('knowledge.view'):
        return
    raise BusinessError(
        code=ErrorCodes.PERMISSION_DENIED,
        message=error_message,
    )


def _enforce_knowledge_write_permission(request, error_message: str) -> None:
    authorization_service = AuthorizationService(request)
    if authorization_service.can('knowledge.create') or authorization_service.can('knowledge.update'):
        return
    raise BusinessError(
        code=ErrorCodes.PERMISSION_DENIED,
        message=error_message,
    )


def _enforce_knowledge_delete_permission(request, error_message: str) -> None:
    AuthorizationService(request).enforce('knowledge.delete', error_message=error_message)


def _handle_tag_business_error(error: BusinessError):
    return error_response(
        code=error.code,
        message=error.message,
        details=error.details,
        status_code=get_status_code_for_error(error.code),
    )


class TagListView(APIView):
    """
    统一标签列表端点
    返回标签列表，支持按类型筛选、搜索和分页。
    """
    permission_classes = [IsAuthenticated]
    @extend_schema(
        summary='获取标签列表',
        description='获取标签列表，支持按类型筛选和搜索',
        parameters=[
            OpenApiParameter(name='tag_type', type=str, description='标签类型（LINE/TAG）'),
            OpenApiParameter(name='search', type=str, description='搜索关键词'),
            OpenApiParameter(name='limit', type=int, description='返回数量限制（默认50）'),
            OpenApiParameter(name='active_only', type=bool, description='只返回启用的标签（默认true）'),
        ],
        responses={200: TagSerializer(many=True)},
        tags=['知识管理']
    )
    def get(self, request):
        _enforce_knowledge_view_permission(request, '无权查看标签列表')
        tag_type = request.query_params.get('tag_type', '').strip()
        search = request.query_params.get('search', '').strip()
        limit = parse_int_query_param(
            request=request,
            name='limit',
            default=50,
            minimum=1,
            maximum=200,
        )
        active_only = parse_bool_query_param(
            request=request,
            name='active_only',
            default=True,
        )
        queryset = Tag.objects.all()
        if tag_type:
            queryset = queryset.filter(tag_type=tag_type)
        if active_only:
            queryset = queryset.filter(is_active=True)
        if search:
            queryset = queryset.filter(name__icontains=search)
        queryset = queryset.order_by('sort_order', 'name')[:limit]
        serializer = TagSerializer(queryset, many=True)
        return list_response(serializer.data)
class TagCreateView(APIView):
    """创建标签端点（仅管理员）"""
    permission_classes = [IsAuthenticated]
    @extend_schema(
        summary='创建标签',
        description='创建新标签（仅管理员）',
        request=TagSerializer,
        responses={
            201: TagSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['知识管理']
    )
    def post(self, request):
        _enforce_knowledge_write_permission(request, '无权创建标签')
        serializer = TagSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return created_response(serializer.data)


class TagDetailView(APIView):
    """标签详情端点。"""
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='删除标签',
        description='删除标签。删除条线类型时，仅移除与知识和题目的关联，不删除内容本身。',
        responses={
            200: OpenApiResponse(description='删除成功'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='标签不存在'),
        },
        tags=['知识管理']
    )
    def delete(self, request, pk):
        _enforce_knowledge_delete_permission(request, '无权删除标签')
        service = TagService(request)
        try:
            service.delete(pk)
        except BusinessError as error:
            return _handle_tag_business_error(error)
        return no_content_response()
