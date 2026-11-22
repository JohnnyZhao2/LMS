"""角色与组织数据范围辅助函数。"""

from __future__ import annotations

from typing import Iterable, Optional

from django.contrib.auth.models import Group
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q, QuerySet

from apps.authorization.models import BUILTIN_ROLE_DEFAULTS, DataScope, RoleProfile


def ensure_builtin_role_profiles() -> list[RoleProfile]:
    """幂等初始化内置常规角色 Group 与 RoleProfile。"""
    profiles: list[RoleProfile] = []
    for code, spec in BUILTIN_ROLE_DEFAULTS.items():
        group, _ = Group.objects.get_or_create(name=code)
        profile, _ = RoleProfile.objects.get_or_create(
            group=group,
            defaults={
                'name': spec['name'],
                'data_scope': spec['data_scope'],
                'is_builtin': True,
                'is_active': True,
            },
        )
        profiles.append(profile)
    return profiles


def get_group_profile(group: Group) -> Optional[RoleProfile]:
    try:
        return group.profile
    except ObjectDoesNotExist:
        return None


def serialize_role_profile(
    group: Group,
    profile: RoleProfile,
    *,
    permission_codes: Optional[list[str]] = None,
) -> dict:
    payload = {
        'id': group.id,
        'code': group.name,
        'name': profile.name,
        'data_scope': profile.data_scope,
        'is_builtin': profile.is_builtin,
        'is_active': profile.is_active,
    }
    if permission_codes is not None:
        payload['permission_codes'] = permission_codes
    return payload


def _iter_user_role_profiles(
    user,
    *,
    include_inactive: bool = False,
    include_permissions: bool = False,
) -> list[tuple[Group, RoleProfile]]:
    if not user or not getattr(user, 'is_authenticated', False) or user.is_superuser:
        return []
    prefetched_cache = getattr(user, '_prefetched_objects_cache', None) or {}
    if 'groups' in prefetched_cache and not include_permissions:
        groups = user.groups.all()
    else:
        qs = user.groups.select_related('profile')
        if include_permissions:
            qs = qs.prefetch_related('permissions__content_type')
        groups = qs.all()

    items: list[tuple[Group, RoleProfile]] = []
    for group in groups:
        profile = get_group_profile(group)
        if profile is None:
            continue
        if not include_inactive and not profile.is_active:
            continue
        items.append((group, profile))
    items.sort(key=lambda item: (0 if item[1].is_builtin else 1, item[0].id))
    return items


def serialize_user_roles(
    user,
    *,
    include_inactive: bool = False,
    include_permissions: bool = False,
) -> list[dict]:
    if not user or user.is_superuser:
        return []
    from apps.authorization.selectors import is_assignable_permission, permission_code

    results: list[dict] = []
    for group, profile in _iter_user_role_profiles(
        user,
        include_inactive=include_inactive,
        include_permissions=include_permissions,
    ):
        perms = (
            sorted({
                permission_code(item)
                for item in group.permissions.all()
                if is_assignable_permission(item)
            })
            if include_permissions
            else None
        )
        results.append(serialize_role_profile(group, profile, permission_codes=perms))
    return results


def get_scoped_user_queryset(
    user,
    base_queryset: QuerySet,
    *,
    data_scope: str,
    department_ids: Iterable[int] = (),
) -> QuerySet:
    """根据数据范围与带教关系过滤人员集合。"""
    if not user or not getattr(user, 'is_authenticated', False):
        return base_queryset.none()
    if user.is_superuser or data_scope == DataScope.ALL:
        return base_queryset

    mentor_q = Q(mentor=user)
    if data_scope in (DataScope.DEPT, DataScope.CUSTOM_DEPT):
        raw_dept_ids = [user.department_id] if data_scope == DataScope.DEPT else department_ids
        dept_id_list = [dept_id for dept_id in raw_dept_ids if dept_id is not None]
        if dept_id_list:
            return base_queryset.filter(
                (Q(department_id__in=dept_id_list) & ~Q(pk=user.pk)) | mentor_q
            ).distinct()
    return base_queryset.filter(mentor_q).distinct()


def is_user_in_scope(
    actor,
    target,
    *,
    data_scope: str,
    department_ids: Optional[Iterable[int]] = None,
) -> bool:
    """判断单个目标用户是否在 actor 的数据范围与带教关系内。"""
    if not actor or not getattr(actor, 'is_authenticated', False) or target is None:
        return False
    if actor.is_superuser or data_scope == DataScope.ALL:
        return True
    if target.mentor_id == actor.pk:
        return True
    if data_scope in (DataScope.DEPT, DataScope.CUSTOM_DEPT):
        raw_dept_ids = [actor.department_id] if data_scope == DataScope.DEPT else (department_ids or ())
        dept_id_set = {dept_id for dept_id in raw_dept_ids if dept_id is not None}
        if dept_id_set and target.department_id in dept_id_set and target.pk != actor.pk:
            return True
    return False


def learning_member_queryset() -> QuerySet:
    """可执行学习任务的人员：在职员工。超管是运维号，不进派发名单。"""
    from apps.users.models import User

    return User.objects.filter(is_active=True, is_superuser=False)
