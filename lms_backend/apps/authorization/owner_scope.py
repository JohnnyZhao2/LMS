from django.db.models import QuerySet

from apps.users.models import User


def scoped_owner_queryset(engine, permission_code: str) -> QuerySet:
    return engine.get_scoped_user_queryset(
        permission_code,
        User.objects.all(),
        cache_key=f'{permission_code}:owners',
    )


def filter_queryset_by_owner_scope(engine, permission_code: str, queryset: QuerySet) -> QuerySet:
    return queryset.filter(
        created_by_id__in=scoped_owner_queryset(engine, permission_code).values('id')
    )


def is_owner_in_scope(engine, permission_code: str, owner_id: int) -> bool:
    return scoped_owner_queryset(engine, permission_code).filter(id=owner_id).exists()
