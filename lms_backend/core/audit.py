"""Audit publisher port."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional, Protocol


@dataclass(frozen=True)
class UserActionAuditEvent:
    user: Any
    action: str
    description: str
    operator: Any = None
    status: str = 'success'
    action_key: Optional[str] = None


@dataclass(frozen=True)
class ContentActionAuditEvent:
    content_type: str
    content_id: str
    content_title: str
    operator: Any
    action: str
    description: str
    status: str = 'success'
    action_key: Optional[str] = None


@dataclass(frozen=True)
class OperationAuditEvent:
    operator: Any
    operation_type: str
    action: str
    description: str
    duration: int = 0
    status: str = 'success'
    action_key: Optional[str] = None
    target_type: str = ''
    target_id: str = ''
    target_title: str = ''


class AuditPublisher(Protocol):
    def publish_user_action(self, event: UserActionAuditEvent) -> Any:
        ...

    def publish_content_action(self, event: ContentActionAuditEvent) -> Any:
        ...

    def publish_operation(self, event: OperationAuditEvent) -> Any:
        ...


_audit_publisher: Optional[AuditPublisher] = None


def register_audit_publisher(publisher: AuditPublisher) -> None:
    global _audit_publisher
    _audit_publisher = publisher


def get_audit_publisher() -> AuditPublisher:
    if _audit_publisher is None:
        raise RuntimeError('Audit publisher 未注册')
    return _audit_publisher


def audit_user_action(
    *,
    user: Any,
    action: str,
    description: str,
    operator: Any = None,
    status: str = 'success',
    action_key: Optional[str] = None,
) -> Any:
    return get_audit_publisher().publish_user_action(
        UserActionAuditEvent(
            user=user,
            action=action,
            description=description,
            operator=operator,
            status=status,
            action_key=action_key,
        )
    )


def audit_content_action(
    *,
    content_type: str,
    content_id: str,
    content_title: str,
    operator: Any,
    action: str,
    description: str,
    status: str = 'success',
    action_key: Optional[str] = None,
) -> Any:
    return get_audit_publisher().publish_content_action(
        ContentActionAuditEvent(
            content_type=content_type,
            content_id=content_id,
            content_title=content_title,
            operator=operator,
            action=action,
            description=description,
            status=status,
            action_key=action_key,
        )
    )


def audit_operation(
    *,
    operator: Any,
    operation_type: str,
    action: str,
    description: str,
    duration: int = 0,
    status: str = 'success',
    action_key: Optional[str] = None,
    target_type: str = '',
    target_id: str = '',
    target_title: str = '',
) -> Any:
    return get_audit_publisher().publish_operation(
        OperationAuditEvent(
            operator=operator,
            operation_type=operation_type,
            action=action,
            description=description,
            duration=duration,
            status=status,
            action_key=action_key,
            target_type=target_type,
            target_id=target_id,
            target_title=target_title,
        )
    )
