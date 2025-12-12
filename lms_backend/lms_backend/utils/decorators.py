"""
Custom decorators for permission checking and role-based access control.
"""
from functools import wraps
from rest_framework.exceptions import PermissionDenied
from apps.users.models import Role


def require_role(*required_roles):
    """
    装饰器：要求用户拥有指定角色之一
    
    Usage:
        @require_role(Role.ADMIN, Role.MENTOR)
        def my_view(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                raise PermissionDenied("需要登录才能访问此资源")
            
            # 检查用户是否拥有任何所需角色
            has_required_role = False
            for role_code in required_roles:
                if request.user.has_role(role_code):
                    has_required_role = True
                    break
            
            if not has_required_role:
                role_names = [dict(Role.ROLE_CHOICES).get(r, r) for r in required_roles]
                raise PermissionDenied(f"需要以下角色之一才能访问: {', '.join(role_names)}")
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def require_active_role(*required_roles):
    """
    装饰器：要求用户的活动角色是指定角色之一
    
    与 require_role 不同，此装饰器检查的是当前活动角色，而不是用户拥有的所有角色
    
    Usage:
        @require_active_role(Role.ADMIN, Role.MENTOR)
        def my_view(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                raise PermissionDenied("需要登录才能访问此资源")
            
            # 获取活动角色
            active_role_code = getattr(request, 'active_role_code', None)
            
            if not active_role_code:
                raise PermissionDenied("未设置活动角色")
            
            # 检查活动角色是否在所需角色列表中
            if active_role_code not in required_roles:
                role_names = [dict(Role.ROLE_CHOICES).get(r, r) for r in required_roles]
                raise PermissionDenied(f"需要以下活动角色之一才能访问: {', '.join(role_names)}")
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def block_student_access(view_func):
    """
    装饰器：阻止学员访问管理功能
    
    实现 Requirement 15.2
    
    Usage:
        @block_student_access
        def my_management_view(request):
            ...
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            raise PermissionDenied("需要登录才能访问此资源")
        
        # 获取活动角色
        active_role_code = getattr(request, 'active_role_code', None)
        
        # 如果是学员角色，拒绝访问
        if active_role_code == Role.STUDENT:
            raise PermissionDenied("学员无法访问管理功能")
        
        return view_func(request, *args, **kwargs)
    return wrapper


def admin_only(view_func):
    """
    装饰器：仅管理员可访问
    
    Usage:
        @admin_only
        def my_admin_view(request):
            ...
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            raise PermissionDenied("需要登录才能访问此资源")
        
        if not request.user.has_role(Role.ADMIN):
            raise PermissionDenied("仅管理员可以访问此资源")
        
        return view_func(request, *args, **kwargs)
    return wrapper


def management_only(view_func):
    """
    装饰器：仅管理角色可访问（导师、室经理、团队经理、管理员）
    
    Usage:
        @management_only
        def my_management_view(request):
            ...
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            raise PermissionDenied("需要登录才能访问此资源")
        
        # 检查用户是否拥有任何管理角色
        management_roles = [
            Role.MENTOR,
            Role.DEPT_MANAGER,
            Role.TEAM_MANAGER,
            Role.ADMIN
        ]
        
        has_management_role = False
        for role_code in management_roles:
            if request.user.has_role(role_code):
                has_management_role = True
                break
        
        if not has_management_role:
            raise PermissionDenied("需要管理角色才能访问此资源")
        
        return view_func(request, *args, **kwargs)
    return wrapper
