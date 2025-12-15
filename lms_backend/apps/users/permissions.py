"""
Role-based permission classes for LMS API.

Implements permission control based on user roles and organizational relationships.

Requirements:
- 22.1: 导师查询学员数据时仅返回其名下学员的数据
- 22.2: 室经理查询学员数据时仅返回本室学员的数据
- 22.3: 管理员查询数据时返回全平台数据
- 22.4: 用户访问 API 接口时根据当前生效角色验证权限
- 22.5: 用户无权访问请求的资源时返回 403 禁止访问错误

Properties:
- Property 37: 导师数据范围限制
- Property 38: 室经理数据范围限制
- Property 39: 管理员全平台数据访问
- Property 40: 无权限请求拒绝
- Property 41: 团队经理只读访问
"""
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAuthenticated(BasePermission):
    """
    Base permission class that checks if user is authenticated.
    """
    message = '请先登录'
    
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class IsAdmin(BasePermission):
    """
    Permission class for admin users.
    
    Admins have full access to all resources across the platform.
    
    Requirements: 22.3, 22.4
    Property 39: 管理员全平台数据访问
    """
    message = '只有管理员可以执行此操作'
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check current_role if set (from JWT token), otherwise check user roles
        if hasattr(request.user, 'current_role'):
            return request.user.current_role == 'ADMIN'
        
        return request.user.is_admin


class IsMentor(BasePermission):
    """
    Permission class for mentor users.
    
    Mentors can manage their mentees and create resources.
    
    Requirements: 22.1, 22.4
    Property 37: 导师数据范围限制
    """
    message = '只有导师可以执行此操作'
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check current_role if set (from JWT token), otherwise check user roles
        if hasattr(request.user, 'current_role'):
            return request.user.current_role == 'MENTOR'
        
        return request.user.is_mentor


class IsDeptManager(BasePermission):
    """
    Permission class for department manager users.
    
    Department managers can manage all members in their department.
    
    Requirements: 22.2, 22.4
    Property 38: 室经理数据范围限制
    """
    message = '只有室经理可以执行此操作'
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check current_role if set (from JWT token), otherwise check user roles
        if hasattr(request.user, 'current_role'):
            return request.user.current_role == 'DEPT_MANAGER'
        
        return request.user.is_dept_manager


class IsTeamManager(BasePermission):
    """
    Permission class for team manager users.
    
    Team managers have read-only access to cross-team data analytics.
    
    Requirements: 21.3, 22.4
    Property 41: 团队经理只读访问
    """
    message = '只有团队经理可以执行此操作'
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check current_role if set (from JWT token), otherwise check user roles
        if hasattr(request.user, 'current_role'):
            return request.user.current_role == 'TEAM_MANAGER'
        
        return request.user.is_team_manager


class IsTeamManagerReadOnly(BasePermission):
    """
    Permission class for team manager users with read-only access.
    
    Team managers can only perform safe methods (GET, HEAD, OPTIONS).
    Write operations (POST, PUT, PATCH, DELETE) are forbidden.
    
    Requirements: 21.3
    Property 41: 团队经理只读访问
    """
    message = '团队经理只有只读权限'
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Get current role
        current_role = None
        if hasattr(request.user, 'current_role'):
            current_role = request.user.current_role
        elif request.user.is_team_manager:
            current_role = 'TEAM_MANAGER'
        
        # Team managers can only use safe methods
        if current_role == 'TEAM_MANAGER':
            return request.method in SAFE_METHODS
        
        return False


class IsAdminOrMentorOrDeptManager(BasePermission):
    """
    Permission class for admin, mentor, or department manager users.
    
    Used for resource creation and management endpoints.
    
    Requirements: 22.4
    """
    message = '只有管理员、导师或室经理可以执行此操作'
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check current_role if set (from JWT token), otherwise check user roles
        if hasattr(request.user, 'current_role'):
            return request.user.current_role in ['ADMIN', 'MENTOR', 'DEPT_MANAGER']
        
        return (
            request.user.is_admin or 
            request.user.is_mentor or 
            request.user.is_dept_manager
        )


