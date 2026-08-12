from apps.authorization.engine import AuthorizationDecision
from apps.authorization.roles import get_managed_user_queryset
from apps.users.models import User


def authorize_user_resource(
    engine,
    permission_code,
    *,
    resource=None,
    context=None,
    error_message=None,
):
    """单用户写/读：先功能权限，再校验目标是否在组织关系范围内。"""
    if not isinstance(resource, User):
        return None

    base = engine.base_permission_decision(permission_code, error_message=error_message)
    if not base.allowed:
        return base

    in_scope = get_managed_user_queryset(
        engine.user,
        User.objects.filter(pk=resource.pk),
    ).exists()
    if in_scope:
        return AuthorizationDecision(True)
    return AuthorizationDecision(False, message=error_message or '无权操作该用户')


def filter_viewable_users(engine, *, queryset, context=None):
    return get_managed_user_queryset(engine.user, queryset.distinct())
