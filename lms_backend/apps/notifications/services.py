"""
通知应用服务

编排业务逻辑，协调 Repository 和 Domain Service。
负责创建和发送各类通知，预留公司机器人对接接口。

Requirements: 7.5, 9.5, 11.6
"""
import logging
from typing import List, Optional

from django.db import transaction
from django.utils import timezone

from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes
from apps.notifications.models import Notification
from apps.users.models import User
from apps.tasks.models import Task
from apps.submissions.models import Submission
from apps.spot_checks.models import SpotCheck
from .repositories import NotificationRepository


logger = logging.getLogger(__name__)


class NotificationService(BaseService):
    """
    通知应用服务
    
    负责创建和发送各类通知，预留公司机器人对接接口。
    
    Requirements:
    - 7.5: 学习任务创建成功后通知学员
    - 9.5: 练习任务创建成功后通知学员
    - 11.6: 考试任务创建成功后通知学员
    """
    
    def __init__(self):
        self.repository = NotificationRepository()
    
    # 通知模板
    TEMPLATES = {
        'TASK_ASSIGNED': {
            'title': '您有新的任务',
            'content': '您被分配了任务「{task_title}」，请在 {deadline} 前完成。'
        },
        'DEADLINE_REMINDER': {
            'title': '任务即将截止',
            'content': '任务「{task_title}」将于 {deadline} 截止，请尽快完成。'
        },
        'GRADING_COMPLETED': {
            'title': '考试评分完成',
            'content': '您的考试「{task_title}」已完成评分，得分：{score}。'
        },
        'SPOT_CHECK': {
            'title': '抽查记录',
            'content': '您收到一条抽查记录，评分：{score}。'
        },
    }
    
    @transaction.atomic
    def send_task_assigned(self, task: Task, assignee_ids: List[int]) -> List[Notification]:
        """
        发送任务分配通知
        
        Args:
            task: 任务实例
            assignee_ids: 被分配学员的 ID 列表
            
        Returns:
            创建的通知列表
            
        Requirements: 7.5, 9.5, 11.6
        """
        notifications = []
        
        # 获取模板
        template = self.TEMPLATES['TASK_ASSIGNED']
        
        # 格式化内容
        deadline_str = task.deadline.strftime('%Y-%m-%d %H:%M')
        content = template['content'].format(
            task_title=task.title,
            deadline=deadline_str
        )
        
        # 批量创建通知
        notifications_data = []
        for user_id in assignee_ids:
            notifications_data.append({
                'recipient_id': user_id,
                'notification_type': 'TASK_ASSIGNED',
                'title': template['title'],
                'content': content,
                'task': task
            })
        
        with transaction.atomic():
            notifications = self.repository.batch_create(notifications_data)
        
        # 尝试发送到机器人
        self._send_to_robot_batch(notifications)
        
        return notifications
    
    def send_deadline_reminder(self, task: Task, user_id: int) -> Optional[Notification]:
        """
        发送截止时间提醒
        
        Args:
            task: 任务实例
            user_id: 用户 ID
            
        Returns:
            创建的通知实例
        """
        template = self.TEMPLATES['DEADLINE_REMINDER']
        deadline_str = task.deadline.strftime('%Y-%m-%d %H:%M')
        
        content = template['content'].format(
            task_title=task.title,
            deadline=deadline_str
        )
        
        notification = self.repository.create(
            recipient_id=user_id,
            notification_type='DEADLINE_REMINDER',
            title=template['title'],
            content=content,
            task=task
        )
        
        # 尝试发送到机器人
        self._send_to_robot(notification)
        
        return notification
    
    def send_grading_completed(self, submission: Submission) -> Optional[Notification]:
        """
        发送评分完成通知
        
        Args:
            submission: 答题记录实例
            
        Returns:
            创建的通知实例
        """
        template = self.TEMPLATES['GRADING_COMPLETED']
        
        content = template['content'].format(
            task_title=submission.task.title,
            score=submission.obtained_score
        )
        
        notification = self.repository.create(
            recipient=submission.user,
            notification_type='GRADING_COMPLETED',
            title=template['title'],
            content=content,
            task=submission.task,
            submission=submission
        )
        
        # 尝试发送到机器人
        self._send_to_robot(notification)
        
        return notification
    
    def send_spot_check_notification(self, spot_check: SpotCheck) -> Optional[Notification]:
        """
        发送抽查通知
        
        Args:
            spot_check: 抽查记录实例
            
        Returns:
            创建的通知实例
        """
        template = self.TEMPLATES['SPOT_CHECK']
        
        content = template['content'].format(
            score=spot_check.score
        )
        
        notification = self.repository.create(
            recipient=spot_check.student,
            notification_type='SPOT_CHECK',
            title=template['title'],
            content=content,
            spot_check=spot_check
        )
        
        # 尝试发送到机器人
        self._send_to_robot(notification)
        
        return notification
    
    def _send_to_robot(self, notification: Notification) -> bool:
        """
        发送单条通知到公司机器人
        
        预留接口，后续对接时实现具体逻辑。
        
        Args:
            notification: 通知实例
            
        Returns:
            是否发送成功
        """
        return self._send_to_robot_batch([notification])
    
    def _send_to_robot_batch(self, notifications: List[Notification]) -> bool:
        """
        批量发送通知到公司机器人
        
        预留接口，后续对接时实现具体逻辑。
        
        Args:
            notifications: 通知实例列表
            
        Returns:
            是否发送成功
        """
        if not notifications:
            return True
        
        # TODO: 实现公司机器人对接逻辑
        # 示例代码：
        # try:
        #     for notification in notifications:
        #         user = notification.recipient
        #         message = f"{notification.title}\n{notification.content}"
        #         robot_api.send_message(user.employee_id, message)
        #         self.repository.mark_as_sent_to_robot(notification)
        #     return True
        # except Exception as e:
        #     logger.error(f"Failed to send notifications to robot: {e}")
        #     return False
        
        logger.info(f"Robot integration not implemented. {len(notifications)} notifications pending.")
        return False
    
    def send_to_robot(self, user_ids: List[int], message: str) -> bool:
        """
        直接发送消息到公司机器人
        
        预留接口，后续对接时实现具体逻辑。
        
        Args:
            user_ids: 用户 ID 列表
            message: 消息内容
            
        Returns:
            是否发送成功
        """
        # TODO: 实现公司机器人对接逻辑
        # 示例代码：
        # try:
        #     users = User.objects.filter(id__in=user_ids)
        #     for user in users:
        #         robot_api.send_message(user.employee_id, message)
        #     return True
        # except Exception as e:
        #     logger.error(f"Failed to send message to robot: {e}")
        #     return False
        
        logger.info(f"Robot integration not implemented. Message to {len(user_ids)} users pending.")
        return False
    
    def get_by_id(self, pk: int, user_id: int) -> Notification:
        """
        获取通知详情
        
        Args:
            pk: 主键
            user_id: 用户 ID（用于权限验证）
            
        Returns:
            通知对象
            
        Raises:
            BusinessError: 如果不存在或无权限
        """
        notification = self.repository.get_by_id(pk)
        self.validate_not_none(
            notification,
            f'通知 {pk} 不存在'
        )
        
        # 验证权限：只能访问自己的通知
        if notification.recipient_id != user_id:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='无权访问该通知'
            )
        
        return notification
    
    def get_list_for_user(
        self,
        user_id: int,
        is_read: Optional[bool] = None,
        ordering: str = '-created_at'
    ) -> List[Notification]:
        """
        获取用户的通知列表
        
        Args:
            user_id: 用户 ID
            is_read: 是否已读（可选）
            ordering: 排序字段
            
        Returns:
            通知列表
        """
        filters = {}
        if is_read is not None:
            filters['is_read'] = is_read
        
        return list(self.repository.get_for_user(
            user_id=user_id,
            filters=filters if filters else None,
            ordering=ordering
        ))
    
    def mark_as_read(self, pk: int, user_id: int) -> Notification:
        """
        标记单条通知为已读
        
        Args:
            pk: 通知主键
            user_id: 用户 ID
            
        Returns:
            更新后的通知对象
            
        Raises:
            BusinessError: 如果不存在或无权限
        """
        notification = self.get_by_id(pk, user_id)
        
        if notification.is_read:
            return notification
        
        return self.repository.mark_as_read(notification)
    
    def mark_all_as_read(self, user_id: int) -> int:
        """
        标记用户所有通知为已读
        
        Args:
            user_id: 用户 ID
            
        Returns:
            更新的通知数量
        """
        return self.repository.mark_all_as_read(user_id)
    
    def get_unread_count(self, user_id: int) -> int:
        """
        获取用户未读通知数量
        
        Args:
            user_id: 用户 ID
            
        Returns:
            未读通知数量
        """
        return self.repository.get_unread_count(user_id)
