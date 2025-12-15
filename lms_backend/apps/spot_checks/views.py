"""
Views for spot check management.

Implements spot check record CRUD endpoints with student scope validation.

Requirements: 14.1, 14.2, 14.3, 14.4
Properties: 35, 36
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter

from core.exceptions import BusinessError, ErrorCodes
from apps.users.permissions import (
    IsMentorOrDeptManager,
    get_current_role,
    filter_queryset_by_data_scope,
)

from .models import SpotCheck
from .serializers import (
    SpotCheckListSerializer,
    SpotCheckDetailSerializer,
    SpotCheckCreateSerializer,
    SpotCheckUpdateSerializer,
)


class SpotCheckListCreateView(APIView):
    """
    Spot check list and create endpoint.
    
    Requirements: 14.1, 14.2, 14.3, 14.4
    Properties: 35, 36
    """
    permission_classes = [IsAuthenticated, IsMentorOrDeptManager]
    
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
        Get spot check list filtered by user's data scope.
        
        Requirements: 14.4
        Property 36: 抽查记录时间排序
        """
        queryset = SpotCheck.objects.select_related(
            'student', 'checker', 'student__department'
        )
        
        # Filter by data scope (mentor sees mentees, dept manager sees dept members)
        queryset = filter_queryset_by_data_scope(
            queryset, request.user, student_field='student'
        )
        
        # Filter by student_id if provided
        student_id = request.query_params.get('student_id')
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        
        # Order by checked_at descending (Property 36)
        queryset = queryset.order_by('-checked_at')
        
        serializer = SpotCheckListSerializer(queryset, many=True)
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
        Create a new spot check record.
        
        Requirements: 14.1, 14.2, 14.3
        Property 35: 抽查学员范围限制
        """
        serializer = SpotCheckCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        spot_check = serializer.save()
        
        response_serializer = SpotCheckDetailSerializer(spot_check)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class SpotCheckDetailView(APIView):
    """
    Spot check detail, update, delete endpoint.
    
    Requirements: 14.1
    """
    permission_classes = [IsAuthenticated, IsMentorOrDeptManager]
    
    def get_object(self, pk, user):
        """
        Get spot check by ID with scope validation.
        
        Property 35: 抽查学员范围限制
        """
        try:
            spot_check = SpotCheck.objects.select_related(
                'student', 'checker', 'student__department'
            ).get(pk=pk)
        except SpotCheck.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='抽查记录不存在'
            )
        
        # Validate data scope
        current_role = get_current_role(user)
        
        # Admin can access all
        if current_role == 'ADMIN':
            return spot_check
        
        # Mentor can only access their mentees' records
        if current_role == 'MENTOR':
            if spot_check.student.mentor_id != user.id:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='无权访问该抽查记录'
                )
            return spot_check
        
        # Department manager can only access department members' records
        if current_role == 'DEPT_MANAGER':
            if not user.department_id or spot_check.student.department_id != user.department_id:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='无权访问该抽查记录'
                )
            return spot_check
        
        raise BusinessError(
            code=ErrorCodes.PERMISSION_DENIED,
            message='无权访问该抽查记录'
        )
    
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
        """Get spot check detail."""
        spot_check = self.get_object(pk, request.user)
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
        Update spot check record.
        
        Only the creator can update the record.
        """
        spot_check = self.get_object(pk, request.user)
        
        # Only creator or admin can update
        current_role = get_current_role(request.user)
        if current_role != 'ADMIN' and spot_check.checker_id != request.user.id:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只能更新自己创建的抽查记录'
            )
        
        serializer = SpotCheckUpdateSerializer(
            spot_check, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        spot_check = serializer.save()
        
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
        Delete spot check record.
        
        Only the creator or admin can delete the record.
        """
        spot_check = self.get_object(pk, request.user)
        
        # Only creator or admin can delete
        current_role = get_current_role(request.user)
        if current_role != 'ADMIN' and spot_check.checker_id != request.user.id:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只能删除自己创建的抽查记录'
            )
        
        spot_check.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
