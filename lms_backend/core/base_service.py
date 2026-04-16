"""
基础服务类
提供通用的服务方法，所有 Service 可以继承此类。

使用方式（构造器注入）:
    service = MyService(request)
    result = service.do_something()  # 内部通过 self.user, self.request 访问
"""
from typing import Optional, TypeVar

from apps.authorization.roles import get_current_role as _get_current_role, is_admin_like_role as _is_admin_like_role
from core.exceptions import BusinessError, ErrorCodes

T = TypeVar('T')


class BaseService:
    """
    基础服务类
    
    支持构造器注入 request，提供：
    - self.request: HTTP 请求对象
    - self.user: 当前用户
    - self.get_current_role(): 获取当前角色
    
    """
    
    def __init__(self, request):
        """
        初始化服务
        
        Args:
            request: HTTP 请求对象（必传）
        """
        if request is None:
            raise ValueError('request 不能为空')
        self._request = request
        self._user = request.user if hasattr(request, 'user') else None
    
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
        return _get_current_role(self._user)
    
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
