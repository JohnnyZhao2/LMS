"""
Common mixins for LMS views and models.
Properties: 37, 38, 39
"""
from django.db import models
from django.utils import timezone

from core.exceptions import BusinessError, get_status_code_for_error


class TimestampMixin(models.Model):
    """
    Mixin that adds created_at and updated_at fields.
    """
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    class Meta:
        abstract = True
class SoftDeleteMixin(models.Model):
    """
    Mixin that adds soft delete functionality.
    """
    is_deleted = models.BooleanField(default=False, verbose_name='是否删除')
    deleted_at = models.DateTimeField(null=True, blank=True, verbose_name='删除时间')
    class Meta:
        abstract = True
    def soft_delete(self):
        """Soft delete the object."""
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=['is_deleted', 'deleted_at'])
class CreatorMixin(models.Model):
    """
    Mixin that tracks the creator of an object.
    """
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.PROTECT,
        related_name='%(class)s_created',
        verbose_name='创建者'
    )
    class Meta:
        abstract = True
class VersionedResourceMixin(models.Model):
    """
    Mixin for versioned resources (Question, Quiz, etc).
    Note: Subclasses must define their own Meta.constraints for uniqueness.
    """
    import uuid as uuid_module
    resource_uuid = models.UUIDField(
        default=uuid_module.uuid4,
        editable=False,
        db_index=True,
        verbose_name='资源标识'
    )
    version_number = models.PositiveIntegerField(
        default=1,
        verbose_name='版本号'
    )
    is_current = models.BooleanField(
        default=True,
        verbose_name='是否当前版本'
    )
    class Meta:
        abstract = True
    @classmethod
    def next_version_number(cls, resource_uuid):
        if not resource_uuid:
            return 1
        aggregate = cls.objects.filter(
            resource_uuid=resource_uuid,
        ).aggregate(
            max_version=models.Max('version_number')
        )
        max_version = aggregate['max_version'] or 0
        return max_version + 1
class BusinessErrorHandlerMixin:
    """
    Mixin for APIView that provides unified BusinessError handling.
    This mixin provides a helper method to convert BusinessError exceptions
    into proper HTTP responses with appropriate status codes.
    Usage:
        class MyView(BusinessErrorHandlerMixin, APIView):
            def post(self, request):
                try:
                    result = self.service.create(...)
                except BusinessError as e:
                    return self.handle_business_error(e)
    """
    def handle_business_error(self, error: BusinessError) -> "Response":
        """
        处理 BusinessError 异常，转换为适当的 HTTP 响应
        Args:
            error: BusinessError 异常实例
        Returns:
            Response: 包含错误信息的 HTTP 响应，状态码根据错误类型自动映射
        """
        from rest_framework.response import Response

        response_data = {
            'code': error.code,
            'message': error.message,
            'details': error.details,
        }
        return Response(response_data, status=get_status_code_for_error(error.code))
