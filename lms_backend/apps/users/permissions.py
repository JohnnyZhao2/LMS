"""
Role-based permission classes for LMS API.
Implements permission control based on user roles and organizational relationships.
Properties:
- Property 37: 导师数据范围限制
- Property 38: 室经理数据范围限制
- Property 39: 管理员全平台数据访问
- Property 40: 无权限请求拒绝
- Property 41: 团队经理只读访问
"""
from rest_framework.permissions import SAFE_METHODS, BasePermission


def get_current_role(user, request=None):
    """
    Get the current active role of a user.
    Args:
        user: The user object
        request: The HTTP request object (optional)
    Returns:
        Role code string or None
    """
    if not user or not user.is_authenticated:
        return None

    # Priority 1: Read from X-Current-Role header if request is provided
    if request:
        header_role = request.META.get('HTTP_X_CURRENT_ROLE')
        if header_role:
            # Validate that the header role is in user's available roles
            user_roles = set(user.role_codes) if hasattr(user, 'role_codes') else set()
            if header_role in user_roles:
                return header_role

    # Priority 2: Use current_role attribute set by authentication
    if hasattr(user, 'current_role') and user.current_role:
        return user.current_role

    # Priority 3: Fall back to role flags
    if user.is_admin:
        return 'ADMIN'
    if user.is_dept_manager:
        return 'DEPT_MANAGER'
    if user.is_mentor:
        return 'MENTOR'
    if user.is_team_manager:
        return 'TEAM_MANAGER'
    return 'STUDENT'


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
    Property 39: 管理员全平台数据访问
    """
    message = '只有管理员可以执行此操作'
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return get_current_role(request.user, request) == 'ADMIN'


class IsMentor(BasePermission):
    """
    Permission class for mentor users.
    Mentors can manage their mentees and create resources.
    Property 37: 导师数据范围限制
    """
    message = '只有导师可以执行此操作'
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return get_current_role(request.user, request) == 'MENTOR'


class IsDeptManager(BasePermission):
    """
    Permission class for department manager users.
    Department managers can manage all members in their department.
    Property 38: 室经理数据范围限制
    """
    message = '只有室经理可以执行此操作'
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return get_current_role(request.user, request) == 'DEPT_MANAGER'



class IsTeamManagerReadOnly(BasePermission):
    """
    Permission class for team manager users with read-only access.
    Team managers can only perform safe methods (GET, HEAD, OPTIONS).
    Write operations (POST, PUT, PATCH, DELETE) are forbidden.
    Property 41: 团队经理只读访问
    """
    message = '团队经理只有只读权限'
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        current_role = get_current_role(request.user, request)
        if current_role == 'TEAM_MANAGER':
            return request.method in SAFE_METHODS
        return False
class IsAdminOrMentorOrDeptManager(BasePermission):
    """
    Permission class for admin, mentor, or department manager users.
    Used for resource creation and management endpoints.
    """
    message = '只有管理员、导师或室经理可以执行此操作'
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return get_current_role(request.user, request) in ['ADMIN', 'MENTOR', 'DEPT_MANAGER']



class IsOwnerOrAdmin(BasePermission):
    """
    Permission class that allows access to resource owners or admins.
    Used for resource editing/deletion where only the creator or admin can modify.
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
        if get_current_role(request.user, request) == 'ADMIN':
            return True
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
    Properties: 37, 38, 39
    """
    message = '无权访问该学员数据'
    def has_permission(self, request, view):
        """Check if user is authenticated and has appropriate role."""
        if not request.user or not request.user.is_authenticated:
            return False
        current_role = get_current_role(request.user, request)
        return current_role in ['ADMIN', 'MENTOR', 'DEPT_MANAGER']
    def has_object_permission(self, request, view, obj):
        """
        Check if user can access the specific student/mentee data.
        obj should be a User object (the student being accessed).
        """
        if not request.user or not request.user.is_authenticated:
            return False
        current_role = get_current_role(request.user, request)
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
    """
    message = '无权为该学员分配任务'
    def has_permission(self, request, view):
        """Check if user is authenticated and has task creation role."""
        if not request.user or not request.user.is_authenticated:
            return False
        current_role = get_current_role(request.user, request)
        return current_role in ['ADMIN', 'MENTOR', 'DEPT_MANAGER']
    def validate_assignees(self, request, student_ids):
        """
        Validate that all student IDs are within the user's scope.
        Returns tuple (is_valid, invalid_ids).
        """
        from apps.users.models import User
        if not student_ids:
            return True, []
        current_role = get_current_role(request.user, request)
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
    Property 35: 抽查学员范围限制
    """
    message = '无权为该学员创建抽查记录'
    def has_permission(self, request, view):
        """Check if user is authenticated and has spot check creation role."""
        if not request.user or not request.user.is_authenticated:
            return False
        current_role = get_current_role(request.user, request)
        return current_role in ['MENTOR', 'DEPT_MANAGER']
    def validate_student(self, request, student_id):
        """
        Validate that the student is within the user's scope.
        Returns True if valid, False otherwise.
        """
        from apps.users.models import User
        if not student_id:
            return False
        current_role = get_current_role(request.user, request)
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
def get_accessible_students(user, current_role=None, request=None):
    """
    Get queryset of students accessible to the given user based on their role.
    Args:
        user: The requesting user
        current_role: The current active role (optional, will be determined from user if not provided)
        request: The HTTP request object (optional, for reading role from header)
    Returns:
        QuerySet of User objects that the user can access (only users with STUDENT role)
    Properties: 37, 38, 39
    """
    from apps.users.models import User
    if not current_role:
        current_role = get_current_role(user, request)

    # 基础查询：只返回有 STUDENT 角色的活跃用户
    base_qs = User.objects.filter(
        is_active=True,
        roles__code='STUDENT'
    ).distinct()

    # Admin can access all students (Property 39)
    if current_role == 'ADMIN':
        return base_qs
    # Mentor can only access their mentees (Property 37)
    if current_role == 'MENTOR':
        return base_qs.filter(mentor=user)
    # Department manager can only access department members (Property 38)
    if current_role == 'DEPT_MANAGER':
        if user.department_id:
            return base_qs.filter(department_id=user.department_id).exclude(pk=user.pk)
        return User.objects.none()
    # Default: no access
    return User.objects.none()
def get_accessible_student_ids(user, current_role=None, request=None):
    """
    Get set of student IDs accessible to the given user.
    This is a convenience function for validation purposes.
    Args:
        user: The requesting user
        current_role: The current active role (optional)
        request: The HTTP request object (optional, for reading role from header)
    Returns:
        Set of user IDs that the user can access
    Properties: 37, 38, 39
    """
    return set(get_accessible_students(user, current_role, request).values_list('id', flat=True))
def filter_queryset_by_data_scope(queryset, user, student_field='user', request=None):
    """
    Filter a queryset based on the user's data access scope.
    Args:
        queryset: The queryset to filter
        user: The requesting user
        student_field: The field name that references the student User.
                       If None, assumes the queryset is directly on User model.
        request: The HTTP request object (optional, for reading role from header)
    Returns:
        Filtered queryset
    Properties: 37, 38, 39
    """
    current_role = get_current_role(user, request)
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

