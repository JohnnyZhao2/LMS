"""
Common mixins for LMS views and models.
Properties: 37, 38, 39
"""
from django.db import models
from django.utils import timezone
from core.exceptions import BusinessError, ErrorCodes
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
    def restore(self):
        """Restore a soft-deleted object."""
        self.is_deleted = False
        self.deleted_at = None
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
class DataScopeMixin:
    """
    Mixin for views that provides automatic data scope filtering based on user role.
    This mixin filters querysets based on the user's role:
    - Admin: Full access to all data (Property 39)
    - Department Manager: Access only to department members' data (Property 38)
    - Mentor: Access only to mentees' data (Property 37)
    - Others: No access (returns empty queryset)
    Properties: 37, 38, 39
    Usage:
        class MyViewSet(DataScopeMixin, viewsets.ModelViewSet):
            # Field name that references the student/user in the model
            data_scope_user_field = 'user'  # default
            # Or for direct User queryset filtering
            data_scope_user_field = None
    The mixin will automatically filter the queryset in get_queryset() method.
    """
    # The field name that references the student User in the model
    # Set to None if the queryset is directly on User model
    data_scope_user_field = 'user'
    def get_current_role(self):
        """
        Get the current active role of the user.
        Returns the role code string or None if not authenticated.
        """
        user = self.request.user
        if not user or not user.is_authenticated:
            return None
        # Check current_role if set (from JWT token)
        if hasattr(user, 'current_role') and user.current_role:
            return user.current_role
        # Determine role from user's roles with priority
        if user.is_admin:
            return 'ADMIN'
        if user.is_dept_manager:
            return 'DEPT_MANAGER'
        if user.is_mentor:
            return 'MENTOR'
        if user.is_team_manager:
            return 'TEAM_MANAGER'
        return 'STUDENT'
    def filter_queryset_by_scope(self, queryset):
        """
        Filter the queryset based on the user's data access scope.
        Args:
            queryset: The queryset to filter
        Returns:
            Filtered queryset based on user's role
        Properties: 37, 38, 39
        """
        user = self.request.user
        if not user or not user.is_authenticated:
            return queryset.none()
        current_role = self.get_current_role()
        # Admin can access all data (Property 39)
        if current_role == 'ADMIN':
            return queryset
        # Build filter based on user field
        user_field = self.data_scope_user_field
        # Mentor can only access their mentees' data (Property 37)
        if current_role == 'MENTOR':
            if user_field:
                filter_kwargs = {f'{user_field}__mentor': user}
            else:
                filter_kwargs = {'mentor': user}
            return queryset.filter(**filter_kwargs)
        # Department manager can only access department members' data (Property 38)
        if current_role == 'DEPT_MANAGER':
            if not user.department_id:
                return queryset.none()
            if user_field:
                filter_kwargs = {f'{user_field}__department_id': user.department_id}
            else:
                filter_kwargs = {'department_id': user.department_id}
            return queryset.filter(**filter_kwargs)
        # Team manager has read-only access to all data
        if current_role == 'TEAM_MANAGER':
            return queryset
        # Default: no access for other roles
        return queryset.none()
    def get_queryset(self):
        """
        Override get_queryset to apply data scope filtering.
        Subclasses should call super().get_queryset() to get the filtered queryset.
        """
        queryset = super().get_queryset()
        return self.filter_queryset_by_scope(queryset)
class StudentDataScopeMixin(DataScopeMixin):
    """
    Specialized mixin for views that directly query User (student) data.
    This is a convenience mixin that sets data_scope_user_field to None,
    indicating that the queryset is directly on the User model.
    Properties: 37, 38, 39
    Usage:
        class StudentListView(StudentDataScopeMixin, ListAPIView):
            queryset = User.objects.filter(is_active=True)
    """
    data_scope_user_field = None
