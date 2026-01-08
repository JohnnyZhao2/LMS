"""
基础服务类
提供通用的服务方法，所有 Service 可以继承此类。
"""
from typing import Optional
from django.db import transaction
from core.exceptions import BusinessError, ErrorCodes
class BaseService:
    """
    基础服务类
    提供通用的验证和错误处理方法。
    """
    def validate_not_none(self, value: any, error_message: str):
        """
        验证值不为 None
        Args:
            value: 要验证的值
            error_message: 错误消息
        Raises:
            BusinessError: 如果值为 None
        """
        if value is None:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message=error_message
            )
    def validate_exists(self, repository, pk: int, resource_name: str):
        """
        验证资源存在
        Args:
            repository: Repository 实例
            pk: 主键
            resource_name: 资源名称（用于错误消息）
        Returns:
            资源对象
        Raises:
            BusinessError: 如果资源不存在
        """
        resource = repository.get_by_id(pk)
        self.validate_not_none(
            resource,
            f'{resource_name} {pk} 不存在'
        )
        return resource
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
        resource_name: str = '资源'
    ) -> None:
        """
        检查已发布资源的访问权限
        非管理员只能访问已发布且当前版本的资源。
        Args:
            resource: 资源对象（必须有 status 和 is_current 属性）
            user: 当前用户
            resource_name: 资源名称（用于错误消息）
        Raises:
            BusinessError: 如果权限不足
        """
        if user and not user.is_admin:
            if not hasattr(resource, 'status') or not hasattr(resource, 'is_current'):
                return  # 如果资源没有这些属性，跳过检查
            if resource.status != 'PUBLISHED' or not resource.is_current:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message=f'无权访问该{resource_name}'
                )
