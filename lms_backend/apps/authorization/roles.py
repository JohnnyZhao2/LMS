"""管理角色序列化。人员范围见 get_managed_user_queryset，只读组织关系。"""

from typing import Optional

from django.db.models import Q, QuerySet

from apps.users.models import MANAGEMENT_ROLE_CODES, ROLE_LABELS


def get_management_role_code(user) -> Optional[str]:
    if not user or not getattr(user, 'is_authenticated', False) or user.is_superuser:
        return None
    return next(
        (code for code in getattr(user, 'role_codes', []) if code in MANAGEMENT_ROLE_CODES),
        None,
    )


def serialize_user_roles(user) -> list[dict[str, str]]:
    if user.is_superuser:
        return []
    return [
        {'code': group.name, 'name': ROLE_LABELS.get(group.name, group.name)}
        for group in user.groups.all()
        if group.name in ROLE_LABELS
    ]


def get_managed_user_queryset(user, base_queryset: QuerySet) -> QuerySet:
    """人员范围 = 组织关系并集，与 Group / 权限码无关。"""
    if not user or not getattr(user, 'is_authenticated', False):
        return base_queryset.none()
    if user.is_admin:
        return base_queryset
    return base_queryset.filter(
        Q(mentor=user) | (Q(department__manager=user) & ~Q(pk=user.pk))
    ).distinct()


def learning_member_queryset() -> QuerySet:
    """可执行学习任务的人员：在职员工。超管是运维号，不进派发名单。"""
    from apps.users.models import User

    return User.objects.filter(is_active=True, is_superuser=False)