class IsOwnerOrAdmin(BasePermission):
    """
    Permission class that allows access to resource owners or admins.
    
    Used for resource editing/deletion where only the creator or admin can modify.
    
    Requirements: 22.4, 22.5
    Property 40: 无权限请求拒绝
    
    Supports objects with:
    - created_by: ForeignKey to User
    - creator: ForeignKey to User
    - user: ForeignKey to User
    - owner: ForeignKey to User
    """
    message = '只有资源创建者或管理员可以执行此操作'
    
    def has_permission(self, request, view):
        """Check if user is authenticated."""
        return bool(request.user and request.user.is_authenticated)
    
    def has_object_permission(self, request, view, obj):
        """Check if user is the owner or an admin."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Admin can access everything
        if hasattr(request.user, 'current_role') and request.user.current_role == 'ADMIN':
            return True
        if request.user.is_admin:
            return True
        
        # Check if user is the owner through various possible field names
        owner_fields = ['created_by', 'creator', 'user', 'owner']
        for field in owner_fields:
            if hasattr(obj, field):
                owner = getattr(obj, field)
                if owner == request.user:
                    return True
        
        return False


class CanAccessMenteeData(BasePermission):
    """
    Permission class for accessing mentee data.
    
    Allows:
    - Admins: Full access to all data
    - Mentors: Access only to their mentees' data
    - Department Managers: Access only to their department members' data
    
    Requirements: 22.1, 22.2, 22.3
    Properties: 37, 38, 39
    """
    message = '无权访问该学员数据'
    
    def has_permission(self, request, view):
        """Check if user is authenticated and has appropriate role."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Get current role
        current_role = None
        if hasattr(request.user, 'current_role'):
            current_role = request.user.current_role
        else:
            if request.user.is_admin:
                current_role = 'ADMIN'
            elif request.user.is_dept_manager:
                current_role = 'DEPT_MANAGER'
            elif request.user.is_mentor:
                current_role = 'MENTOR'
        
        return current_role in ['ADMIN', 'MENTOR', 'DEPT_MANAGER']
    
    def has_object_permission(self, request, view, obj):
        """
        Check if user can access the specific student/mentee data.
        
        obj should be a User object (the student being accessed).
        """
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Get current role
        current_role = None
        if hasattr(request.user, 'current_role'):
            current_role = request.user.current_role
        else:
            if request.user.is_admin:
                current_role = 'ADMIN'
            elif request.user.is_dept_manager:
                current_role = 'DEPT_MANAGER'
            elif request.user.is_mentor:
                current_role = 'MENTOR'
        
        # Admin can access all data
        if current_role == 'ADMIN':
            return True
        
        # Get the student user from the object
        student = self._get_student_from_obj(obj)
        if not student:
            return False
        
        # Mentor can only access their mentees
        if current_role == 'MENTOR':
            return student.mentor_id == request.user.id
        
        # Department manager can only access department members
        if current_role == 'DEPT_MANAGER':
            return (
                request.user.department_id is not None and
                student.department_id == request.user.department_id
            )
        
        return False
    
    def _get_student_from_obj(self, obj):
        """
        Extract the student User from various object types.
        
        Supports:
        - User object directly
        - Objects with 'user' field
        - Objects with 'student' field
        - Objects with 'assignee' field
        """
        from apps.users.models import User
        
        if isinstance(obj, User):
            return obj
        
        for field in ['user', 'student', 'assignee']:
            if hasattr(obj, field):
                return getattr(obj, field)
        
        return None


