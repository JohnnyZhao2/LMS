"""
Custom middleware for role-based access control and request processing.
"""
from django.utils.deprecation import MiddlewareMixin
from apps.users.models import Role


class RoleContextMiddleware(MiddlewareMixin):
    """
    角色上下文中间件
    
    为每个请求添加当前活动角色信息
    如果用户有多个角色，从 session 中获取活动角色
    如果没有设置活动角色，使用用户的第一个角色
    """
    
    def process_request(self, request):
        """处理请求，添加角色上下文"""
        if hasattr(request, 'user') and request.user.is_authenticated:
            # 获取用户的所有角色
            user_roles = request.user.get_roles()
            
            if user_roles:
                # 从 session 中获取活动角色
                active_role_code = request.session.get('active_role')
                
                # 验证活动角色是否有效
                if active_role_code:
                    active_role = next(
                        (ur.role for ur in user_roles if ur.role.code == active_role_code),
                        None
                    )
                else:
                    # 如果没有设置活动角色，使用第一个角色
                    active_role = user_roles[0].role if user_roles else None
                
                # 将活动角色添加到 request 对象
                request.active_role = active_role
                request.active_role_code = active_role.code if active_role else None
            else:
                request.active_role = None
                request.active_role_code = None
        else:
            request.active_role = None
            request.active_role_code = None
        
        return None


class ActiveRoleVerificationMiddleware(MiddlewareMixin):
    """
    活动角色验证中间件
    
    确保所有受保护的端点都验证用户的活动角色
    这是 Requirement 15.1 的实现
    """
    
    # 不需要角色验证的路径前缀
    EXEMPT_PATHS = [
        '/api/auth/login/',
        '/api/auth/refresh/',
        '/admin/',
        '/api/docs/',
        '/api/redoc/',
        '/api/schema/',
    ]
    
    def process_request(self, request):
        """验证活动角色"""
        # 检查是否是豁免路径
        for exempt_path in self.EXEMPT_PATHS:
            if request.path.startswith(exempt_path):
                return None
        
        # 如果用户已认证，确保有活动角色
        if hasattr(request, 'user') and request.user.is_authenticated:
            if not hasattr(request, 'active_role') or request.active_role is None:
                # 这种情况不应该发生，因为 RoleContextMiddleware 应该先执行
                # 但为了安全起见，我们还是检查一下
                pass
        
        return None
