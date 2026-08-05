"""Activity log audit publisher adapter."""

from __future__ import annotations

import logging

from core.audit import (
    AuditPublisher,
    ContentActionAuditEvent,
    OperationAuditEvent,
    UserActionAuditEvent,
    register_audit_publisher,
)

from .services import ActivityLogService

logger = logging.getLogger(__name__)


class ActivityLogAuditPublisher(AuditPublisher):
    def publish_user_action(self, event: UserActionAuditEvent):
        try:
            return ActivityLogService.log_user_action(
                user=event.user,
                operator=event.operator,
                action=event.action,
                description=event.description,
                status=event.status,
                action_key=event.action_key,
            )
        except Exception:
            logger.exception('活动日志写入失败: user.%s', event.action)
            return None

    def publish_content_action(self, event: ContentActionAuditEvent):
        try:
            return ActivityLogService.log_content_action(
                content_type=event.content_type,
                content_id=event.content_id,
                content_title=event.content_title,
                operator=event.operator,
                action=event.action,
                description=event.description,
                status=event.status,
                action_key=event.action_key,
            )
        except Exception:
            logger.exception(
                '活动日志写入失败: content.%s.%s',
                event.content_type,
                event.action,
            )
            return None

    def publish_operation(self, event: OperationAuditEvent):
        try:
            return ActivityLogService.log_operation(
                operator=event.operator,
                operation_type=event.operation_type,
                action=event.action,
                description=event.description,
                duration=event.duration,
                status=event.status,
                action_key=event.action_key,
                target_type=event.target_type,
                target_id=event.target_id,
                target_title=event.target_title,
            )
        except Exception:
            logger.exception(
                '活动日志写入失败: operation.%s.%s',
                event.operation_type,
                event.action,
            )
            return None


def register_activity_log_audit_publisher() -> None:
    register_audit_publisher(ActivityLogAuditPublisher())
