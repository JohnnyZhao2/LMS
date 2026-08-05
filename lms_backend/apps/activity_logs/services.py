"""活动日志服务。"""

from __future__ import annotations

import logging

from django.core.cache import cache

from apps.users.models import User

from .models import ActivityLog, ActivityLogPolicy
from .registry import get_log_action_def, get_log_action_index

logger = logging.getLogger(__name__)


class ActivityLogService:
    POLICY_CACHE_PREFIX = 'activity_log_policy:'
    POLICY_CACHE_TTL = 300

    @classmethod
    def _build_cache_key(cls, action_key: str) -> str:
        return f'{cls.POLICY_CACHE_PREFIX}{action_key}'

    @classmethod
    def _get_policy_defaults(cls, action_key: str) -> dict:
        action_def = get_log_action_def(action_key)
        return {
            'category': action_def['category'],
            'group': action_def['group'],
            'label': action_def['label'],
            'enabled': action_def.get('default_enabled', True),
        }

    @classmethod
    def _ensure_policy(cls, action_key: str) -> ActivityLogPolicy:
        policy, _ = ActivityLogPolicy.objects.get_or_create(
            key=action_key,
            defaults=cls._get_policy_defaults(action_key),
        )
        return policy

    @classmethod
    def is_action_enabled(cls, action_key: str) -> bool:
        cache_key = cls._build_cache_key(action_key)
        cached = cache.get(cache_key)
        if cached is not None:
            return bool(cached)

        enabled = bool(cls._ensure_policy(action_key).enabled)
        cache.set(cache_key, enabled, cls.POLICY_CACHE_TTL)
        return enabled

    @classmethod
    def invalidate_policy_cache(cls, action_key: str) -> None:
        cache.delete(cls._build_cache_key(action_key))

    @classmethod
    def set_policy_enabled(cls, key: str, enabled: bool) -> ActivityLogPolicy:
        policy = cls._ensure_policy(key)
        policy.enabled = enabled
        policy.save(update_fields=['enabled', 'updated_at'])
        cls.invalidate_policy_cache(key)
        return policy

    @classmethod
    def sync_policies(cls) -> None:
        action_index = get_log_action_index()
        valid_keys = set(action_index)
        ActivityLogPolicy.objects.exclude(key__in=valid_keys).delete()

        existing_policies = {
            policy.key: policy
            for policy in ActivityLogPolicy.objects.filter(key__in=valid_keys)
        }
        missing_policies = []
        updated_policies = []
        for action_key, action_def in action_index.items():
            existing = existing_policies.get(action_key)
            if existing is None:
                missing_policies.append(ActivityLogPolicy(key=action_key, **cls._get_policy_defaults(action_key)))
                continue
            changed = False
            for field_name in ('category', 'group', 'label'):
                field_value = action_def[field_name]
                if getattr(existing, field_name) != field_value:
                    setattr(existing, field_name, field_value)
                    changed = True
            if changed:
                updated_policies.append(existing)
        if missing_policies:
            ActivityLogPolicy.objects.bulk_create(missing_policies)
        if updated_policies:
            ActivityLogPolicy.objects.bulk_update(updated_policies, ['category', 'group', 'label'])

    @staticmethod
    def _resolve_actor_name(actor: User | None) -> str:
        return actor.username if actor else '系统'

    @classmethod
    def _build_summary(
        cls,
        *,
        action_key: str,
        actor: User | None,
        summary: str | None,
        target_title: str = '',
    ) -> str:
        if summary:
            return summary
        actor_name = cls._resolve_actor_name(actor)
        label = get_log_action_def(action_key)['label']
        if target_title:
            return f'{actor_name} {label}《{target_title}》'
        return f'{actor_name} {label}'

    @classmethod
    def _create_log(
        cls,
        action_key: str,
        *,
        category: str,
        actor: User | None,
        action: str,
        summary: str,
        description: str,
        status: str = 'success',
        target_type: str = '',
        target_id: str = '',
        target_title: str = '',
        duration: int = 0,
    ) -> ActivityLog | None:
        if not cls.is_action_enabled(action_key):
            return None

        return ActivityLog.objects.create(
            category=category,
            actor=actor,
            action=action,
            summary=summary,
            description=description,
            status=status,
            target_type=target_type,
            target_id=target_id,
            target_title=target_title,
            duration=duration,
        )

    @classmethod
    def log_user_action(
        cls,
        user: User,
        action: str,
        description: str,
        operator: User | None = None,
        status: str = 'success',
        action_key: str | None = None,
        summary: str | None = None,
    ) -> ActivityLog | None:
        actor = operator or user
        resolved_key = action_key or f'user.{action}'
        return cls._create_log(
            resolved_key,
            category='user',
            actor=actor,
            action=action,
            summary=cls._build_summary(
                action_key=resolved_key,
                actor=actor,
                summary=summary,
                target_title=user.username,
            ),
            description=description,
            status=status,
            target_type='user',
            target_id=str(user.id),
            target_title=user.username,
        )

    @classmethod
    def log_content_action(
        cls,
        content_type: str,
        content_id: str,
        content_title: str,
        operator: User,
        action: str,
        description: str,
        status: str = 'success',
        action_key: str | None = None,
        summary: str | None = None,
    ) -> ActivityLog | None:
        resolved_key = action_key or f'content.{content_type}.{action}'
        display_title = content_title
        if content_type == 'question' and len(display_title) > 20:
            display_title = display_title[:20] + '...'
        return cls._create_log(
            resolved_key,
            category='content',
            actor=operator,
            action=action,
            summary=cls._build_summary(
                action_key=resolved_key,
                actor=operator,
                summary=summary,
                target_title='' if content_type == 'question' else display_title,
            ),
            description=description,
            status=status,
            target_type=content_type,
            target_id=str(content_id),
            target_title=content_title,
        )

    @classmethod
    def log_operation(
        cls,
        operator: User | None,
        operation_type: str,
        action: str,
        description: str,
        duration: int = 0,
        status: str = 'success',
        action_key: str | None = None,
        target_type: str = '',
        target_id: str = '',
        target_title: str = '',
        summary: str | None = None,
    ) -> ActivityLog | None:
        resolved_key = action_key or f'operation.{operation_type}.{action}'
        return cls._create_log(
            resolved_key,
            category='operation',
            actor=operator,
            action=action,
            summary=cls._build_summary(
                action_key=resolved_key,
                actor=operator,
                summary=summary,
                target_title=target_title,
            ),
            description=description,
            status=status,
            target_type=target_type or operation_type,
            target_id=str(target_id) if target_id else '',
            target_title=target_title,
            duration=duration,
        )
