from typing import Optional
from django.db.models import QuerySet
from .models import UserLog, ContentLog, OperationLog


def list_user_logs(
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    status: Optional[str] = None,
) -> QuerySet[UserLog]:
    """
    获取用户日志列表
    """
    queryset = UserLog.objects.select_related('user', 'operator').all()

    if user_id:
        queryset = queryset.filter(user_id=user_id)
    if action:
        queryset = queryset.filter(action=action)
    if status:
        queryset = queryset.filter(status=status)

    return queryset


def list_content_logs(
    content_type: Optional[str] = None,
    operator_id: Optional[int] = None,
    action: Optional[str] = None,
    status: Optional[str] = None,
) -> QuerySet[ContentLog]:
    """
    获取内容日志列表
    """
    queryset = ContentLog.objects.select_related('operator').all()

    if content_type:
        queryset = queryset.filter(content_type=content_type)
    if operator_id:
        queryset = queryset.filter(operator_id=operator_id)
    if action:
        queryset = queryset.filter(action=action)
    if status:
        queryset = queryset.filter(status=status)

    return queryset


def list_operation_logs(
    operation_type: Optional[str] = None,
    operator_id: Optional[int] = None,
    status: Optional[str] = None,
) -> QuerySet[OperationLog]:
    """
    获取操作日志列表
    """
    queryset = OperationLog.objects.select_related('operator__roles').all()

    if operation_type:
        queryset = queryset.filter(operation_type=operation_type)
    if operator_id:
        queryset = queryset.filter(operator_id=operator_id)
    if status:
        queryset = queryset.filter(status=status)

    return queryset
