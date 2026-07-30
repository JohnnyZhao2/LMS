from django.db.models import QuerySet


def filter_owned_queryset(queryset: QuerySet, user, owner_field: str = 'created_by') -> QuerySet:
    if user.is_superuser:
        return queryset
    return queryset.filter(**{owner_field: user})


def is_owned_by_user(resource, user, owner_field: str = 'created_by') -> bool:
    if user.is_superuser:
        return True
    return getattr(resource, f'{owner_field}_id') == user.id
