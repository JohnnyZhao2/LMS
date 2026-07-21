"""Activity log action registry."""

from __future__ import annotations

from importlib import import_module


_DECLARATION_MODULES = (
    'apps.auth.services',
    'apps.users.services',
    'apps.questions.services',
    'apps.knowledge.services',
    'apps.quizzes.services',
    'apps.tasks.task_service',
    'apps.tasks.student_task_service',
    'apps.submissions.services',
    'apps.spot_checks.services',
    'apps.tags.services',
    'apps.authorization.role_template_service',
    'apps.authorization.user_override_service',
    'apps.grading.views',
)

_LOG_ACTION_INDEX: dict[str, dict] = {}
_DECLARATIONS_LOADED = False
_DECLARATIONS_LOADING = False


def register_log_action(
    *,
    key: str,
    category: str,
    group: str,
    label: str,
    default_enabled: bool = True,
) -> str:
    action_def = {
        'key': key,
        'category': category,
        'group': group,
        'label': label,
        'default_enabled': default_enabled,
    }
    existing = _LOG_ACTION_INDEX.get(key)
    if existing is not None and existing != action_def:
        raise RuntimeError(f'日志动作 {key} 定义冲突')
    _LOG_ACTION_INDEX[key] = action_def
    return key


def register_user_log_action(
    action: str,
    *,
    group: str,
    label: str,
    action_key: str | None = None,
    default_enabled: bool = True,
) -> str:
    return register_log_action(
        key=action_key or f'user.{action}',
        category='user',
        group=group,
        label=label,
        default_enabled=default_enabled,
    )


def register_content_log_action(
    content_type: str,
    action: str,
    *,
    group: str,
    label: str,
    action_key: str | None = None,
    default_enabled: bool = True,
) -> str:
    return register_log_action(
        key=action_key or f'content.{content_type}.{action}',
        category='content',
        group=group,
        label=label,
        default_enabled=default_enabled,
    )


def register_operation_log_action(
    operation_type: str,
    action: str,
    *,
    group: str,
    label: str,
    action_key: str | None = None,
    default_enabled: bool = True,
) -> str:
    return register_log_action(
        key=action_key or f'operation.{operation_type}.{action}',
        category='operation',
        group=group,
        label=label,
        default_enabled=default_enabled,
    )


def load_declared_log_actions() -> None:
    global _DECLARATIONS_LOADED
    global _DECLARATIONS_LOADING
    if _DECLARATIONS_LOADED or _DECLARATIONS_LOADING:
        return

    _DECLARATIONS_LOADING = True
    try:
        for module_path in _DECLARATION_MODULES:
            import_module(module_path)
        _DECLARATIONS_LOADED = True
    finally:
        _DECLARATIONS_LOADING = False


def get_log_action_def(action_key: str) -> dict:
    load_declared_log_actions()
    return _LOG_ACTION_INDEX[action_key]


def get_log_action_index() -> dict[str, dict]:
    load_declared_log_actions()
    return dict(_LOG_ACTION_INDEX)

