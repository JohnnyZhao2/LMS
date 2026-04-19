"""
User services for LMS.
"""
from typing import List, Optional

from apps.activity_logs.decorators import log_user_action
from apps.activity_logs.registry import register_user_log_action
from django.db import transaction
from django.db.models.deletion import ProtectedError

from core.base_service import BaseService
from core.audit import audit_user_action
from core.exceptions import BusinessError, ErrorCodes

from .avatar_constants import validate_avatar_key
from .models import Role, User, UserRole
from .role_constraints import validate_role_assignment_constraints
from .selectors import get_user_by_id, get_valid_mentor_by_id
from .workflows.delete_user import hard_delete_user_business_data

register_user_log_action('role_assigned', group='账号管理', label='分配角色')
register_user_log_action('mentor_assigned', group='账号管理', label='分配导师')


class UserManagementService(BaseService):
    """
    User management service.
    Provides methods for user CRUD operations, activation/deactivation,
    role assignment, and mentor assignment.
    """

    def _get_user(self, user_id: int) -> Optional[User]:
        return get_user_by_id(user_id)

    @log_user_action(
        'deactivate',
        '被操作账号：{result.username}（{result.employee_id}）',
        group='账号管理',
        label='停用账号',
    )
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

    @log_user_action(
        'activate',
        '被操作账号：{result.username}（{result.employee_id}）',
        group='账号管理',
        label='启用账号',
    )
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

    def _validate_user_can_be_deleted(self, user: User) -> None:
        """校验用户是否允许被彻底删除。"""
        if user.is_superuser:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='不能删除超级用户账号'
            )

        # 仅允许删除离职用户（当前实现：停用用户）
        if user.is_active:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='仅可删除离职（已停用）用户，请先停用该账号'
            )

    def create_user(self, validated_data: dict) -> User:
        department_id = validated_data['department_id']
        password = validated_data['password']
        employee_id = validated_data['employee_id']
        username = validated_data['username']
        mentor_id = validated_data.get('mentor_id')
        role_codes = validated_data.get('role_codes', [])

        user = User(
            username=username,
            employee_id=employee_id,
            department_id=department_id,
        )
        user.set_password(password)

        with transaction.atomic():
            user.save()
            if mentor_id is not None:
                user.mentor = get_valid_mentor_by_id(mentor_id)
                user.save(update_fields=['mentor'])
            self.assign_roles(
                user_id=user.id,
                role_codes=role_codes,
                assigned_by=self.user,
            )

        return user

    def update_user(self, user: User, validated_data: dict) -> User:
        department_id = validated_data.get('department_id')
        username = validated_data.get('username')
        employee_id = validated_data.get('employee_id')
        role_codes = validated_data.get('role_codes')

        with transaction.atomic():
            if department_id is not None:
                user.department_id = department_id
            if username is not None:
                user.username = username
            if employee_id is not None:
                user.employee_id = employee_id
            user.save()

            if role_codes is not None:
                user = self.assign_roles(
                    user_id=user.id,
                    role_codes=role_codes,
                    assigned_by=self.user,
                )

        return user

    def _delete_user_safely(self, user: User) -> None:
        """
        删除用户主记录，并将未知 PROTECT 依赖转换为业务错误。
        """
        try:
            user.delete()
        except ProtectedError as error:
            referenced_models = sorted({
                obj._meta.verbose_name for obj in error.protected_objects
            })
            model_list = '、'.join(referenced_models) if referenced_models else '未知资源'
            raise BusinessError(
                code=ErrorCodes.USER_HAS_DATA,
                message=f'用户仍被以下资源引用：{model_list}，请先清理后再删除'
            )

    def delete_user(self, user_id: int) -> None:
        """
        彻底删除用户及全部关联数据。
        仅允许删除离职（已停用）用户。
        """
        user = self._get_user(user_id)
        self.validate_not_none(user, f'用户 {user_id} 不存在')
        self._validate_user_can_be_deleted(user)

        with transaction.atomic():
            hard_delete_user_business_data(user.id)
            self._delete_user_safely(user)

    def assign_roles(self, user_id: int, role_codes: List[str], assigned_by: User) -> User:
        """
        Assign roles to a user.
        For non-superusers, STUDENT role is preserved unless user is assigned
        department/team manager role.
        Superuser accounts are dedicated and cannot be assigned business roles.
        Args:
            user_id: The user ID to assign roles to
            role_codes: List of role codes to assign (excluding STUDENT)
            assigned_by: The user performing the assignment
        Returns:
            The updated user
        Raises:
            BusinessError: If user not found or role constraints violated
        Properties:
        - 非 STUDENT 系统角色单选（最多一个）
        - Property 9: 室经理/团队经理与学员角色互斥；ADMIN 可叠加学员角色
        - 每个部门只能有一个室经理
        - 全局只能有一个团队经理
        """
        user = self._get_user(user_id)
        self.validate_not_none(user, f'用户 {user_id} 不存在')
        if user.is_superuser:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='超管账号为专有角色，不允许分配业务角色',
            )

        # 统一验证角色约束（专有角色组合、超级管理员限制、唯一性）
        validate_role_assignment_constraints(
            role_codes=role_codes,
            department_id=user.department_id,
            is_superuser=user.is_superuser,
            exclude_user_id=user.id,
        )

        leadership_roles = {'DEPT_MANAGER', 'TEAM_MANAGER'}
        should_keep_student = (
            not user.is_superuser
            and leadership_roles.isdisjoint(set(role_codes))
        )

        # Get all roles to assign
        roles_to_assign = set(role_codes)
        if should_keep_student:
            roles_to_assign.add('STUDENT')
        # Get current roles
        current_role_codes = set(user.roles.values_list('code', flat=True))
        # Remove roles that are not in the new list (except STUDENT)
        roles_to_remove = current_role_codes - roles_to_assign
        if should_keep_student and 'STUDENT' in roles_to_remove:
            roles_to_remove.remove('STUDENT')  # 普通用户永不移除 STUDENT
        # Add new roles
        roles_to_add = roles_to_assign - current_role_codes

        if not roles_to_add and not roles_to_remove:
            return user

        with transaction.atomic():
            if roles_to_remove:
                UserRole.objects.filter(
                    user_id=user.id,
                    role__code__in=list(roles_to_remove)
                ).delete()
            roles_by_code = {
                role.code: role
                for role in Role.objects.filter(code__in=list(roles_to_add))
            }
            missing_role_codes = sorted(roles_to_add - set(roles_by_code))
            if missing_role_codes:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message=f"角色不存在：{'、'.join(missing_role_codes)}",
                )
            for role_code in roles_to_add:
                if not user.roles.filter(code=role_code).exists():
                    UserRole.objects.create(
                        user_id=user.id,
                        role_id=roles_by_code[role_code].id,
                        assigned_by_id=assigned_by.id
                    )
        # Refresh user from database
        user.refresh_from_db()

        role_name_map = dict(Role.ROLE_CHOICES)
        added_names = '、'.join([role_name_map.get(code, code) for code in sorted(roles_to_add)])
        removed_names = '、'.join([role_name_map.get(code, code) for code in sorted(roles_to_remove)])
        parts = [f'被操作账号：{user.username}（{user.employee_id}）']
        if roles_to_add:
            parts.append(f'新增角色：{added_names}')
        if roles_to_remove:
            parts.append(f'移除角色：{removed_names}')

        audit_user_action(
            user=user,
            operator=assigned_by,
            action='role_assigned',
            description='；'.join(parts),
            status='success'
        )

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
            mentor = get_valid_mentor_by_id(mentor_id)
            if mentor.pk == user.pk:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='不能将自己设为导师'
                )
            # Assign new mentor (automatically replaces old one due to FK)
            user.mentor_id = mentor_id
            user.save(update_fields=['mentor'])

        parts = [f'学员：{user.username}（{user.employee_id}）']
        if mentor_id is None:
            parts.append('导师：已解除绑定')
        else:
            mentor = self._get_user(mentor_id)
            parts.append(f'导师：{mentor.username}')

        audit_user_action(
            user=user,
            operator=self.user,
            action='mentor_assigned',
            description='；'.join(parts),
            status='success'
        )

        return user

    def update_avatar(self, user_id: int, avatar_key: str) -> User:
        user = self._get_user(user_id)
        self.validate_not_none(user, f'用户 {user_id} 不存在')

        normalized_avatar_key = validate_avatar_key(avatar_key)
        if user.avatar_key == normalized_avatar_key:
            return user

        user.avatar_key = normalized_avatar_key
        user.save(update_fields=['avatar_key'])
        return user
