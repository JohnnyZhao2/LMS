"""列表范围过滤。

资源级 `authorize` 负责单对象判定；本模块负责列表页和选择器的 queryset 收窄。
默认范围来自各模块 `authorization.py` 的 `scope_rules`，用户例外来自数据库里的
用户范围组覆盖。
"""

from typing import Any, Optional, Type

from django.db.models import Q, QuerySet

from apps.authorization.roles import LEARNING_POOL_EXCLUDED_ROLE_CODES, resolve_current_role
from apps.users.models import User

from .constants import (
    EFFECT_ALLOW,
    EFFECT_DENY,
    SCOPE_AWARE_PERMISSION_CODES,
    SCOPE_ALL,
    SCOPE_DEPARTMENT,
    SCOPE_EXPLICIT_USERS,
    SCOPE_FILTER_HANDLERS,
    SCOPE_MENTEES,
    SCOPE_SELF,
)


class ScopedQuerysetEngineMixin:
    """把权限范围解析为 queryset 过滤条件。"""

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

        # scope-aware 权限的“能力开关”和“可见范围”分开计算：
        # 先确认用户拥有能力，再按默认范围和用户覆盖收窄列表。
        if permission_code in SCOPE_AWARE_PERMISSION_CODES:
            has_capability = self._authorization_service.is_capability_granted(permission_code)
        else:
            has_capability = self._authorization_service._is_permission_granted(permission_code)
        if not has_capability:
            return queryset.none()

        for handler in SCOPE_FILTER_HANDLERS:
            if handler.permission_code != permission_code or handler.resource_model is not model:
                continue
            return handler.filter_queryset(
                self,
                queryset=queryset,
                context=context or {},
            )

        return queryset

    def has_allow_override(self, permission_code: str) -> bool:
        return self._authorization_service.has_allow_override(permission_code)

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

        current_role = self.get_current_role()
        if not current_role:
            return scoped_queryset.none()

        default_scope_types = self._get_default_scope_types(permission_code, current_role)
        default_ids = self._resolve_scope_ids(
            scope_types=default_scope_types,
            user_queryset=scoped_queryset,
        )
        allow_ids: set[int] = set()
        deny_ids: set[int] = set()

        # 新模型优先用 scope_group 覆盖；没有范围组的旧权限点才读取单权限覆盖。
        scope_group_key = self._authorization_service._get_scope_group_key(permission_code)
        if scope_group_key:
            overrides = self._authorization_service._list_active_scope_group_overrides_cached(
                user_id=self.user.id,
                current_role=current_role,
                scope_group_key=scope_group_key,
            )
        else:
            overrides = self._authorization_service._list_active_user_overrides_cached(
                user_id=self.user.id,
                current_role=current_role,
                permission_code=permission_code,
            )

        for override in overrides:
            scope_ids = self._resolve_single_scope_ids(
                scope_type=override.scope_type,
                scope_user_ids=override.scope_user_ids or [],
                user_queryset=scoped_queryset,
            )
            if override.effect == EFFECT_DENY:
                deny_ids.update(scope_ids)
            elif override.effect == EFFECT_ALLOW:
                allow_ids.update(scope_ids)

        # 最终可见范围 = 默认范围移除显式拒绝，再加入显式允许。
        # 角色默认范围和用户覆盖统一按同一规则合并。
        final_ids = (default_ids - deny_ids) | allow_ids
        if cache_key:
            self._get_request_cache()['scoped_user_ids'][(permission_code, cache_key)] = final_ids
        if not final_ids:
            return scoped_queryset.none()
        return scoped_queryset.filter(id__in=final_ids).distinct()

    def _learning_member_queryset(self) -> QuerySet:
        excluded_ids = User.objects.filter(
            Q(is_superuser=True) | Q(roles__code__in=LEARNING_POOL_EXCLUDED_ROLE_CODES),
        ).values_list('id', flat=True)
        return User.objects.filter(
            is_active=True,
            roles__code='STUDENT',
        ).exclude(id__in=excluded_ids).distinct()

    def _get_default_scope_types(self, permission_code: str, role_code: str) -> list[str]:
        cache_key = (permission_code, role_code)
        cached_scope_types = self._get_request_cache()['default_scope_types'].get(cache_key)
        if cached_scope_types is not None:
            return list(cached_scope_types)

        scope_types = list(
            self._authorization_service.get_permission_scope_types(
                permission_code=permission_code,
                current_role=role_code,
            )
        )
        self._get_request_cache()['default_scope_types'][cache_key] = tuple(scope_types)
        return scope_types

    def _resolve_scope_ids(
        self,
        *,
        scope_types: list[str],
        user_queryset: QuerySet,
    ) -> set[int]:
        resolved_ids: set[int] = set()
        for scope_type in scope_types:
            resolved_ids.update(
                self._resolve_single_scope_ids(
                    scope_type=scope_type,
                    scope_user_ids=[],
                    user_queryset=user_queryset,
                )
            )
        return resolved_ids

    def _resolve_single_scope_ids(
        self,
        *,
        scope_type: str,
        scope_user_ids: list[int],
        user_queryset: QuerySet,
    ) -> set[int]:
        if scope_type == SCOPE_ALL:
            return set(user_queryset.values_list('id', flat=True))
        if scope_type == SCOPE_SELF:
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
