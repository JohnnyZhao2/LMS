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
from core.exceptions import BusinessError, ErrorCodes
from core.query_params import parse_bool_query_param, parse_int_query_param
from core.responses import created_response, list_response


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
