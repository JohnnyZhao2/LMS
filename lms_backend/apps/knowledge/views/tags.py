"""
Tag management views.
Implements:
- Tag CRUD
- Tag listing with cascade filtering
"""
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.knowledge.models import Knowledge, Tag
from apps.knowledge.serializers import TagSerializer
from apps.users.permissions import get_current_role
from core.exceptions import BusinessError, ErrorCodes
from core.query_params import parse_bool_query_param, parse_int_query_param
from core.responses import created_response, list_response


class TagListView(APIView):
    """
    统一标签列表端点
    返回标签列表，支持按类型筛选、搜索和分页。
    支持级联筛选：根据已选条线类型，动态返回该条线下知识使用的系统/操作标签。
    """
    permission_classes = [IsAuthenticated]
    @extend_schema(
        summary='获取标签列表',
        description='''获取标签列表，支持按类型筛选和搜索。
级联筛选：
- 当 tag_type=SYSTEM 且提供 line_tag_id 时，返回该条线下知识使用的系统标签
- 当 tag_type=OPERATION 且提供 line_tag_id 时，返回该条线下知识使用的操作标签
''',
        parameters=[
            OpenApiParameter(name='tag_type', type=str, description='标签类型（LINE/SYSTEM/OPERATION）'),
            OpenApiParameter(name='line_tag_id', type=int, description='条线标签ID（用于级联筛选系统/操作标签）'),
            OpenApiParameter(name='search', type=str, description='搜索关键词'),
            OpenApiParameter(name='limit', type=int, description='返回数量限制（默认50）'),
            OpenApiParameter(name='active_only', type=bool, description='只返回启用的标签（默认true）'),
        ],
        responses={200: TagSerializer(many=True)},
        tags=['知识管理']
    )
    def get(self, request):
        tag_type = request.query_params.get('tag_type', '').strip()
        line_tag_id = parse_int_query_param(
            request=request,
            name='line_tag_id',
            minimum=1,
        )
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
        # 级联筛选
        if line_tag_id and tag_type in ['SYSTEM', 'OPERATION']:
            knowledge_qs = Knowledge.objects.filter(
                is_deleted=False,
                line_tag_id=line_tag_id,
            )
            if tag_type == 'SYSTEM':
                tag_ids = knowledge_qs.filter(
                    system_tags__isnull=False
                ).values_list('system_tags__id', flat=True).distinct()
            else:  # OPERATION
                tag_ids = knowledge_qs.filter(
                    operation_tags__isnull=False
                ).values_list('operation_tags__id', flat=True).distinct()
            queryset = Tag.objects.filter(id__in=tag_ids, tag_type=tag_type)
        else:
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
        if get_current_role(request.user, request) != 'ADMIN':
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以创建标签'
            )
        serializer = TagSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return created_response(serializer.data)
