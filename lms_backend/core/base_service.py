"""
基础服务类
提供通用的服务方法，所有 Service 可以继承此类。
"""
from typing import Optional, TypeVar
from core.exceptions import BusinessError, ErrorCodes
from apps.users.permissions import get_current_role
T = TypeVar('T')
class BaseService:
    """
    基础服务类
    提供通用的验证和错误处理方法。
    """
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
        user,
        resource_name: str = '资源',
        request=None
    ) -> None:
        """
        检查资源的访问权限
        非管理员只能访问当前版本的资源。
        Args:
            resource: 资源对象（必须有 is_current 属性）
            user: 当前用户
            resource_name: 资源名称（用于错误消息）
            request: The HTTP request object (optional)
        Raises:
            BusinessError: 如果权限不足
        """
        if user and get_current_role(user, request) != 'ADMIN':
            if not hasattr(resource, 'is_current'):
                return  # 如果资源没有这些属性，跳过检查
            if not resource.is_current:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message=f'无权访问该{resource_name}'
                )
