"""资源 owner 可见性：按角色权限对应的数据范围（ALL / DEPT / CUSTOM_DEPT / SELF）判定。"""

from __future__ import annotations

from typing import Optional

from django.db.models import Q, QuerySet

from apps.authorization.engine import AuthorizationDecision
from apps.authorization.models import DataScope


def is_owner_in_scope(
    engine,
    owner_id: Optional[int],
    *,
    permission_code: str,
    owner=None,
) -> bool:
    scope, dept_ids = engine.get_permission_scope(permission_code)

    if scope == DataScope.ALL:
        return True
    user_id = getattr(engine.user, 'id', None)
    if user_id and owner_id == user_id:
        return True
    if scope in (DataScope.DEPT, DataScope.CUSTOM_DEPT) and dept_ids and owner_id:
        if owner is not None:
            return owner.department_id in dept_ids
        from apps.users.models import User

        return User.objects.filter(pk=owner_id, department_id__in=dept_ids).exists()
    return False


def filter_queryset_by_owner_scope(
    engine,
    queryset: QuerySet,
    context=None,
    *,
    permission_code: Optional[str] = None,
    owner_field: str = 'created_by',
) -> QuerySet:
    resolved_code = permission_code or (context or {}).get('_permission_code')
    if not resolved_code:
        raise ValueError('filter_queryset_by_owner_scope 必须提供 permission_code')
    scope, dept_ids = engine.get_permission_scope(resolved_code)

    if scope == DataScope.ALL:
        return queryset
    user_id = getattr(engine.user, 'id', None)
    if not user_id:
        return queryset.none()
    if scope in (DataScope.DEPT, DataScope.CUSTOM_DEPT) and dept_ids:
        return queryset.filter(
            Q(**{f'{owner_field}_id': user_id})
            | Q(**{f'{owner_field}__department_id__in': dept_ids})
        )
    return queryset.filter(**{f'{owner_field}_id': user_id})


def authorize_owned_resource(
    engine,
    permission_code,
    *,
    resource=None,
    context=None,
    error_message: Optional[str] = None,
    resource_model,
    write_codes: frozenset[str],
    write_message: str,
    read_message: str,
):
    """功能权限 + owner scope；Question / Quiz 等自有资源共用。"""
    if not isinstance(resource, resource_model):
        return None
    base = engine.base_permission_decision(permission_code, error_message=error_message)
    if not base.allowed:
        return base
    if is_owner_in_scope(
        engine,
        resource.created_by_id,
        permission_code=permission_code,
        owner=resource._state.fields_cache.get('created_by'),
    ):
        return AuthorizationDecision(True)
    write = permission_code in write_codes
    return AuthorizationDecision(
        False,
        message=error_message or (write_message if write else read_message),
    )
