"""
User services for LMS.
"""
from typing import List, Optional

from apps.activity_logs.services import ActivityLogService
from core.base_service import BaseService
from core.decorators import log_user_action
from core.exceptions import BusinessError, ErrorCodes

from .models import Role, User, UserRole
from .selectors import get_user_by_id


class UserManagementService(BaseService):
    """
    User management service.
    Provides methods for user CRUD operations, activation/deactivation,
    role assignment, and mentor assignment.
    """

    def _get_user(self, user_id: int) -> Optional[User]:
        return get_user_by_id(user_id)

    @log_user_action('deactivate', '管理员 {self.user.employee_id} 停用用户 {result.employee_id}')
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
        user = self._get_user(user_id)
        self.validate_not_none(user, f'用户 {user_id} 不存在')
        # 防止停用超级用户（Django 的 is_superuser）
        if user.is_superuser:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='不能停用超级用户账号'
            )
        user.is_active = False
        user.save(update_fields=['is_active'])
        return user

    @log_user_action('activate', '管理员 {self.user.employee_id} 启用用户 {result.employee_id}')
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
        user = self._get_user(user_id)
        self.validate_not_none(user, f'用户 {user_id} 不存在')
        user.is_active = True
        user.save(update_fields=['is_active'])
        return user

    def _validate_exclusive_roles(self, user: User, role_codes: List[str]) -> None:
        """
        验证专有角色的唯一性约束。
        - 每个部门只能有一个室经理 (DEPT_MANAGER)
        - 全局只能有一个团队经理 (TEAM_MANAGER)
        """
        # 验证团队经理唯一性（全局只能有一个）
        if 'TEAM_MANAGER' in role_codes:
            existing_team_manager = User.objects.filter(
                roles__code='TEAM_MANAGER',
                is_active=True
            ).exclude(pk=user.pk).first()
            if existing_team_manager:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message=f'团队经理角色已被分配给 {existing_team_manager.employee_id}，全局只能有一个团队经理'
                )

        # 验证室经理唯一性（每个部门只能有一个）
        if 'DEPT_MANAGER' in role_codes:
            if not user.department:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='用户未分配部门，无法设置为室经理'
                )
            existing_dept_manager = User.objects.filter(
                roles__code='DEPT_MANAGER',
                department=user.department,
                is_active=True
            ).exclude(pk=user.pk).first()
            if existing_dept_manager:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message=f'部门 {user.department.name} 已有室经理 {existing_dept_manager.employee_id}，每个部门只能有一个室经理'
                )

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
            BusinessError: If user not found or role constraints violated
        Properties:
        - Property 9: 学员角色不可移除
        - 每个部门只能有一个室经理
        - 全局只能有一个团队经理
        """
        user = self._get_user(user_id)
        self.validate_not_none(user, f'用户 {user_id} 不存在')

        # 验证专有角色的唯一性约束
        self._validate_exclusive_roles(user, role_codes)

        # Get student role (must always be preserved)
        Role.objects.get_or_create(
            code='STUDENT',
            defaults={
                'name': '学员',
                'description': '系统默认角色'
            }
        )
        # Get all roles to assign (including STUDENT)
        roles_to_assign = set(role_codes)
        roles_to_assign.add('STUDENT')  # Always include STUDENT
        # Get current roles
        current_role_codes = set(user.roles.values_list('code', flat=True))
        # Remove roles that are not in the new list (except STUDENT)
        roles_to_remove = current_role_codes - roles_to_assign
        if 'STUDENT' in roles_to_remove:
            roles_to_remove.remove('STUDENT')  # Never remove STUDENT
        # Add new roles
        roles_to_add = roles_to_assign - current_role_codes

        if not roles_to_add and not roles_to_remove:
            return user

        if roles_to_remove:
            UserRole.objects.filter(
                user_id=user.id,
                role__code__in=list(roles_to_remove)
            ).delete()
        for role_code in roles_to_add:
            role = Role.objects.filter(code=role_code).first()
            if not role:
                role_name = dict(Role.ROLE_CHOICES).get(role_code, role_code)
                role = Role.objects.create(
                    code=role_code,
                    name=role_name,
                    description=f'{role_name}角色'
                )
            if not user.roles.filter(code=role_code).exists():
                UserRole.objects.create(
                    user_id=user.id,
                    role_id=role.id,
                    assigned_by_id=assigned_by.id
                )
        # Refresh user from database
        user.refresh_from_db()

        # 记录用户日志（只记录实际变更）
        try:
            role_name_map = dict(Role.ROLE_CHOICES)
            added_names = ', '.join([role_name_map.get(code, code) for code in sorted(roles_to_add)])
            removed_names = ', '.join([role_name_map.get(code, code) for code in sorted(roles_to_remove)])
            if roles_to_add and roles_to_remove:
                description = (
                    f'管理员 {assigned_by.employee_id} 调整用户 {user.employee_id} 角色：'
                    f'新增 {added_names}；移除 {removed_names}'
                )
            elif roles_to_add:
                description = f'管理员 {assigned_by.employee_id} 为用户 {user.employee_id} 新增角色：{added_names}'
            else:
                description = f'管理员 {assigned_by.employee_id} 移除用户 {user.employee_id} 角色：{removed_names}'

            ActivityLogService.log_user_action(
                user=user,
                operator=assigned_by,
                action='role_assigned',
                description=description,
                status='success'
            )
        except Exception:
            pass  # 日志记录失败不影响主流程

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
        user = self._get_user(user_id)
        self.validate_not_none(user, f'用户 {user_id} 不存在')
        if mentor_id is None:
            # Remove mentor binding
            user.mentor_id = None
            user.save(update_fields=['mentor'])
        else:
            # Validate mentor
            mentor = self._get_user(mentor_id)
            self.validate_not_none(mentor, f'导师 {mentor_id} 不存在')
            if not mentor.has_role('MENTOR'):
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
            user.mentor_id = mentor_id
            user.save(update_fields=['mentor'])

        # 记录用户日志
        try:
            if mentor_id is None:
                description = f'管理员 {self.user.employee_id} 移除了用户 {user.employee_id} 的导师'
            else:
                mentor = self._get_user(mentor_id)
                description = f'管理员 {self.user.employee_id} 为学员 {user.employee_id} 分配了导师 {mentor.employee_id}'

            ActivityLogService.log_user_action(
                user=user,
                operator=self.user,
                action='mentor_assigned',
                description=description,
                status='success'
            )
        except Exception:
            pass  # 日志记录失败不影响主流程

        return user
