"""
User services for LMS.
"""
from typing import Optional, List
from core.exceptions import BusinessError, ErrorCodes
from core.base_service import BaseService
from .models import User, Role
from .repositories import (
    UserRepository,
    RoleRepository,
    UserRoleRepository,
)


class UserManagementService(BaseService):
    """
    User management service.
    Provides methods for user CRUD operations, activation/deactivation,
    role assignment, and mentor assignment.
    """
    def __init__(self):
        self.user_repository = UserRepository()
        self.role_repository = RoleRepository()
        self.user_role_repository = UserRoleRepository()
    def deactivate_user(self, user_id: int) -> User:
        """
        Deactivate a user.
        Args:
            user_id: The user ID to deactivate
        Returns:
            The deactivated user
        Raises:
            BusinessError: If user not found or user is admin
        Properties:
        - Property 7: 用户停用/启用状态切换
        """
        user = self.user_repository.get_by_id(user_id)
        self.validate_not_none(user, f'用户 {user_id} 不存在')
        # 防止停用超级用户（Django 的 is_superuser）
        if user.is_superuser:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='不能停用超级用户账号'
            )
        user = self.user_repository.update(user, is_active=False)
        return user
    def activate_user(self, user_id: int) -> User:
        """
        Activate a user.
        Args:
            user_id: The user ID to activate
        Returns:
            The activated user
        Raises:
            BusinessError: If user not found
        Properties:
        - Property 7: 用户停用/启用状态切换
        """
        user = self.user_repository.get_by_id(user_id)
        self.validate_not_none(user, f'用户 {user_id} 不存在')
        user = self.user_repository.update(user, is_active=True)
        return user
    def assign_roles(self, user_id: int, role_codes: List[str], assigned_by: User) -> User:
        """
        Assign roles to a user.
        The STUDENT role is always preserved and cannot be removed.
        Args:
            user_id: The user ID to assign roles to
            role_codes: List of role codes to assign (excluding STUDENT)
            assigned_by: The user performing the assignment
        Returns:
            The updated user
        Raises:
            BusinessError: If user not found
        Properties:
        - Property 9: 学员角色不可移除
        """
        from .models import UserRole, Role
        user = self.user_repository.get_by_id(user_id)
        self.validate_not_none(user, f'用户 {user_id} 不存在')
        # Get student role (must always be preserved)
        student_role = self.role_repository.get_or_create_student_role()
        # Get all roles to assign (including STUDENT)
        roles_to_assign = set(role_codes)
        roles_to_assign.add('STUDENT')  # Always include STUDENT
        # Get current roles
        current_role_codes = set(user.roles.values_list('code', flat=True))
        # Remove roles that are not in the new list (except STUDENT)
        roles_to_remove = current_role_codes - roles_to_assign
        if 'STUDENT' in roles_to_remove:
            roles_to_remove.remove('STUDENT')  # Never remove STUDENT
        for role_code in roles_to_remove:
            self.user_role_repository.remove_user_role(user.id, role_code)
        # Add new roles
        roles_to_add = roles_to_assign - current_role_codes
        for role_code in roles_to_add:
            # Get or create the role
            role = self.role_repository.get_by_code(role_code)
            if not role:
                role_name = dict(Role.ROLE_CHOICES).get(role_code, role_code)
                role = self.role_repository.create(
                    code=role_code,
                    name=role_name,
                    description=f'{role_name}角色'
                )
            # Check if user_role already exists
            if not self.user_role_repository.user_has_role(user.id, role_code):
                self.user_role_repository.create_user_role(
                    user_id=user.id,
                    role_id=role.id,
                    assigned_by_id=assigned_by.id
                )
        # Refresh user from database
        user.refresh_from_db()
        return user
    def assign_mentor(self, user_id: int, mentor_id: Optional[int]) -> User:
        """
        Assign a mentor to a user.
        Args:
            user_id: The user ID to assign mentor to
            mentor_id: The mentor user ID, or None to remove mentor
        Returns:
            The updated user
        Raises:
            BusinessError: If user or mentor not found, or mentor is invalid
        Properties:
        - Property 10: 师徒关系唯一性
        """
        user = self.user_repository.get_by_id(user_id)
        self.validate_not_none(user, f'用户 {user_id} 不存在')
        if mentor_id is None:
            # Remove mentor binding
            user = self.user_repository.update(user, mentor_id=None)
        else:
            # Validate mentor
            mentor = self.user_repository.get_by_id(mentor_id)
            self.validate_not_none(mentor, f'导师 {mentor_id} 不存在')
            if not self.user_repository.has_role(mentor.id, 'MENTOR'):
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='指定的用户不是导师'
                )
            if not mentor.is_active:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='指定的导师已被停用'
                )
            if mentor.pk == user.pk:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='不能将自己设为导师'
                )
            # Assign new mentor (automatically replaces old one due to FK)
            user = self.user_repository.update(user, mentor_id=mentor_id)
        return user
