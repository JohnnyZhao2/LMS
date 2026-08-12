"""资源 owner 可见性：ADMIN/超管看全部创建者，其余管理角色仅自己。"""

from typing import Optional

from django.db.models import QuerySet

from apps.authorization.engine import AuthorizationDecision


def is_owner_in_scope(engine, owner_id: int) -> bool:
    if engine.user.is_admin:
        return True
    return owner_id == getattr(engine.user, 'id', None)


def filter_queryset_by_owner_scope(engine, queryset: QuerySet, context=None) -> QuerySet:
    if engine.user.is_admin:
        return queryset
    user_id = getattr(engine.user, 'id', None)
    if not user_id:
        return queryset.none()
    return queryset.filter(created_by_id=user_id)


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
    if is_owner_in_scope(engine, resource.created_by_id):
        return AuthorizationDecision(True)
    write = permission_code in write_codes
    return AuthorizationDecision(
        False,
        message=error_message or (write_message if write else read_message),
    )