class CanCreateTaskForStudents(BasePermission):
    """
    Permission class for creating tasks assigned to students.
    
    Validates that the creator can only assign tasks to students within their scope:
    - Admins: Can assign to any student
    - Mentors: Can only assign to their mentees
    - Department Managers: Can only assign to their department members
    
    Requirements: 7.2, 7.3, 7.4, 9.2, 9.3, 9.4, 11.3, 11.4, 11.5
    """
    message = '无权为该学员分配任务'
    
    def has_permission(self, request, view):
        """Check if user is authenticated and has task creation role."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Get current role
        current_role = None
        if hasattr(request.user, 'current_role'):
            current_role = request.user.current_role
        else:
            if request.user.is_admin:
                current_role = 'ADMIN'
            elif request.user.is_dept_manager:
                current_role = 'DEPT_MANAGER'
            elif request.user.is_mentor:
                current_role = 'MENTOR'
        
        return current_role in ['ADMIN', 'MENTOR', 'DEPT_MANAGER']
    
    def validate_assignees(self, request, student_ids):
        """
        Validate that all student IDs are within the user's scope.
        
        Returns tuple (is_valid, invalid_ids).
        """
        from apps.users.models import User
        
        if not student_ids:
            return True, []
        
        # Get current role
        current_role = None
        if hasattr(request.user, 'current_role'):
            current_role = request.user.current_role
        else:
            if request.user.is_admin:
                current_role = 'ADMIN'
            elif request.user.is_dept_manager:
                current_role = 'DEPT_MANAGER'
            elif request.user.is_mentor:
                current_role = 'MENTOR'
        
        # Admin can assign to anyone
        if current_role == 'ADMIN':
            return True, []
        
        # Get valid student IDs based on role
        if current_role == 'MENTOR':
            valid_ids = set(
                User.objects.filter(
                    mentor=request.user,
                    is_active=True
                ).values_list('id', flat=True)
            )
        elif current_role == 'DEPT_MANAGER':
            if not request.user.department_id:
                return False, list(student_ids)
            valid_ids = set(
                User.objects.filter(
                    department_id=request.user.department_id,
                    is_active=True
                ).exclude(pk=request.user.pk).values_list('id', flat=True)
            )
        else:
            return False, list(student_ids)
        
        # Check for invalid IDs
        student_id_set = set(student_ids)
        invalid_ids = student_id_set - valid_ids
        
        return len(invalid_ids) == 0, list(invalid_ids)


class CanCreateSpotCheck(BasePermission):
    """
    Permission class for creating spot check records.
    
    Validates that the creator can only create spot checks for students within their scope:
    - Mentors: Can only create for their mentees
    - Department Managers: Can only create for their department members
    
    Requirements: 14.2, 14.3
    Property 35: 抽查学员范围限制
    """
    message = '无权为该学员创建抽查记录'
    
    def has_permission(self, request, view):
        """Check if user is authenticated and has spot check creation role."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Get current role
        current_role = None
        if hasattr(request.user, 'current_role'):
            current_role = request.user.current_role
        else:
            if request.user.is_dept_manager:
                current_role = 'DEPT_MANAGER'
            elif request.user.is_mentor:
                current_role = 'MENTOR'
        
        return current_role in ['MENTOR', 'DEPT_MANAGER']
    
    def validate_student(self, request, student_id):
        """
        Validate that the student is within the user's scope.
        
        Returns True if valid, False otherwise.
        """
        from apps.users.models import User
        
        if not student_id:
            return False
        
        # Get current role
        current_role = None
        if hasattr(request.user, 'current_role'):
            current_role = request.user.current_role
        else:
            if request.user.is_dept_manager:
                current_role = 'DEPT_MANAGER'
            elif request.user.is_mentor:
                current_role = 'MENTOR'
        
        try:
            student = User.objects.get(pk=student_id, is_active=True)
        except User.DoesNotExist:
            return False
        
        # Mentor can only create for their mentees
        if current_role == 'MENTOR':
            return student.mentor_id == request.user.id
        
        # Department manager can only create for department members
        if current_role == 'DEPT_MANAGER':
            return (
                request.user.department_id is not None and
                student.department_id == request.user.department_id
            )
        
        return False


# Utility functions for data scope filtering

def get_current_role(user):
    """
    Get the current active role of a user.
    
    Args:
        user: The user object
        
    Returns:
        Role code string or None
    """
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


