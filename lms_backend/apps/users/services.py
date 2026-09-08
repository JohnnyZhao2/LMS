"""
User services for LMS.
"""
from typing import List, Optional

from apps.activity_logs.decorators import log_user_action
from apps.activity_logs.registry import register_user_log_action
from apps.activity_logs.services import ActivityLogService
from django.contrib.auth.models import Group
from django.db import transaction
from django.db.models.deletion import ProtectedError

from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes

from .avatar_constants import validate_avatar_key
from .models import Department, MANAGEMENT_ROLE_CODES, ROLE_LABELS, User
from .selectors import get_user_by_id, get_valid_mentor_by_id
from .workflows.delete_user import hard_delete_user_business_data

register_user_log_action('role_assigned', group='账号管理', label='分配角色')
register_user_log_action('mentor_assigned', group='账号管理', label='分配导师')


class UserManagementService(BaseService):
    """
    User management service.
    Provides methods for user CRUD operations, role assignment, and mentor assignment.
    """

    def _get_user(self, user_id: int) -> Optional[User]:
        return get_user_by_id(user_id)

    def _validate_user_can_be_deleted(self, user: User) -> None:
        """校验用户是否允许被彻底删除。"""
        if user.is_superuser:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='不能删除超级用户账号'
            )

    def create_user(self, validated_data: dict) -> User:
        department_id = validated_data['department_id']
        password = validated_data['password']
        employee_id = validated_data['employee_id']
        username = validated_data['username']
        mentor_id = validated_data.get('mentor_id')
        role_codes = validated_data.get('role_codes', [])

        with transaction.atomic():
            user = User.objects.create_user(
                employee_id=employee_id,
                username=username,
                password=password,
                department_id=department_id,
            )
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
        previous_department_id = user.department_id

        with transaction.atomic():
            if department_id is not None:
                user.department_id = department_id
            if username is not None:
                user.username = username
            if employee_id is not None:
                user.employee_id = employee_id
            user.save()

            if department_id is not None and department_id != previous_department_id:
                Department.objects.filter(manager=user, pk=previous_department_id).update(manager=None)
                user.refresh_from_db(fields=['department'])

            if role_codes is not None:
                user = self.assign_roles(
                    user_id=user.id,
                    role_codes=role_codes,
                    assigned_by=self.user,
                )
            else:
                self._sync_department_manager(user, 'DEPT_MANAGER' in user.role_codes)

        return user

    def _sync_department_manager(self, user: User, is_department_manager: bool) -> None:
        if user.is_superuser or not is_department_manager:
            Department.objects.filter(manager=user).update(manager=None)
            return
        if not user.department_id:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='用户未分配部门，无法设为室经理',
            )
        department = user.department
        if department.manager_id and department.manager_id != user.id:
            existing = department.manager
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=(
                    f'部门 {department.name} 已有室经理 '
                    f'{existing.employee_id}，每个部门只能有一个室经理'
                ),
            )
        Department.objects.filter(manager=user).exclude(pk=department.pk).update(manager=None)
        if department.manager_id != user.id:
            department.manager = user
            department.save(update_fields=['manager'])

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
        """彻底删除用户及全部关联数据。"""
        user = self._get_user(user_id)
        self.validate_not_none(user, f'用户 {user_id} 不存在')
        self._validate_user_can_be_deleted(user)

        with transaction.atomic():
            hard_delete_user_business_data(user.id)
            self._delete_user_safely(user)

    def assign_roles(self, user_id: int, role_codes: List[str], assigned_by: User) -> User:
        """
        Assign roles to a user.
        role_codes is the full intended set of management roles. Empty means
        a regular employee who can learn without any Group; personal
        user_permissions are cleared on that demotion.
        Superuser accounts cannot be assigned business roles.
        Args:
            user_id: The user ID to assign roles to
            role_codes: Full management role code list to assign
            assigned_by: The user performing the assignment
        Returns:
            The updated user
        Raises:
            BusinessError: If user not found or role constraints violated
        """
        user = self._get_user(user_id)
        self.validate_not_none(user, f'用户 {user_id} 不存在')
        if user.is_superuser:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='超管账号为专有角色，不允许分配业务角色',
            )

        roles_to_assign = {code for code in role_codes if code}
        if len(MANAGEMENT_ROLE_CODES.intersection(roles_to_assign)) > 1:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='系统角色最多只能选择一个',
            )
        current_role_codes = set(user.role_codes)
        roles_to_remove = current_role_codes - roles_to_assign
        roles_to_add = roles_to_assign - current_role_codes

        with transaction.atomic():
            if roles_to_add or roles_to_remove:
                if roles_to_remove:
                    user.groups.remove(*Group.objects.filter(name__in=roles_to_remove))
                roles_by_code = {
                    group.name: group
                    for group in Group.objects.filter(name__in=roles_to_add)
                }
                missing_role_codes = sorted(roles_to_add - set(roles_by_code))
                if missing_role_codes:
                    raise BusinessError(
                        code=ErrorCodes.VALIDATION_ERROR,
                        message=f"角色不存在：{'、'.join(missing_role_codes)}",
                    )
                user.groups.add(*(roles_by_code[role_code] for role_code in roles_to_add))
                user.refresh_from_db()
                user.__dict__.pop('role_codes', None)
            if not MANAGEMENT_ROLE_CODES.intersection(roles_to_assign):
                user.user_permissions.clear()
            for cache_key in ('_perm_cache', '_user_perm_cache', '_group_perm_cache'):
                user.__dict__.pop(cache_key, None)
            self._sync_department_manager(user, 'DEPT_MANAGER' in roles_to_assign)

        if not roles_to_add and not roles_to_remove:
            return user

        added_names = '、'.join([ROLE_LABELS.get(code, code) for code in sorted(roles_to_add)])
        removed_names = '、'.join([ROLE_LABELS.get(code, code) for code in sorted(roles_to_remove)])
        parts = [f'被操作账号：{user.username}（{user.employee_id}）']
        if roles_to_add:
            parts.append(f'新增角色：{added_names}')
        if roles_to_remove:
            parts.append(f'移除角色：{removed_names}')

        ActivityLogService.log_user_action(
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

        ActivityLogService.log_user_action(
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
