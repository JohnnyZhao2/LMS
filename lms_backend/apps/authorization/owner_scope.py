"""资源 owner 可见性：仅超管看全部创建者，其余（含 ADMIN）只看自己。"""

from django.db.models import QuerySet

from apps.authorization.roles import is_super_admin
from apps.users.models import User


def scoped_owner_queryset(engine) -> QuerySet:
    if is_super_admin(engine.user):
        return User.objects.all()
    user_id = getattr(engine.user, 'id', None)
    if not user_id:
        return User.objects.none()
    return User.objects.filter(pk=user_id)


def filter_queryset_by_owner_scope(engine, queryset: QuerySet) -> QuerySet:
    return queryset.filter(created_by_id__in=scoped_owner_queryset(engine).values('id'))


def is_owner_in_scope(engine, owner_id: int) -> bool:
    return scoped_owner_queryset(engine).filter(id=owner_id).exists()