def get_accessible_students(user, current_role=None):
    """
    Get queryset of students accessible to the given user based on their role.
    
    Args:
        user: The requesting user
        current_role: The current active role (optional, will be determined from user if not provided)
    
    Returns:
        QuerySet of User objects that the user can access
    
    Requirements: 22.1, 22.2, 22.3
    Properties: 37, 38, 39
    """
    from apps.users.models import User
    
    if not current_role:
        current_role = get_current_role(user)
    
    # Admin can access all students (Property 39)
    if current_role == 'ADMIN':
        return User.objects.filter(is_active=True)
    
    # Mentor can only access their mentees (Property 37)
    if current_role == 'MENTOR':
        return User.objects.filter(mentor=user, is_active=True)
    
    # Department manager can only access department members (Property 38)
    if current_role == 'DEPT_MANAGER':
        if user.department_id:
            return User.objects.filter(
                department_id=user.department_id,
                is_active=True
            ).exclude(pk=user.pk)
        return User.objects.none()
    
    # Default: no access
    return User.objects.none()


def get_accessible_student_ids(user, current_role=None):
    """
    Get set of student IDs accessible to the given user.
    
    This is a convenience function for validation purposes.
    
    Args:
        user: The requesting user
        current_role: The current active role (optional)
    
    Returns:
        Set of user IDs that the user can access
    
    Requirements: 22.1, 22.2, 22.3
    Properties: 37, 38, 39
    """
    return set(get_accessible_students(user, current_role).values_list('id', flat=True))


def filter_queryset_by_data_scope(queryset, user, student_field='user'):
    """
    Filter a queryset based on the user's data access scope.
    
    Args:
        queryset: The queryset to filter
        user: The requesting user
        student_field: The field name that references the student User.
                       If None, assumes the queryset is directly on User model.
    
    Returns:
        Filtered queryset
    
    Requirements: 22.1, 22.2, 22.3
    Properties: 37, 38, 39
    """
    current_role = get_current_role(user)
    
    # Admin can access all data (Property 39)
    if current_role == 'ADMIN':
        return queryset
    
    # Mentor can only access their mentees' data (Property 37)
    if current_role == 'MENTOR':
        if student_field:
            filter_kwargs = {f'{student_field}__mentor': user}
        else:
            # Direct User queryset
            filter_kwargs = {'mentor': user}
        return queryset.filter(**filter_kwargs)
    
    # Department manager can only access department members' data (Property 38)
    if current_role == 'DEPT_MANAGER':
        if user.department_id:
            if student_field:
                filter_kwargs = {f'{student_field}__department_id': user.department_id}
            else:
                # Direct User queryset
                filter_kwargs = {'department_id': user.department_id}
            return queryset.filter(**filter_kwargs)
        return queryset.none()
    
    # Default: no access
    return queryset.none()


def is_student_in_scope(user, student_id, current_role=None):
    """
    Check if a specific student is within the user's data access scope.
    
    Args:
        user: The requesting user
        student_id: The ID of the student to check
        current_role: The current active role (optional)
    
    Returns:
        True if the student is accessible, False otherwise
    
    Requirements: 22.1, 22.2, 22.3
    Properties: 37, 38, 39
    """
    from apps.users.models import User
    
    if not current_role:
        current_role = get_current_role(user)
    
    # Admin can access all students (Property 39)
    if current_role == 'ADMIN':
        return User.objects.filter(pk=student_id, is_active=True).exists()
    
    # Mentor can only access their mentees (Property 37)
    if current_role == 'MENTOR':
        return User.objects.filter(pk=student_id, mentor=user, is_active=True).exists()
    
    # Department manager can only access department members (Property 38)
    if current_role == 'DEPT_MANAGER':
        if user.department_id:
            return User.objects.filter(
                pk=student_id,
                department_id=user.department_id,
                is_active=True
            ).exclude(pk=user.pk).exists()
        return False
    
    return False


def validate_students_in_scope(user, student_ids, current_role=None):
    """
    Validate that all student IDs are within the user's data access scope.
    
    Args:
        user: The requesting user
        student_ids: List/set of student IDs to validate
        current_role: The current active role (optional)
    
    Returns:
        Tuple of (is_valid, invalid_ids)
        - is_valid: True if all students are in scope
        - invalid_ids: List of student IDs that are not in scope
    
    Requirements: 22.1, 22.2, 22.3
    Properties: 37, 38, 39
    """
    if not student_ids:
        return True, []
    
    accessible_ids = get_accessible_student_ids(user, current_role)
    student_id_set = set(student_ids)
    invalid_ids = student_id_set - accessible_ids
    
    return len(invalid_ids) == 0, list(invalid_ids)
