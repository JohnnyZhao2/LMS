"""
Common mixins for LMS views and models.

Requirements: 22.1, 22.2, 22.3
Properties: 37, 38, 39
"""
from django.db import models
from django.utils import timezone


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
    
    Requirements: 22.1, 22.2, 22.3
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
            
        Requirements: 22.1, 22.2, 22.3
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
    
    Requirements: 22.1, 22.2, 22.3
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
    
    Requirements: 22.1, 22.2, 22.3
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
