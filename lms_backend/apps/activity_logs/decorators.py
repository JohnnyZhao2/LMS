"""Activity log decorators."""

import inspect
import time
from copy import deepcopy
from functools import wraps
from typing import Any, Callable, Optional, Union

from .registry import (
    register_content_log_action,
    register_operation_log_action,
    register_user_log_action,
)
from .services import ActivityLogService


LogText = Union[str, Callable[[dict[str, Any]], str], None]


def _snapshot_for_logging(value: Any) -> Any:
    try:
        return deepcopy(value)
    except Exception:
        return value


def _resolve_operator(self: Any, kwargs: dict[str, Any]) -> Any:
    explicit_operator = kwargs.get('operator') or kwargs.get('assigned_by')
    if explicit_operator is not None:
        return explicit_operator

    request = getattr(self, 'request', None)
    request_user = getattr(request, 'user', None)
    if request_user is not None and getattr(request_user, 'is_authenticated', False):
        return request_user
    return getattr(self, 'user', None)


def _log_context(
    func: Callable,
    self: Any,
    args: tuple[Any, ...],
    kwargs: dict[str, Any],
    result: Any,
) -> dict[str, Any]:
    signature = inspect.signature(func)
    bound = signature.bind(self, *args, **kwargs)
    bound.apply_defaults()
    ctx = dict(bound.arguments)
    for name, param in signature.parameters.items():
        if param.kind is param.VAR_KEYWORD:
            ctx.update(ctx.pop(name, None) or {})
            break
    ctx['result'] = result
    return ctx


def _render_log_text(spec: LogText, ctx: dict[str, Any], default: str = '') -> str:
    if spec is None or spec == '':
        return default
    if callable(spec):
        return spec(ctx) or ''
    return spec.format(**ctx)


def log_user_action(
    action: str,
    description: LogText = None,
    action_key: Optional[str] = None,
    *,
    group: str,
    label: str,
    default_enabled: bool = True,
):
    register_user_log_action(
        action,
        group=group,
        label=label,
        action_key=action_key,
        default_enabled=default_enabled,
    )

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            result = func(self, *args, **kwargs)
            ctx = _log_context(func, self, args, kwargs, result)
            user = (
                result
                if hasattr(result, 'employee_id')
                else (kwargs.get('user') or (args[0] if args else None))
            )
            ActivityLogService.log_user_action(
                user=user,
                operator=_resolve_operator(self, kwargs),
                action=action,
                description=_render_log_text(description, ctx, default=f'{action} 操作'),
                status='success',
                action_key=action_key,
            )
            return result
        return wrapper
    return decorator


def log_content_action(
    content_type: str,
    action: str,
    description: LogText = None,
    action_key: Optional[str] = None,
    *,
    group: str,
    label: str,
    default_enabled: bool = True,
):
    register_content_log_action(
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
            template_args = _snapshot_for_logging(args)
            template_kwargs = _snapshot_for_logging(kwargs)
            result = func(self, *args, **kwargs)
            ctx = _log_context(func, self, template_args, template_kwargs, result)
            content_id = str(result.id) if hasattr(result, 'id') else 'unknown'
            content_title = (
                getattr(result, 'title', None)
                or getattr(result, 'name', None)
                or getattr(result, 'content', '')[:50]
                or '内容'
            )
            ActivityLogService.log_content_action(
                content_type=content_type,
                content_id=content_id,
                content_title=content_title,
                operator=_resolve_operator(self, kwargs),
                action=action,
                description=_render_log_text(description, ctx, default=f'{action} {content_type}'),
                status='success',
                action_key=action_key,
            )
            return result
        return wrapper
    return decorator


def log_operation(
    operation_type: str,
    action: str,
    description: LogText = None,
    measure_duration: bool = False,
    action_key: Optional[str] = None,
    target_type: str = '',
    target_title_template: LogText = '',
    *,
    group: str,
    label: str,
    default_enabled: bool = True,
):
    register_operation_log_action(
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
            start_time = time.time() if measure_duration else None
            result = func(self, *args, **kwargs)
            duration = int((time.time() - start_time) * 1000) if measure_duration else 0
            ctx = _log_context(func, self, args, kwargs, result)
            resolved_target_id = str(result.id) if result is not None and hasattr(result, 'id') else ''
            ActivityLogService.log_operation(
                operator=_resolve_operator(self, kwargs),
                operation_type=operation_type,
                action=action,
                description=_render_log_text(description, ctx, default=f'{action} 操作'),
                duration=duration,
                status='success',
                action_key=action_key,
                target_type=target_type,
                target_id=resolved_target_id,
                target_title=_render_log_text(target_title_template, ctx),
            )
            return result
        return wrapper
    return decorator