class TaskDataScopeMixin(DataScopeMixin):
    """
    Specialized mixin for views that query task-related data.
    This mixin handles the common case where tasks are assigned to users
    through an 'assignee' or 'user' field.
    Properties: 37, 38, 39
    """
    data_scope_user_field = 'assignee'
    def filter_queryset_by_scope(self, queryset):
        """
        Filter task queryset based on user's role.
        For task creators (admin/mentor/dept_manager), also include tasks they created.
        """
        user = self.request.user
        if not user or not user.is_authenticated:
            return queryset.none()
        current_role = self.get_current_role()
        # Admin can access all tasks
        if current_role == 'ADMIN':
            return queryset
        # For mentors and dept managers, include tasks they created
        # plus tasks assigned to users in their scope
        if current_role in ['MENTOR', 'DEPT_MANAGER']:
            from django.db.models import Q
            # Tasks created by this user
            created_filter = Q(created_by=user)
            # Tasks assigned to users in their scope
            if current_role == 'MENTOR':
                scope_filter = Q(**{f'{self.data_scope_user_field}__mentor': user})
            else:  # DEPT_MANAGER
                if not user.department_id:
                    scope_filter = Q(pk__isnull=True)  # Empty filter
                else:
                    scope_filter = Q(**{f'{self.data_scope_user_field}__department_id': user.department_id})
            return queryset.filter(created_filter | scope_filter).distinct()
        # Team manager has read-only access to all data
        if current_role == 'TEAM_MANAGER':
            return queryset
        # Students can only see their own assigned tasks
        if current_role == 'STUDENT':
            return queryset.filter(**{self.data_scope_user_field: user})
        return queryset.none()
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
        from rest_framework import status
        # 根据错误码映射到相应的 HTTP 状态码
        status_code = self._get_status_code_for_error(error.code)
        response_data = {
            'code': error.code,
            'message': error.message,
            'details': error.details,
        }
        return Response(response_data, status=status_code)
    def _get_status_code_for_error(self, error_code: str) -> int:
        """
        根据错误码返回相应的 HTTP 状态码
        Args:
            error_code: 错误码字符串
        Returns:
            int: HTTP 状态码
        """
        from rest_framework import status
        # 错误码到状态码的映射
        error_code_mapping = {
            ErrorCodes.RESOURCE_NOT_FOUND: status.HTTP_404_NOT_FOUND,
            ErrorCodes.PERMISSION_DENIED: status.HTTP_403_FORBIDDEN,
            ErrorCodes.VALIDATION_ERROR: status.HTTP_400_BAD_REQUEST,
            ErrorCodes.INVALID_OPERATION: status.HTTP_400_BAD_REQUEST,
            ErrorCodes.INVALID_INPUT: status.HTTP_400_BAD_REQUEST,
            ErrorCodes.AUTH_INVALID_CREDENTIALS: status.HTTP_401_UNAUTHORIZED,
            ErrorCodes.AUTH_USER_INACTIVE: status.HTTP_403_FORBIDDEN,
            ErrorCodes.AUTH_INVALID_ROLE: status.HTTP_403_FORBIDDEN,
            ErrorCodes.RESOURCE_REFERENCED: status.HTTP_400_BAD_REQUEST,
            ErrorCodes.RESOURCE_VERSION_MISMATCH: status.HTTP_400_BAD_REQUEST,
            ErrorCodes.USER_HAS_DATA: status.HTTP_400_BAD_REQUEST,
            ErrorCodes.TASK_INVALID_ASSIGNEES: status.HTTP_400_BAD_REQUEST,
            ErrorCodes.TASK_ALREADY_CLOSED: status.HTTP_400_BAD_REQUEST,
            ErrorCodes.EXAM_NOT_IN_WINDOW: status.HTTP_400_BAD_REQUEST,
            ErrorCodes.EXAM_ALREADY_SUBMITTED: status.HTTP_400_BAD_REQUEST,
        }
        # 如果错误码在映射中，返回对应的状态码，否则默认返回 400
        return error_code_mapping.get(error_code, status.HTTP_400_BAD_REQUEST)
