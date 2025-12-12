"""
Mixins for role-based data filtering and access control.
"""
from django.db.models import Q
from rest_framework.exceptions import PermissionDenied
from apps.users.models import Role


class RoleBasedFilterMixin:
    """
    基于角色的数据过滤 Mixin
    
    根据用户的活动角色自动过滤查询集
    实现 Requirements 15.3, 15.4, 15.5
    """
    
    def get_queryset(self):
        """根据用户角色过滤查询集"""
        queryset = super().get_queryset()
        user = self.request.user
        
        if not user.is_authenticated:
            return queryset.none()
        
        # 获取活动角色
        active_role_code = getattr(self.request, 'active_role_code', None)
        
        if not active_role_code:
            # 如果没有活动角色，返回空查询集
            return queryset.none()
        
        # 管理员可以看到所有数据
        if active_role_code == Role.ADMIN:
            return queryset
        
        # 根据不同角色过滤数据
        return self.filter_by_role(queryset, active_role_code, user)
    
    def filter_by_role(self, queryset, role_code, user):
        """
        根据角色过滤查询集
        子类可以重写此方法以实现自定义过滤逻辑
        """
        return queryset


class StudentDataFilterMixin(RoleBasedFilterMixin):
    """
    学员数据过滤 Mixin
    
    用于过滤学员相关的数据（任务、提交、答案等）
    """
    
    def filter_by_role(self, queryset, role_code, user):
        """根据角色过滤学员数据"""
        if role_code == Role.ADMIN:
            # 管理员可以看到所有数据
            return queryset
        
        elif role_code == Role.TEAM_MANAGER:
            # 团队经理可以看到所有部门的数据
            return queryset
        
        elif role_code == Role.DEPT_MANAGER:
            # 室经理只能看到本部门员工的数据
            if user.department:
                return queryset.filter(
                    Q(user__department=user.department) |
                    Q(student__department=user.department)
                )
            return queryset.none()
        
        elif role_code == Role.MENTOR:
            # 导师只能看到自己学员的数据
            return queryset.filter(
                Q(user__mentor=user) |
                Q(student__mentor=user)
            )
        
        elif role_code == Role.STUDENT:
            # 学员只能看到自己的数据
            return queryset.filter(
                Q(user=user) |
                Q(student=user)
            )
        
        return queryset.none()


class UserDataFilterMixin(RoleBasedFilterMixin):
    """
    用户数据过滤 Mixin
    
    用于过滤用户列表
    """
    
    def filter_by_role(self, queryset, role_code, user):
        """根据角色过滤用户数据"""
        if role_code == Role.ADMIN:
            # 管理员可以看到所有用户
            return queryset
        
        elif role_code == Role.TEAM_MANAGER:
            # 团队经理可以看到所有用户
            return queryset
        
        elif role_code == Role.DEPT_MANAGER:
            # 室经理只能看到本部门的员工
            if user.department:
                return queryset.filter(department=user.department)
            return queryset.none()
        
        elif role_code == Role.MENTOR:
            # 导师只能看到自己的学员
            return queryset.filter(mentor=user)
        
        elif role_code == Role.STUDENT:
            # 学员只能看到自己
            return queryset.filter(id=user.id)
        
        return queryset.none()


class TaskAssignmentFilterMixin(RoleBasedFilterMixin):
    """
    任务分配过滤 Mixin
    
    用于限制任务分配时的学员选择范围
    实现 Requirements 7.6, 7.7, 7.8
    """
    
    def get_assignable_students(self, user, role_code):
        """
        获取可分配任务的学员列表
        
        Args:
            user: 当前用户
            role_code: 当前活动角色代码
        
        Returns:
            QuerySet: 可分配的学员查询集
        """
        from apps.users.models import User
        
        if role_code == Role.ADMIN:
            # 管理员可以分配给所有用户
            return User.objects.filter(is_active=True)
        
        elif role_code == Role.TEAM_MANAGER:
            # 团队经理可以分配给所有用户
            return User.objects.filter(is_active=True)
        
        elif role_code == Role.DEPT_MANAGER:
            # 室经理只能分配给本部门员工（不包括自己）
            if user.department:
                return User.objects.filter(
                    department=user.department,
                    is_active=True
                ).exclude(id=user.id)
            return User.objects.none()
        
        elif role_code == Role.MENTOR:
            # 导师只能分配给自己的学员
            return User.objects.filter(
                mentor=user,
                is_active=True
            )
        
        # 学员不能分配任务
        return User.objects.none()


class BlockStudentManagementMixin:
    """
    阻止学员访问管理功能的 Mixin
    
    实现 Requirement 15.2
    """
    
    def check_permissions(self, request):
        """检查权限，阻止学员访问管理端点"""
        super().check_permissions(request)
        
        # 获取活动角色
        active_role_code = getattr(request, 'active_role_code', None)
        
        # 如果是学员角色，且不是安全方法（GET, HEAD, OPTIONS），拒绝访问
        if active_role_code == Role.STUDENT:
            # 定义学员可以访问的 actions
            allowed_actions = ['list', 'retrieve']
            
            # 如果当前 action 不在允许列表中，拒绝访问
            if hasattr(self, 'action') and self.action not in allowed_actions:
                raise PermissionDenied("学员无法访问管理功能")


class DepartmentDataFilterMixin(RoleBasedFilterMixin):
    """
    部门数据过滤 Mixin
    
    用于过滤部门相关的数据
    """
    
    def filter_by_role(self, queryset, role_code, user):
        """根据角色过滤部门数据"""
        if role_code == Role.ADMIN:
            # 管理员可以看到所有部门
            return queryset
        
        elif role_code == Role.TEAM_MANAGER:
            # 团队经理可以看到所有部门
            return queryset
        
        elif role_code == Role.DEPT_MANAGER:
            # 室经理只能看到自己管理的部门
            return queryset.filter(manager=user)
        
        elif role_code == Role.MENTOR:
            # 导师可以看到自己所在的部门
            if user.department:
                return queryset.filter(id=user.department.id)
            return queryset.none()
        
        elif role_code == Role.STUDENT:
            # 学员可以看到自己所在的部门
            if user.department:
                return queryset.filter(id=user.department.id)
            return queryset.none()
        
        return queryset.none()
