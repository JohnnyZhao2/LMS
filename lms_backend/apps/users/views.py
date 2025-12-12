"""
Views for authentication and user management.
"""
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth import login, logout
from drf_spectacular.utils import extend_schema, OpenApiParameter

from .models import User, Role, Department
from .serializers import (
    UserSerializer,
    UserDetailSerializer,
    LoginSerializer,
    RoleSerializer,
    RoleSwitchSerializer,
    DepartmentSerializer
)


class AuthViewSet(viewsets.GenericViewSet):
    """认证相关视图集"""
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    @extend_schema(
        summary="用户登录",
        description="使用用户名和密码登录，返回 JWT token",
        request=LoginSerializer,
        responses={200: UserDetailSerializer}
    )
    @action(detail=False, methods=['post'])
    def login(self, request):
        """用户登录"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        
        # 生成 JWT token
        refresh = RefreshToken.for_user(user)
        
        # 更新最后登录时间
        login(request, user)
        
        # 返回用户信息和 token
        user_serializer = UserDetailSerializer(user)
        
        return Response({
            'success': True,
            'message': '登录成功',
            'data': {
                'user': user_serializer.data,
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh)
                }
            }
        })

    @extend_schema(
        summary="用户登出",
        description="登出当前用户",
        responses={200: dict}
    )
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def logout(self, request):
        """用户登出"""
        logout(request)
        return Response({
            'success': True,
            'message': '登出成功',
            'data': None
        })

    @extend_schema(
        summary="获取当前用户信息",
        description="获取当前登录用户的详细信息",
        responses={200: UserDetailSerializer}
    )
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """获取当前用户信息"""
        serializer = UserDetailSerializer(request.user)
        return Response({
            'success': True,
            'message': '获取成功',
            'data': serializer.data
        })

    @extend_schema(
        summary="切换用户角色",
        description="切换当前用户的活动角色（用于多角色用户）",
        request=RoleSwitchSerializer,
        responses={200: UserDetailSerializer}
    )
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def switch_role(self, request):
        """切换用户角色"""
        serializer = RoleSwitchSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        role_code = serializer.validated_data['role_code']
        
        # 在 session 中保存当前活动角色
        request.session['active_role'] = role_code
        
        # 返回更新后的用户信息
        user_serializer = UserDetailSerializer(request.user)
        
        return Response({
            'success': True,
            'message': f'已切换到{Role.objects.get(code=role_code).name}角色',
            'data': {
                'user': user_serializer.data,
                'active_role': role_code
            }
        })


class UserViewSet(viewsets.ModelViewSet):
    """用户管理视图集"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['department', 'is_active']
    search_fields = ['username', 'real_name', 'employee_id', 'email']
    ordering_fields = ['created_at', 'join_date']
    
    def get_queryset(self):
        """根据用户角色过滤查询集"""
        queryset = super().get_queryset()
        user = self.request.user
        
        if not user.is_authenticated:
            return queryset.none()
        
        # 获取活动角色
        active_role_code = getattr(self.request, 'active_role_code', None)
        
        if not active_role_code:
            return queryset.none()
        
        # 管理员可以看到所有用户
        if active_role_code == Role.ADMIN:
            return queryset
        
        # 团队经理可以看到所有用户
        if active_role_code == Role.TEAM_MANAGER:
            return queryset
        
        # 室经理只能看到本部门的员工
        if active_role_code == Role.DEPT_MANAGER:
            if user.department:
                return queryset.filter(department=user.department)
            return queryset.none()
        
        # 导师只能看到自己的学员
        if active_role_code == Role.MENTOR:
            return queryset.filter(mentor=user)
        
        # 学员只能看到自己
        if active_role_code == Role.STUDENT:
            return queryset.filter(id=user.id)
        
        return queryset.none()

    def get_serializer_class(self):
        """根据 action 返回不同的序列化器"""
        if self.action == 'retrieve':
            return UserDetailSerializer
        return UserSerializer

    @extend_schema(
        summary="分配角色",
        description="为用户分配角色",
        request={'role_id': int},
        responses={200: UserDetailSerializer}
    )
    @action(detail=True, methods=['post'])
    def assign_role(self, request, pk=None):
        """分配角色给用户"""
        user = self.get_object()
        role_id = request.data.get('role_id')
        
        if not role_id:
            return Response({
                'success': False,
                'message': '请提供角色ID',
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            role = Role.objects.get(id=role_id)
        except Role.DoesNotExist:
            return Response({
                'success': False,
                'message': '角色不存在',
                'data': None
            }, status=status.HTTP_404_NOT_FOUND)
        
        user_role, created = user.assign_role(role, assigned_by=request.user)
        
        serializer = UserDetailSerializer(user)
        return Response({
            'success': True,
            'message': f'{"分配" if created else "已拥有"}角色：{role.name}',
            'data': serializer.data
        })

    @extend_schema(
        summary="移除角色",
        description="移除用户的角色",
        request={'role_id': int},
        responses={200: UserDetailSerializer}
    )
    @action(detail=True, methods=['post'])
    def remove_role(self, request, pk=None):
        """移除用户的角色"""
        user = self.get_object()
        role_id = request.data.get('role_id')
        
        if not role_id:
            return Response({
                'success': False,
                'message': '请提供角色ID',
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            role = Role.objects.get(id=role_id)
        except Role.DoesNotExist:
            return Response({
                'success': False,
                'message': '角色不存在',
                'data': None
            }, status=status.HTTP_404_NOT_FOUND)
        
        deleted_count, _ = user.remove_role(role)
        
        serializer = UserDetailSerializer(user)
        return Response({
            'success': True,
            'message': f'{"已移除" if deleted_count > 0 else "未拥有"}角色：{role.name}',
            'data': serializer.data
        })


class RoleViewSet(viewsets.ReadOnlyModelViewSet):
    """角色视图集（只读）"""
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]


class DepartmentViewSet(viewsets.ModelViewSet):
    """部门管理视图集"""
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ['name', 'code']
    ordering_fields = ['created_at']
    
    def get_queryset(self):
        """根据用户角色过滤查询集"""
        queryset = super().get_queryset()
        user = self.request.user
        
        if not user.is_authenticated:
            return queryset.none()
        
        # 获取活动角色
        active_role_code = getattr(self.request, 'active_role_code', None)
        
        if not active_role_code:
            return queryset.none()
        
        # 管理员可以看到所有部门
        if active_role_code == Role.ADMIN:
            return queryset
        
        # 团队经理可以看到所有部门
        if active_role_code == Role.TEAM_MANAGER:
            return queryset
        
        # 室经理只能看到自己管理的部门
        if active_role_code == Role.DEPT_MANAGER:
            return queryset.filter(manager=user)
        
        # 导师和学员可以看到自己所在的部门
        if active_role_code in [Role.MENTOR, Role.STUDENT]:
            if user.department:
                return queryset.filter(id=user.department.id)
            return queryset.none()
        
        return queryset.none()
