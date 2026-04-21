"""
活动日志服务
"""
from typing import Optional

from django.core.cache import cache

from apps.users.models import User

from .models import ActivityLog, ActivityLogPolicy
from .registry import get_log_action_def, get_log_action_index

_USER_ACTION_SUMMARIES = {
    'login': '{actor} 登录成功',
    'logout': '{actor} 退出登录',
    'login_failed': '{actor} 登录失败',
    'switch_role': '{actor} 切换了角色',
    'password_change': '{actor} 修改了用户密码',
    'role_assigned': '{actor} 更新了用户角色',
    'mentor_assigned': '{actor} 分配了导师',
    'activate': '{actor} 启用了用户账号',
    'deactivate': '{actor} 停用了用户账号',
}

_CONTENT_TYPE_NAMES = {
    'knowledge': '知识文档',
    'quiz': '试卷',
    'question': '题目',
    'assignment': '作业',
    'tag': '标签',
}

_CONTENT_ACTION_VERBS = {
    'create': '创建了',
    'update': '更新了',
    'delete': '删除了',
    'publish': '发布了',
}

_OPERATION_ACTION_SUMMARIES = {
    'create_and_assign': '{actor} 创建了任务《{target}》',
    'update_task': '{actor} 更新了任务《{target}》',
    'delete_task': '{actor} 删除了任务《{target}》',
    'create_spot_check': '{actor} 抽查了 {target}',
    'update_spot_check': '{actor} 更新了 {target} 的抽查记录',
    'delete_spot_check': '{actor} 删除了 {target} 的抽查记录',
    'manual_grade': '{actor} 批改了答卷',
    'batch_grade': '{actor} 批量评分',
    'replace_role_permissions': '{actor} 更新了角色模板《{target}》的权限',
    'create_user_permission_override': '{actor} 新增了 {target} 的权限覆盖',
    'revoke_user_permission_override': '{actor} 撤销了 {target} 的权限覆盖',
    'create_user_scope_group_override': '{actor} 新增了 {target} 的范围组覆盖',
    'revoke_user_scope_group_override': '{actor} 撤销了 {target} 的范围组覆盖',
    'merge_tags': '{actor} 合并了标签《{target}》',
    'reorder_spaces': '{actor} 调整了空间标签顺序',
    'start_quiz': '{actor} 开始答题《{target}》',
    'submit': '{actor} 提交了《{target}》',
    'submit_quiz': '{actor} 提交了《{target}》',
    'complete_knowledge': '{actor} 完成了知识学习《{target}》',
}


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
    def _resolve_actor_name(actor: Optional[User]) -> str:
        return actor.username if actor else '系统'

    @classmethod
    def _create_log(
        cls,
        action_key: str,
        *,
        category: str,
        actor: Optional[User],
        action: str,
        summary: str,
        description: str,
        status: str = 'success',
        target_type: str = '',
        target_id: str = '',
        target_title: str = '',
        duration: int = 0,
    ) -> Optional[ActivityLog]:
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
        operator: Optional[User] = None,
        status: str = 'success',
        action_key: Optional[str] = None,
    ) -> Optional[ActivityLog]:
        actor = operator or user
        actor_name = cls._resolve_actor_name(actor)
        template = _USER_ACTION_SUMMARIES.get(action, '{actor} 执行了 ' + action)
        return cls._create_log(
            action_key or f'user.{action}',
            category='user',
            actor=actor,
            action=action,
            summary=template.format(actor=actor_name, user=user.username),
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
        action_key: Optional[str] = None,
    ) -> Optional[ActivityLog]:
        actor_name = cls._resolve_actor_name(operator)
        verb = _CONTENT_ACTION_VERBS.get(action, action)
        type_name = _CONTENT_TYPE_NAMES.get(content_type, content_type)
        resolved_title = content_title or ''
        if content_type == 'question' and len(resolved_title) > 20:
            resolved_title = resolved_title[:20] + '...'
        if resolved_title and content_type != 'question':
            summary = f'{actor_name} {verb}{type_name}《{resolved_title}》'
        else:
            summary = f'{actor_name} {verb}{type_name}'

        return cls._create_log(
            action_key or f'content.{content_type}.{action}',
            category='content',
            actor=operator,
            action=action,
            summary=summary,
            description=description,
            status=status,
            target_type=content_type,
            target_id=str(content_id),
            target_title=content_title,
        )

    @classmethod
    def log_operation(
        cls,
        operator: Optional[User],
        operation_type: str,
        action: str,
        description: str,
        duration: int = 0,
        status: str = 'success',
        action_key: Optional[str] = None,
        target_type: str = '',
        target_id: str = '',
        target_title: str = '',
    ) -> Optional[ActivityLog]:
        actor_name = cls._resolve_actor_name(operator)
        template = _OPERATION_ACTION_SUMMARIES.get(action)
        summary = template.format(actor=actor_name, target=target_title or '') if template else f'{actor_name} {action}'
        return cls._create_log(
            action_key or f'operation.{operation_type}.{action}',
            category='operation',
            actor=operator,
            action=action,
            summary=summary,
            description=description,
            status=status,
            target_type=target_type or operation_type,
            target_id=str(target_id) if target_id else '',
            target_title=target_title,
            duration=duration,
        )
