"""
User services for LMS.
"""
from types import SimpleNamespace
from typing import List, Optional

from apps.activity_logs.registry import register_user_log_action
from apps.activity_logs.services import ActivityLogService
from apps.authorization.engine import AuthorizationEngine, get_engine
from apps.authorization.models import DataScope, RoleProfile
from apps.authorization.roles import get_group_profile
from django.contrib.auth.models import Group
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.db.models.deletion import ProtectedError

from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes

from .authorization import validate_operator_covers_groups
from .avatar_constants import validate_avatar_key
from .models import Department, MANAGEMENT_ROLE_CODES, User
from .selectors import get_user_by_id, get_valid_mentor_by_id
from .workflows.delete_user import hard_delete_user_business_data

register_user_log_action('role_assigned', group='账号管理', label='分配角色')
register_user_log_action('mentor_assigned', group='账号管理', label='分配导师')


class UserManagementService(BaseService):
    """Provides methods for user CRUD operations, role assignment, and mentor assignment."""

    def _get_operator_engine(self, operator: User) -> AuthorizationEngine:
        if self.request is not None and self.user and self.user.pk == operator.pk:
            return get_engine(self.request)
        return AuthorizationEngine(SimpleNamespace(user=operator))

    def _enforce_department_scope(
        self,
        engine: AuthorizationEngine,
        permission_code_str: str,
        department_id: Optional[int],
        message: str,
    ) -> None:
        scope, allowed_dept_ids = engine.get_permission_scope(permission_code_str)
        if scope != DataScope.ALL and department_id not in allowed_dept_ids:
            raise BusinessError(code=ErrorCodes.PERMISSION_DENIED, message=message)

    def _enforce_dept_bound_roles_on_transfer(
        self,
        engine: AuthorizationEngine,
        user: User,
        previous_department_id: Optional[int],
        new_department_id: int,
        role_codes: Optional[List[str]],
    ) -> None:
        existing = {
            group.name: group
            for group in user.groups.filter(
                Q(name='DEPT_MANAGER') | Q(profile__is_active=True, profile__data_scope=DataScope.DEPT)
            ).select_related('profile').prefetch_related('profile__departments', 'permissions__content_type')
        }
        if not existing:
            return
        engine.enforce(
            'users.assign_user_role',
            resource=user,
            error_message='无权调整持有部门范围或室经理角色用户的部门',
        )
        next_codes = None if role_codes is None else {code for code in role_codes if code}
        retained = existing if next_codes is None else {c: g for c, g in existing.items() if c in next_codes}
        checks = [
            (previous_department_id, existing, '无权调整原部门室经理或部门范围角色用户的部门'),
            *(([(new_department_id, retained, '无权将持有部门范围或室经理角色的用户调整到目标部门')]) if retained else []),
        ]
        for dept_id, roles_map, err_msg in checks:
            self._enforce_department_scope(engine, 'users.assign_user_role', dept_id, err_msg)
            validate_operator_covers_groups(engine, roles_map.values(), effective_department_id=dept_id)

    def create_user(self, validated_data: dict) -> User:
        department_id = validated_data['department_id']
        password = validated_data['password']
        employee_id = validated_data['employee_id']
        username = validated_data['username']
        mentor_id = validated_data.get('mentor_id')
        role_codes = validated_data.get('role_codes', [])

        mentor = get_valid_mentor_by_id(mentor_id) if mentor_id is not None else None

        if self.user is not None:
            engine = self._get_operator_engine(self.user)
            engine.enforce('users.add_user', error_message='只有管理员可以创建用户')
            self._enforce_department_scope(engine, 'users.add_user', department_id, '无权在该部门下创建用户')
            if role_codes:
                engine.require_permission('users.assign_user_role', error_message='无权分配用户角色')
                self._enforce_department_scope(engine, 'users.assign_user_role', department_id, '无权为该部门用户分配角色')
            if mentor is not None:
                self._enforce_department_scope(engine, 'users.add_user', mentor.department_id, '无权指定超出自身部门范围的导师')

        with transaction.atomic():
            user = User.objects.create_user(
                employee_id=employee_id,
                username=username,
                password=password,
                department_id=department_id,
            )
            if mentor is not None:
                user.mentor = mentor
                user.save(update_fields=['mentor'])
            self.assign_roles(user_id=user.id, role_codes=role_codes, assigned_by=self.user)

        return user

    def update_user(self, user: User, validated_data: dict) -> User:
        department_id = validated_data.get('department_id')
        username = validated_data.get('username')
        employee_id = validated_data.get('employee_id')
        role_codes = validated_data.get('role_codes')

        with transaction.atomic():
            user = User.objects.select_for_update(of=('self',)).select_related('department').get(pk=user.pk)
            previous_department_id = user.department_id
            department_changed = department_id is not None and department_id != previous_department_id

            if self.user is not None:
                engine = self._get_operator_engine(self.user)
                engine.enforce('users.change_user', resource=user, error_message='无权更新该用户信息')
                if department_changed:
                    self._enforce_department_scope(engine, 'users.change_user', department_id, '无权将用户调整到该部门')
                if role_codes is not None:
                    engine.enforce('users.assign_user_role', resource=user, error_message='无权分配该用户角色')
                    if department_changed and any(role_codes):
                        self._enforce_department_scope(engine, 'users.assign_user_role', department_id, '无权分配目标部门用户的角色')
                if department_changed and not self.user.is_superuser:
                    self._enforce_dept_bound_roles_on_transfer(
                        engine, user, previous_department_id, department_id, role_codes,
                    )

            if department_id is not None:
                user.department_id = department_id
            if username is not None:
                user.username = username
            if employee_id is not None:
                user.employee_id = employee_id
            user.save()

            if department_changed:
                Department.objects.filter(manager=user, pk=previous_department_id).update(manager=None)
                user.refresh_from_db(fields=['department'])

            if role_codes is not None:
                user = self.assign_roles(
                    user_id=user.id,
                    role_codes=role_codes,
                    assigned_by=self.user,
                    removal_department_id=previous_department_id if department_changed else None,
                )
            else:
                self._sync_department_manager(user, user.has_role('DEPT_MANAGER'))

        return user

    def _sync_department_manager(self, user: User, is_department_manager: bool) -> None:
        if user.is_superuser or not is_department_manager:
            if Department.objects.filter(manager=user).update(manager=None):
                cached_dept = user._state.fields_cache.get('department')
                if cached_dept is not None and cached_dept.manager_id == user.id:
                    cached_dept.manager = None
            return
        if not user.department_id:
            raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='用户未分配部门，无法设为室经理')
        department = Department.objects.select_for_update(of=('self',)).select_related('manager').get(pk=user.department_id)
        if department.manager_id and department.manager_id != user.id:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'部门 {department.name} 已有室经理 {department.manager.employee_id}，每个部门只能有一个室经理',
            )
        Department.objects.filter(manager=user).exclude(pk=department.pk).update(manager=None)
        if department.manager_id != user.id:
            department.manager = user
            department.save(update_fields=['manager'])
        user.department = department

    def _delete_user_safely(self, user: User) -> None:
        """删除用户业务数据与主记录，并将 PROTECT 依赖转换为业务错误。"""
        try:
            hard_delete_user_business_data(user.id)
            user.delete()
        except ProtectedError as error:
            referenced = sorted({obj._meta.verbose_name for obj in error.protected_objects})
            model_list = '、'.join(referenced) if referenced else '未知资源'
            raise BusinessError(code=ErrorCodes.USER_HAS_DATA, message=f'用户仍被以下资源引用：{model_list}，请先清理后再删除')

    def delete_user(self, user_id: int) -> None:
        """彻底删除用户及全部关联数据。"""
        from apps.quizzes.models import QuizQuestion
        from apps.submissions.models import Submission

        with transaction.atomic():
            user = User.objects.select_for_update(of=('self',)).filter(pk=user_id).first()
            self.validate_not_none(user, f'用户 {user_id} 不存在')
            if self.user is not None:
                self._get_operator_engine(self.user).enforce('users.delete_user', resource=user, error_message='无权删除该用户')
            if user.is_superuser:
                raise BusinessError(code=ErrorCodes.PERMISSION_DENIED, message='不能删除超级用户账号')
            if Submission.objects.filter(
                Q(user_id=user.id) | Q(task_assignment__task__created_by_id=user.id) | Q(task_quiz__source_quiz__created_by_id=user.id)
            ).exists():
                raise BusinessError(code=ErrorCodes.USER_HAS_DATA, message='用户关联的答卷或阅卷历史仍存在，不能删除账号')
            if QuizQuestion.objects.filter(question__created_by_id=user.id).exclude(quiz__created_by_id=user.id).exists():
                raise BusinessError(code=ErrorCodes.USER_HAS_DATA, message='该用户创建的题目仍被其他试卷引用，不能删除账号')

            self._delete_user_safely(user)

    def assign_roles(
        self,
        user_id: int,
        role_codes: List[str],
        assigned_by: User,
        *,
        removal_department_id: Optional[int] = None,
    ) -> User:
        """Assign the full intended set of management roles to a user."""
        roles_to_assign = {code for code in role_codes if code}
        if len(MANAGEMENT_ROLE_CODES.intersection(roles_to_assign)) > 1:
            raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='系统角色最多只能选择一个')
        if 'ADMIN' in roles_to_assign and len(roles_to_assign) > 1:
            raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='管理员已拥有全局权限，无需叠加其他专项角色')

        with transaction.atomic():
            user = User.objects.select_for_update(of=('self',)).select_related('department').filter(pk=user_id).first()
            self.validate_not_none(user, f'用户 {user_id} 不存在')
            if user.is_superuser:
                raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='超管账号为专有角色，不允许分配业务角色')

            current_role_codes = set(user.groups.filter(profile__isnull=False).values_list('name', flat=True))
            roles_to_remove = current_role_codes - roles_to_assign
            roles_to_add = roles_to_assign - current_role_codes

            if assigned_by and removal_department_id is None and (roles_to_add or roles_to_remove):
                self._get_operator_engine(assigned_by).enforce('users.assign_user_role', resource=user, error_message='无权分配该用户角色')
            if assigned_by and not assigned_by.is_superuser and ('ADMIN' in roles_to_add or 'ADMIN' in roles_to_remove):
                raise BusinessError(code=ErrorCodes.PERMISSION_DENIED, message='仅超级管理员可分配或调整管理员角色')

            roles_to_validate = roles_to_add | roles_to_remove
            if roles_to_validate:
                # 按 id 升序锁定 RoleProfile，防止并发停用/提权绕过下方校验
                list(RoleProfile.objects.select_for_update(of=('self',)).filter(group__name__in=roles_to_validate).order_by('id').values_list('id', flat=True))
                roles_by_code = {
                    group.name: group
                    for group in Group.objects.select_related('profile')
                    .prefetch_related('profile__departments', 'permissions__content_type')
                    .filter(name__in=roles_to_validate)
                }
            else:
                roles_by_code = {}

            missing = sorted(c for c in roles_to_add if c not in roles_by_code or get_group_profile(roles_by_code[c]) is None)
            if missing:
                raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message=f"角色不存在：{'、'.join(missing)}")
            inactive = sorted(c for c in roles_to_add if not get_group_profile(roles_by_code[c]).is_active)
            if inactive:
                raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message=f"角色已停用，不可分配：{'、'.join(inactive)}")

            if assigned_by and not assigned_by.is_superuser:
                op_engine = self._get_operator_engine(assigned_by)
                if roles_to_add:
                    validate_operator_covers_groups(
                        op_engine,
                        [roles_by_code[c] for c in roles_to_add if c in roles_by_code],
                        effective_department_id=user.department_id,
                    )
                active_removed = [
                    roles_by_code[c]
                    for c in roles_to_remove
                    if c in roles_by_code and (p := get_group_profile(roles_by_code[c])) is not None and p.is_active
                ]
                if active_removed:
                    validate_operator_covers_groups(
                        op_engine,
                        active_removed,
                        effective_department_id=user.department_id if removal_department_id is None else removal_department_id,
                    )

            role_name_by_code = {
                code: (profile.name if (profile := get_group_profile(group)) is not None else code)
                for code, group in roles_by_code.items()
            }

            if roles_to_add or roles_to_remove:
                if roles_to_remove and (groups_to_remove := [roles_by_code[c] for c in roles_to_remove if c in roles_by_code]):
                    user.groups.remove(*groups_to_remove)
                if roles_to_add:
                    try:
                        user.groups.add(*(roles_by_code[c] for c in roles_to_add))
                    except IntegrityError as exc:
                        raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='所选角色已被删除，请刷新后重试') from exc
                user.refresh_from_db()
            for cache_key in ('_perm_cache', '_user_perm_cache', '_group_perm_cache'):
                user.__dict__.pop(cache_key, None)
            self._sync_department_manager(user, 'DEPT_MANAGER' in roles_to_assign)

        if not roles_to_add and not roles_to_remove:
            return user

        parts = [f'被操作账号：{user.username}（{user.employee_id}）']
        if roles_to_add:
            parts.append(f"新增角色：{'、'.join(role_name_by_code.get(c, c) for c in sorted(roles_to_add))}")
        if roles_to_remove:
            parts.append(f"移除角色：{'、'.join(role_name_by_code.get(c, c) for c in sorted(roles_to_remove))}")
        ActivityLogService.log_user_action(
            user=user,
            operator=assigned_by,
            action='role_assigned',
            description='；'.join(parts),
            status='success',
        )
        return user

    def assign_mentor(self, user_id: int, mentor_id: Optional[int]) -> User:
        """Assign or remove a mentor for a user."""
        user = get_user_by_id(user_id)
        self.validate_not_none(user, f'用户 {user_id} 不存在')
        if self.user is not None:
            self._get_operator_engine(self.user).enforce('users.change_user', resource=user, error_message='无权为该用户指定导师')
        if mentor_id is None:
            user.mentor_id = None
            user.save(update_fields=['mentor'])
        else:
            mentor = get_valid_mentor_by_id(mentor_id)
            if mentor.pk == user.pk:
                raise BusinessError(code=ErrorCodes.PERMISSION_DENIED, message='不能将自己设为导师')
            if self.user is not None and not self.user.is_superuser:
                self._enforce_department_scope(
                    self._get_operator_engine(self.user),
                    'users.change_user',
                    mentor.department_id,
                    '无权指定超出自身部门范围的导师',
                )
            user.mentor_id = mentor_id
            user.save(update_fields=['mentor'])

        mentor_label = '已解除绑定' if mentor_id is None else mentor.username
        ActivityLogService.log_user_action(
            user=user,
            operator=self.user,
            action='mentor_assigned',
            description=f'学员：{user.username}（{user.employee_id}）；导师：{mentor_label}',
            status='success',
        )
        return user

    def update_avatar(self, user_id: int, avatar_key: str) -> User:
        user = get_user_by_id(user_id)
        self.validate_not_none(user, f'用户 {user_id} 不存在')
        normalized = validate_avatar_key(avatar_key)
        if user.avatar_key != normalized:
            user.avatar_key = normalized
            user.save(update_fields=['avatar_key'])
        return user
