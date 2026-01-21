"""
基础服务类
提供通用的服务方法，所有 Service 可以继承此类。

使用方式（构造器注入）:
    service = MyService(request)
    result = service.do_something()  # 内部通过 self.user, self.request 访问
"""
from typing import Optional, TypeVar
from core.exceptions import BusinessError, ErrorCodes
from apps.users.permissions import get_current_role as _get_current_role


T = TypeVar('T')


class BaseService:
    """
    基础服务类
    
    支持构造器注入 request，提供：
    - self.request: HTTP 请求对象
    - self.user: 当前用户
    - self.get_current_role(): 获取当前角色
    
    也支持无参构造（向后兼容），此时需要在方法中传入 user/request。
    """
    
    def __init__(self, request=None):
        """
        初始化服务
        
        Args:
            request: HTTP 请求对象（可选，推荐传入）
        """
        self._request = request
        self._user = request.user if request and hasattr(request, 'user') else None
    
    @property
    def request(self):
        """获取 HTTP 请求对象"""
        return self._request
    
    @property
    def user(self):
        """获取当前用户"""
        return self._user
    
    def get_current_role(self):
        """
        获取当前用户的角色
        
        Returns:
            角色代码字符串，如 'ADMIN', 'MENTOR' 等
        """
        if not self._user:
            return None
        return _get_current_role(self._user, self._request)
    
    def validate_not_none(self, value: Optional[T], error_message: str) -> T:
        """
        验证值不为 None
        Args:
            value: 要验证的值
            error_message: 错误消息
        Returns:
            非 None 的值
        Raises:
            BusinessError: 如果值为 None
        """
        if value is None:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message=error_message
            )
        return value
    def validate_permission(self, condition: bool, error_message: str):
        """
        验证权限
        Args:
            condition: 权限条件
            error_message: 错误消息
        Raises:
            BusinessError: 如果权限不足
        """
        if not condition:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message=error_message
            )
    def check_published_resource_access(
        self,
        resource,
        user=None,
        resource_name: str = '资源',
        request=None
    ) -> None:
        """
        检查资源的访问权限
        非管理员只能访问当前版本的资源。
        
        Args:
            resource: 资源对象（必须有 is_current 属性）
            user: 当前用户（可选，优先使用 self.user）
            resource_name: 资源名称（用于错误消息）
            request: HTTP 请求对象（可选，优先使用 self.request）
        Raises:
            BusinessError: 如果权限不足
        """
        # 优先使用 self 属性，向后兼容传参方式
        effective_user = user or self.user
        effective_request = request or self.request
        
        if effective_user and _get_current_role(effective_user, effective_request) != 'ADMIN':
            if not hasattr(resource, 'is_current'):
                return  # 如果资源没有这些属性，跳过检查
            if not resource.is_current:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message=f'无权访问该{resource_name}'
                )

