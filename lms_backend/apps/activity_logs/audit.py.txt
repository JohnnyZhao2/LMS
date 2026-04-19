"""Activity log audit publisher adapter."""

from core.audit import (
    AuditPublisher,
    ContentActionAuditEvent,
    OperationAuditEvent,
    UserActionAuditEvent,
    register_audit_publisher,
)

from .services import ActivityLogService


class ActivityLogAuditPublisher(AuditPublisher):
    def publish_user_action(self, event: UserActionAuditEvent):
        return ActivityLogService.log_user_action(
            user=event.user,
            operator=event.operator,
            action=event.action,
            description=event.description,
            status=event.status,
            action_key=event.action_key,
        )

    def publish_content_action(self, event: ContentActionAuditEvent):
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

    def publish_operation(self, event: OperationAuditEvent):
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


def register_activity_log_audit_publisher() -> None:
    register_audit_publisher(ActivityLogAuditPublisher())
