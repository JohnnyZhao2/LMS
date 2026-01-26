"""
活动日志服务 - 用于在业务操作中自动记录日志
"""
from typing import Optional
from django.utils import timezone
from apps.users.models import User
from .models import UserLog, ContentLog, OperationLog


class ActivityLogService:
    """活动日志服务"""

    @staticmethod
    def log_user_action(
        user: User,
        action: str,
        description: str,
        operator: Optional[User] = None,
        status: str = 'success',
    ) -> UserLog:
        """
        记录用户日志

        Args:
            user: 目标用户
            action: 操作类型 (login, logout, password_change, login_failed, role_assigned)
            description: 操作描述
            operator: 操作者（如果是管理员操作）
            status: 状态 (success, failed)
        """
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
    ) -> ContentLog:
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
        """
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
    ) -> OperationLog:
        """
        记录操作日志

        Args:
            operator: 操作者
            operation_type: 操作类型 (task_management, grading, spot_check, data_export)
            action: 操作
            description: 操作描述
            duration: 耗时（毫秒）
            status: 状态 (success, failed, partial)
        """
        return OperationLog.objects.create(
            operator=operator,
            operation_type=operation_type,
            action=action,
            description=description,
            duration=duration,
            status=status,
        )
