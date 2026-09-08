"""Activity log description helpers."""

from typing import Any


def format_number(value: Any) -> str:
    if value is None:
        return '0'
    text = str(value)
    if '.' in text:
        text = text.rstrip('0').rstrip('.')
    return text


def format_datetime(value: Any) -> str:
    if value is None or not hasattr(value, 'strftime'):
        return ''
    return value.strftime('%Y-%m-%d %H:%M')


def format_user_label(user: Any) -> str:
    if user is None:
        return '未知用户'

    username = getattr(user, 'username', None)
    employee_id = getattr(user, 'employee_id', None)
    if username and employee_id:
        return f'{username}（{employee_id}）'
    return username or employee_id or '未知用户'


def preview_text(value: Any, limit: int = 24) -> str:
    text = str(value or '').strip().replace('\n', ' ')
    if len(text) <= limit:
        return text
    return f'{text[:limit]}...'
