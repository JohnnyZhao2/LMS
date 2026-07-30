"""固定角色人员范围与列表过滤。"""

from typing import Any, Optional, Type

from django.db.models import QuerySet

from apps.authorization.roles import DEPT_ROLE, GLOBAL_ROLE, MENTOR_ROLE, resolve_current_role
from apps.users.models import User

from .constants import SCOPE_FILTER_HANDLERS


def filter_users_by_management_role(*, user, role_code: str, queryset: QuerySet) -> QuerySet:
    if user.is_superuser:
        return queryset
    if role_code == MENTOR_ROLE:
        return queryset.filter(mentor=user)
    if role_code == DEPT_ROLE:
        if not user.department_id:
            return queryset.none()
        return queryset.filter(department_id=user.department_id)
    if role_code == GLOBAL_ROLE:
        return queryset
    return queryset.none()


class ScopedQuerysetEngineMixin:
    def get_current_role(self) -> Optional[str]:
        return resolve_current_role(self.user)

    def scope_filter(
        self,
        permission_code: str,
        *,
        resource_model: Optional[Type[Any]] = None,
        base_queryset: Optional[QuerySet] = None,
        context: Optional[dict[str, Any]] = None,
    ) -> QuerySet:
        queryset = base_queryset
        model = resource_model or (queryset.model if queryset is not None else None)
        if queryset is None:
            if model is None:
                raise ValueError('resource_model 和 base_queryset 不能同时为空')
            queryset = model.objects.all()

        if not self._authorization_service.has_permission(permission_code):
            return queryset.none()

        for handler in SCOPE_FILTER_HANDLERS:
            if handler.permission_code == permission_code and handler.resource_model is model:
                return handler.filter_queryset(self, queryset=queryset, context=context or {})
        return queryset

    def get_role_scoped_user_queryset(
        self,
        user_queryset: QuerySet,
        *,
        cache_key: Optional[str] = None,
    ) -> QuerySet:
        if not self.user or not self.user.is_authenticated:
            return user_queryset.none()
        if self.user.is_superuser:
            return user_queryset

        role_code = self.get_current_role()
        cache = self._get_request_cache()['scoped_user_ids']
        resolved_cache_key = (role_code or '', cache_key or '')
        if cache_key and resolved_cache_key in cache:
            return user_queryset.filter(id__in=cache[resolved_cache_key]).distinct()

        scoped = filter_users_by_management_role(
            user=self.user,
            role_code=role_code,
            queryset=user_queryset,
        ).distinct()
        if cache_key:
            cache[resolved_cache_key] = tuple(scoped.values_list('id', flat=True))
            return user_queryset.filter(id__in=cache[resolved_cache_key]).distinct()
        return scoped

    def get_scoped_learning_members(self) -> QuerySet:
        learners = User.objects.filter(
            is_active=True,
            roles__code='STUDENT',
        ).exclude(is_superuser=True).distinct()
        return self.get_role_scoped_user_queryset(learners, cache_key='learning_members')
