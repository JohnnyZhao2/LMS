"""
抽查记录视图
只处理 HTTP 请求/响应，所有业务逻辑在 Service 层。
Properties: 35, 36
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter
from core.exceptions import BusinessError, ErrorCodes
from apps.users.permissions import IsMentorOrDeptManager
from .serializers import (
    SpotCheckListSerializer,
    SpotCheckDetailSerializer,
    SpotCheckCreateSerializer,
    SpotCheckUpdateSerializer,
)
from .services import SpotCheckService
class SpotCheckListCreateView(APIView):
    """
    抽查记录列表和创建端点
    Properties: 35, 36
    """
    permission_classes = [IsAuthenticated, IsMentorOrDeptManager]
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = SpotCheckService()
    @extend_schema(
        summary='获取抽查记录列表',
        description='获取所辖范围内的抽查记录列表，按时间倒序排列',
        parameters=[
            OpenApiParameter(
                name='student_id', 
                type=int, 
                description='按学员ID筛选'
            ),
        ],
        responses={200: SpotCheckListSerializer(many=True)},
        tags=['抽查管理']
    )
    def get(self, request):
        """
        获取抽查记录列表
        Property 36: 抽查记录时间排序
        """
        # 获取查询参数
        student_id = request.query_params.get('student_id')
        if student_id:
            try:
                student_id = int(student_id)
            except (ValueError, TypeError):
                return Response(
                    {'code': 'VALIDATION_ERROR', 'message': '无效的学员ID'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            student_id = None
        # 调用 Service
        try:
            spot_checks = self.service.get_list(
                user=request.user,
                student_id=student_id,
                ordering='-checked_at'
            )
        except BusinessError as e:
            return Response(
                {'code': e.code, 'message': e.message},
                status=status.HTTP_403_FORBIDDEN
            )
        # 序列化输出
        serializer = SpotCheckListSerializer(spot_checks, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    @extend_schema(
        summary='创建抽查记录',
        description='创建新的抽查记录（导师只能为名下学员创建，室经理只能为本室学员创建）',
        request=SpotCheckCreateSerializer,
        responses={
            201: SpotCheckDetailSerializer,
            400: OpenApiResponse(description='参数错误或学员不在权限范围内'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['抽查管理']
    )
    def post(self, request):
        """
        创建抽查记录
        Property 35: 抽查学员范围限制
        """
        # 反序列化输入
        serializer = SpotCheckCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # 调用 Service
        try:
            spot_check = self.service.create(
                data=serializer.validated_data,
                user=request.user
            )
        except BusinessError as e:
            return Response(
                {'code': e.code, 'message': e.message, 'details': e.details},
                status=status.HTTP_400_BAD_REQUEST if e.code == 'VALIDATION_ERROR'
                else status.HTTP_403_FORBIDDEN
            )
        # 序列化输出
        response_serializer = SpotCheckDetailSerializer(spot_check)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
class SpotCheckDetailView(APIView):
    """
    抽查记录详情、更新、删除端点
    """
    permission_classes = [IsAuthenticated, IsMentorOrDeptManager]
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = SpotCheckService()
    @extend_schema(
        summary='获取抽查记录详情',
        description='获取指定抽查记录的详细信息',
        responses={
            200: SpotCheckDetailSerializer,
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='抽查记录不存在'),
        },
        tags=['抽查管理']
    )
    def get(self, request, pk):
        """获取抽查记录详情"""
        try:
            spot_check = self.service.get_by_id(pk, request.user)
        except BusinessError as e:
            return Response(
                {'code': e.code, 'message': e.message},
                status=status.HTTP_404_NOT_FOUND if e.code == 'RESOURCE_NOT_FOUND'
                else status.HTTP_403_FORBIDDEN
            )
        serializer = SpotCheckDetailSerializer(spot_check)
        return Response(serializer.data, status=status.HTTP_200_OK)
    @extend_schema(
        summary='更新抽查记录',
        description='更新抽查记录内容（只能更新自己创建的记录）',
        request=SpotCheckUpdateSerializer,
        responses={
            200: SpotCheckDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='抽查记录不存在'),
        },
        tags=['抽查管理']
    )
    def patch(self, request, pk):
        """
        更新抽查记录
        只能更新自己创建的记录（管理员除外）
        """
        # 反序列化输入
        serializer = SpotCheckUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        # 调用 Service
        try:
            spot_check = self.service.update(
                pk=pk,
                data=serializer.validated_data,
                user=request.user
            )
        except BusinessError as e:
            return Response(
                {'code': e.code, 'message': e.message, 'details': e.details},
                status=status.HTTP_400_BAD_REQUEST if e.code == 'VALIDATION_ERROR'
                else status.HTTP_403_FORBIDDEN if e.code == 'PERMISSION_DENIED'
                else status.HTTP_404_NOT_FOUND
            )
        # 序列化输出
        response_serializer = SpotCheckDetailSerializer(spot_check)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
    @extend_schema(
        summary='删除抽查记录',
        description='删除抽查记录（只能删除自己创建的记录）',
        responses={
            204: OpenApiResponse(description='删除成功'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='抽查记录不存在'),
        },
        tags=['抽查管理']
    )
    def delete(self, request, pk):
        """
        删除抽查记录
        只能删除自己创建的记录（管理员除外）
        """
        try:
            self.service.delete(pk, request.user)
        except BusinessError as e:
            return Response(
                {'code': e.code, 'message': e.message},
                status=status.HTTP_404_NOT_FOUND if e.code == 'RESOURCE_NOT_FOUND'
                else status.HTTP_403_FORBIDDEN
            )
        return Response(status=status.HTTP_204_NO_CONTENT)
