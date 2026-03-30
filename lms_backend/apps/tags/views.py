from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.exceptions import BusinessError, get_status_code_for_error
from core.query_params import parse_bool_query_param, parse_int_query_param
from core.responses import created_response, error_response, list_response, no_content_response, success_response

from .serializers import TagSerializer
from .services import (
    TagService,
    enforce_tag_action_permission,
    enforce_tag_view_permission,
)


def _handle_business_error(error: BusinessError):
    return error_response(
        code=error.code,
        message=error.message,
        details=error.details,
        status_code=get_status_code_for_error(error.code),
    )


class TagListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='获取标签列表',
        parameters=[
            OpenApiParameter(name='tag_type', type=str, description='标签类型（SPACE/TAG）'),
            OpenApiParameter(name='search', type=str, description='搜索关键词'),
            OpenApiParameter(name='limit', type=int, description='返回数量限制（默认50）'),
            OpenApiParameter(name='active_only', type=bool, description='只返回启用标签'),
            OpenApiParameter(name='applicable_to', type=str, description='适用范围（knowledge/question）'),
        ],
        responses={200: TagSerializer(many=True)},
        tags=['标签管理'],
    )
    def get(self, request):
        tag_type = request.query_params.get('tag_type', '').strip() or None
        search = request.query_params.get('search', '').strip() or None
        applicable_to = request.query_params.get('applicable_to', '').strip() or None
        active_only = parse_bool_query_param(
            request=request,
            name='active_only',
            default=True,
        )
        enforce_tag_view_permission(
            request,
            '无权查看标签列表',
            tag_type=tag_type,
            active_only=active_only,
        )
        service = TagService(request)
        limit = parse_int_query_param(
            request=request,
            name='limit',
            default=50,
            minimum=1,
            maximum=200,
        )
        queryset = service.list(
            tag_type=tag_type,
            search=search,
            active_only=active_only,
            applicable_to=applicable_to,
            limit=limit,
        )
        serializer = TagSerializer(queryset, many=True)
        return list_response(serializer.data)

    @extend_schema(
        summary='创建标签',
        request=TagSerializer,
        responses={201: TagSerializer},
        tags=['标签管理'],
    )
    def post(self, request):
        enforce_tag_action_permission(request, 'tag.create', '无权创建标签')
        serializer = TagSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        service = TagService(request)
        try:
            tag = service.create(serializer.validated_data)
        except BusinessError as error:
            return _handle_business_error(error)
        return created_response(TagSerializer(tag).data)


class TagDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='更新标签',
        request=TagSerializer,
        responses={200: TagSerializer},
        tags=['标签管理'],
    )
    def patch(self, request, pk):
        enforce_tag_action_permission(request, 'tag.update', '无权更新标签')
        serializer = TagSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        service = TagService(request)
        try:
            tag = service.update(pk, serializer.validated_data)
        except BusinessError as error:
            return _handle_business_error(error)
        return success_response(TagSerializer(tag).data)

    @extend_schema(
        summary='删除标签',
        responses={200: OpenApiResponse(description='删除成功')},
        tags=['标签管理'],
    )
    def delete(self, request, pk):
        enforce_tag_action_permission(request, 'tag.delete', '无权删除标签')
        service = TagService(request)
        try:
            service.delete(pk)
        except BusinessError as error:
            return _handle_business_error(error)
        return no_content_response()
