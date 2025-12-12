"""
Custom permission classes for role-based access control.
"""
from rest_framework import permissions
from apps.users.models import Role


class IsAuthenticated(permissions.IsAuthenticated):
    """基础认证权限，所有需要登录的接口都使用此权限"""
    pass


class HasRole(permissions.BasePermission):
    """
    检查用户是否拥有指定角色的基础权限类
    子类需要设置 required_role 属性
    """
    required_role = None
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if self.required_role is None:
            return True
        
        # 检查用户是否拥有所需角色
        return request.user.has_role(self.required_role)


class IsStudent(HasRole):
    """学员权限"""
    required_role = Role.STUDENT
    message = "需要学员角色才能访问此资源"


class IsMentor(HasRole):
    """导师权限"""
    required_role = Role.MENTOR
    message = "需要导师角色才能访问此资源"


class IsDeptManager(HasRole):
    """室经理权限"""
    required_role = Role.DEPT_MANAGER
    message = "需要室经理角色才能访问此资源"


class IsTeamManager(HasRole):
    """团队经理权限"""
    required_role = Role.TEAM_MANAGER
    message = "需要团队经理角色才能访问此资源"


class IsAdmin(HasRole):
    """管理员权限"""
    required_role = Role.ADMIN
    message = "需要管理员角色才能访问此资源"


class IsManagementRole(permissions.BasePermission):
    """
    管理角色权限（导师、室经理、团队经理、管理员）
    学员无法访问管理功能
    """
    message = "学员无法访问管理功能"
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # 检查用户是否拥有任何管理角色
        management_roles = [
            Role.MENTOR,
            Role.DEPT_MANAGER,
            Role.TEAM_MANAGER,
            Role.ADMIN
        ]
        
        for role_code in management_roles:
            if request.user.has_role(role_code):
                return True
        
        return False


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    管理员可以进行任何操作，其他用户只能读取
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # 读取操作允许所有认证用户
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # 写入操作只允许管理员
        return request.user.has_role(Role.ADMIN)


class CanManageUsers(permissions.BasePermission):
    """
    可以管理用户的权限（导师、室经理、管理员）
    """
    message = "您没有权限管理用户"
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # 导师、室经理、管理员可以管理用户
        allowed_roles = [Role.MENTOR, Role.DEPT_MANAGER, Role.ADMIN]
        
        for role_code in allowed_roles:
            if request.user.has_role(role_code):
                return True
        
        return False
