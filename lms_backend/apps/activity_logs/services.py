"""
活动日志服务 - 用于在业务操作中自动记录日志
"""
from typing import Optional

from django.core.cache import cache

from apps.users.models import User

from .constants import LOG_ACTION_INDEX
from .models import ActivityLogPolicy, ContentLog, OperationLog, UserLog


class ActivityLogService:
    """活动日志服务"""

    POLICY_CACHE_PREFIX = 'activity_log_policy:'
    POLICY_CACHE_TTL = 300

    @classmethod
    def _build_cache_key(cls, action_key: str) -> str:
        return f'{cls.POLICY_CACHE_PREFIX}{action_key}'

    @classmethod
    def _ensure_policy(cls, action_key: str) -> ActivityLogPolicy:
        action_def = LOG_ACTION_INDEX.get(action_key)
        if action_def:
            policy, _ = ActivityLogPolicy.objects.get_or_create(
                key=action_key,
                defaults={
                    'category': action_def['category'],
                    'group': action_def['group'],
                    'label': action_def['label'],
                    'enabled': action_def.get('default_enabled', True),
                }
            )
            return policy

        # 未注册的动作，降级为通用策略，默认开启避免漏记
        category = action_key.split('.')[0] if '.' in action_key else 'operation'
        if category not in ['user', 'content', 'operation']:
            category = 'operation'
        policy, _ = ActivityLogPolicy.objects.get_or_create(
            key=action_key,
            defaults={
                'category': category,
                'group': '未分组',
                'label': action_key,
                'enabled': True,
            }
        )
        return policy

    @classmethod
    def is_action_enabled(cls, action_key: str) -> bool:
        if not action_key:
            return True
        cache_key = cls._build_cache_key(action_key)
        cached = cache.get(cache_key)
        if cached is not None:
            return bool(cached)
        try:
            policy = cls._ensure_policy(action_key)
        except Exception:
            # 数据库未就绪或其它异常时，不阻断业务
            return True
        enabled = bool(policy.enabled)
        cache.set(cache_key, enabled, cls.POLICY_CACHE_TTL)
        return enabled

    @classmethod
    def invalidate_policy_cache(cls, action_key: str) -> None:
        cache.delete(cls._build_cache_key(action_key))

    @classmethod
    def sync_policies(cls) -> None:
        for action_key in LOG_ACTION_INDEX.keys():
            try:
                cls._ensure_policy(action_key)
            except Exception:
                continue

    @staticmethod
    def log_user_action(
        user: User,
        action: str,
        description: str,
        operator: Optional[User] = None,
        status: str = 'success',
        action_key: Optional[str] = None,
    ) -> Optional[UserLog]:
        """
        记录用户日志

        Args:
            user: 目标用户
            action: 操作类型 (login, logout, password_change, login_failed, role_assigned, mentor_assigned, activate, deactivate, switch_role)
            description: 操作描述
            operator: 操作者（如果是管理员操作）
            status: 状态 (success, failed)
            action_key: 白名单动作标识（默认 user.{action}）
        """
        policy_key = action_key or f'user.{action}'
        if not ActivityLogService.is_action_enabled(policy_key):
            return None
        return UserLog.objects.create(
            user=user,
            operator=operator,
            action=action,
            description=description,
            status=status,
        )

    @staticmethod
    def log_content_action(
        content_type: str,
        content_id: str,
        content_title: str,
        operator: User,
        action: str,
        description: str,
        status: str = 'success',
        action_key: Optional[str] = None,
    ) -> Optional[ContentLog]:
        """
        记录内容日志

        Args:
            content_type: 内容类型 (knowledge, quiz, question, assignment)
            content_id: 内容ID
            content_title: 内容标题
            operator: 操作者
            action: 操作类型 (create, update, delete, publish)
            description: 操作描述
            status: 状态 (success, failed)
            action_key: 白名单动作标识（默认 content.{content_type}.{action}）
        """
        policy_key = action_key or f'content.{content_type}.{action}'
        if not ActivityLogService.is_action_enabled(policy_key):
            return None
        return ContentLog.objects.create(
            content_type=content_type,
            content_id=str(content_id),
            content_title=content_title,
            operator=operator,
            action=action,
            description=description,
            status=status,
        )

    @staticmethod
    def log_operation(
        operator: User,
        operation_type: str,
        action: str,
        description: str,
        duration: int = 0,
        status: str = 'success',
        action_key: Optional[str] = None,
    ) -> Optional[OperationLog]:
        """
        记录操作日志

        Args:
            operator: 操作者
            operation_type: 操作类型 (task_management, grading, spot_check, data_export, submission, learning)
            action: 操作
            description: 操作描述
            duration: 耗时（毫秒）
            status: 状态 (success, failed, partial)
            action_key: 白名单动作标识（默认 operation.{operation_type}.{action}）
        """
        policy_key = action_key or f'operation.{operation_type}.{action}'
        if not ActivityLogService.is_action_enabled(policy_key):
            return None
        return OperationLog.objects.create(
            operator=operator,
            operation_type=operation_type,
            action=action,
            description=description,
            duration=duration,
            status=status,
        )
