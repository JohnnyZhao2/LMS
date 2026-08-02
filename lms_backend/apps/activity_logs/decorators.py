"""Activity log decorators — 仅负责注册与发布，不做业务对象推断。"""

from __future__ import annotations

import inspect
import logging
import time
from copy import deepcopy
from functools import wraps
from typing import Any, Callable

from core.audit import audit_content_action, audit_operation, audit_user_action

from .registry import (
    register_content_log_action,
    register_operation_log_action,
    register_user_log_action,
)

logger = logging.getLogger(__name__)

BuildEvent = Callable[[Any, Any, dict[str, Any]], dict[str, Any]]


def _snapshot_for_logging(value: Any) -> Any:
    try:
        return deepcopy(value)
    except Exception:
        return value


def _bound_call_args(func: Callable, self: Any, args: tuple, kwargs: dict) -> dict[str, Any]:
    sig = inspect.signature(func)
    bound = sig.bind(self, *args, **kwargs)
    bound.apply_defaults()
    data = dict(bound.arguments)
    data.pop('self', None)
    for name, param in sig.parameters.items():
        if param.kind == inspect.Parameter.VAR_KEYWORD and name in data:
            extras = data.pop(name) or {}
            data.update(extras)
            break
    return {key: _snapshot_for_logging(value) for key, value in data.items()}


def _resolve_operator(self: Any, bound_args: dict[str, Any]) -> Any:
    explicit = bound_args.get('operator') or bound_args.get('assigned_by')
    if explicit is not None:
        return explicit

    request = getattr(self, 'request', None)
    request_user = getattr(request, 'user', None)
    if request_user is not None and getattr(request_user, 'is_authenticated', False):
        return request_user
    return getattr(self, 'user', None)


def _safe_publish(action_label: str, publish: Callable[[], Any]) -> None:
    try:
        publish()
    except Exception:
        logger.exception('活动日志发布失败: %s', action_label)


def _content_identity(result: Any, event: dict[str, Any]) -> tuple[str, str]:
    content_id = event.get('content_id')
    if content_id is None and result is not None and hasattr(result, 'id'):
        content_id = str(result.id)
    content_title = event.get('content_title')
    if content_title is None and result is not None:
        content_title = (
            getattr(result, 'title', None)
            or getattr(result, 'name', None)
            or ''
        )
    return str(content_id or ''), str(content_title or '')


def log_user_action(
    action: str,
    *,
    group: str,
    label: str,
    build_event: BuildEvent | None = None,
    action_key: str | None = None,
    default_enabled: bool = True,
):
    resolved_key = register_user_log_action(
        action,
        group=group,
        label=label,
        action_key=action_key,
        default_enabled=default_enabled,
    )

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            bound_args = _bound_call_args(func, self, args, kwargs)
            result = func(self, *args, **kwargs)

            def publish() -> None:
                event = build_event(self, result, bound_args) if build_event else {}
                user = event.get('user')
                if user is None:
                    user = bound_args.get('user') or result
                audit_user_action(
                    user=user,
                    operator=event.get('operator', _resolve_operator(self, bound_args)),
                    action=action,
                    description=str(event.get('description') or ''),
                    status=str(event.get('status') or 'success'),
                    action_key=resolved_key,
                )

            _safe_publish(resolved_key, publish)
            return result
        return wrapper
    return decorator


def log_content_action(
    content_type: str,
    action: str,
    *,
    group: str,
    label: str,
    build_event: BuildEvent | None = None,
    action_key: str | None = None,
    default_enabled: bool = True,
):
    resolved_key = register_content_log_action(
        content_type,
        action,
        group=group,
        label=label,
        action_key=action_key,
        default_enabled=default_enabled,
    )

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            bound_args = _bound_call_args(func, self, args, kwargs)
            result = func(self, *args, **kwargs)

            def publish() -> None:
                event = build_event(self, result, bound_args) if build_event else {}
                content_id, content_title = _content_identity(result, event)
                audit_content_action(
                    content_type=content_type,
                    content_id=content_id,
                    content_title=content_title,
                    operator=event.get('operator', _resolve_operator(self, bound_args)),
                    action=action,
                    description=str(event.get('description') or ''),
                    status=str(event.get('status') or 'success'),
                    action_key=resolved_key,
                )

            _safe_publish(resolved_key, publish)
            return result
        return wrapper
    return decorator


def log_operation(
    operation_type: str,
    action: str,
    *,
    group: str,
    label: str,
    build_event: BuildEvent | None = None,
    measure_duration: bool = False,
    action_key: str | None = None,
    default_enabled: bool = True,
):
    resolved_key = register_operation_log_action(
        operation_type,
        action,
        group=group,
        label=label,
        action_key=action_key,
        default_enabled=default_enabled,
    )

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            bound_args = _bound_call_args(func, self, args, kwargs)
            start_time = time.time() if measure_duration else None
            result = func(self, *args, **kwargs)
            duration = int((time.time() - start_time) * 1000) if measure_duration else 0

            def publish() -> None:
                event = build_event(self, result, bound_args) if build_event else {}
                target_id = event.get('target_id')
                if target_id is None and result is not None and hasattr(result, 'id'):
                    target_id = str(result.id)
                audit_operation(
                    operator=event.get('operator', _resolve_operator(self, bound_args)),
                    operation_type=operation_type,
                    action=action,
                    description=str(event.get('description') or ''),
                    duration=int(event.get('duration', duration) or 0),
                    status=str(event.get('status') or 'success'),
                    action_key=resolved_key,
                    target_type=str(event.get('target_type') or ''),
                    target_id=str(target_id or ''),
                    target_title=str(event.get('target_title') or ''),
                )

            _safe_publish(resolved_key, publish)
            return result
        return wrapper
    return decorator
