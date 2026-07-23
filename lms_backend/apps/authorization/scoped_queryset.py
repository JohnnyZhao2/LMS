"""列表范围过滤。

能力开关确认后，读取最终 RoleScope / UserRoleScope，构造 ResolvedScope，
交给模块 scope_filter_handler；人员池解析将 OWN 视作当前用户本人。
"""

from typing import Any, Optional, Type

from django.db.models import QuerySet

from apps.authorization.roles import resolve_current_role
from apps.users.models import User

from .constants import (
    SCOPE_AWARE_PERMISSION_CODES,
    SCOPE_ALL,
    SCOPE_DEPARTMENT,
    SCOPE_EXPLICIT_USERS,
    SCOPE_FILTER_HANDLERS,
    SCOPE_MENTEES,
    SCOPE_OWN,
    SCOPE_SELF,
)


class ScopedQuerysetEngineMixin:
    """把最终范围解析为 queryset 过滤条件。"""

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

        if permission_code in SCOPE_AWARE_PERMISSION_CODES:
            has_capability = self._authorization_service.is_capability_granted(permission_code)
        else:
            has_capability = self._authorization_service._is_permission_granted(permission_code)
        if not has_capability:
            return queryset.none()

        resolved_scope = None
        if permission_code in SCOPE_AWARE_PERMISSION_CODES:
            resolved_scope = self._authorization_service.get_resolved_scope(permission_code)
            if resolved_scope is None:
                return queryset.none()

        for handler in SCOPE_FILTER_HANDLERS:
            if handler.permission_code != permission_code or handler.resource_model is not model:
                continue
            return handler.filter_queryset(
                self,
                queryset=queryset,
                resolved_scope=resolved_scope,
                context=context or {},
            )

        if permission_code in SCOPE_AWARE_PERMISSION_CODES:
            return queryset.none()
        return queryset

    def get_scoped_learning_members(self, permission_code: str) -> QuerySet:
        return self.get_scoped_user_queryset(
            permission_code,
            self._learning_member_queryset(),
            cache_key='learning_members',
        )

    def get_scoped_user_queryset(
        self,
        permission_code: str,
        user_queryset: QuerySet,
        *,
        cache_key: Optional[str] = None,
    ) -> QuerySet:
        scoped_queryset = user_queryset
        if not self.user or not getattr(self.user, 'is_authenticated', False):
            return scoped_queryset.none()
        if getattr(self.user, 'is_superuser', False):
            return scoped_queryset

        if cache_key:
            cached_ids = self._get_request_cache()['scoped_user_ids'].get((permission_code, cache_key))
            if cached_ids is not None:
                if not cached_ids:
                    return scoped_queryset.none()
                return scoped_queryset.filter(id__in=cached_ids).distinct()

        if not self._authorization_service.is_capability_granted(permission_code):
            if cache_key:
                self._get_request_cache()['scoped_user_ids'][(permission_code, cache_key)] = set()
            return scoped_queryset.none()

        resolved_scope = self._authorization_service.get_resolved_scope(permission_code)
        if resolved_scope is None:
            if cache_key:
                self._get_request_cache()['scoped_user_ids'][(permission_code, cache_key)] = set()
            return scoped_queryset.none()

        final_ids = self._resolve_single_scope_ids(
            scope_type=resolved_scope.scope_type,
            scope_user_ids=list(resolved_scope.member_ids),
            user_queryset=scoped_queryset,
        )
        if cache_key:
            self._get_request_cache()['scoped_user_ids'][(permission_code, cache_key)] = final_ids
        if not final_ids:
            return scoped_queryset.none()
        return scoped_queryset.filter(id__in=final_ids).distinct()

    def _learning_member_queryset(self) -> QuerySet:
        """学习对象人员池：活跃学员（含兼任管理角色），排除超管。"""
        return User.objects.filter(
            is_active=True,
            is_superuser=False,
            roles__code='STUDENT',
        ).distinct()

    def _resolve_single_scope_ids(
        self,
        *,
        scope_type: str,
        scope_user_ids: list[int],
        user_queryset: QuerySet,
    ) -> set[int]:
        if scope_type == SCOPE_ALL:
            return set(user_queryset.values_list('id', flat=True))
        # DATA.OWN 与旧 DATA.SELF 等价：当前用户自己
        if scope_type in {SCOPE_SELF, SCOPE_OWN}:
            return set(user_queryset.filter(pk=getattr(self.user, 'id', None)).values_list('id', flat=True))
        if scope_type == SCOPE_MENTEES:
            return set(user_queryset.filter(mentor=self.user).values_list('id', flat=True))
        if scope_type == SCOPE_DEPARTMENT:
            if not getattr(self.user, 'department_id', None):
                return set()
            return set(
                user_queryset.filter(department_id=self.user.department_id).exclude(
                    pk=getattr(self.user, 'id', None),
                ).values_list('id', flat=True)
            )
        if scope_type == SCOPE_EXPLICIT_USERS:
            if not scope_user_ids:
                return set()
            return set(user_queryset.filter(id__in=scope_user_ids).values_list('id', flat=True))
        return set()
