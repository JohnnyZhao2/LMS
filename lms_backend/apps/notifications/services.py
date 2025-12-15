"""
Notification services for LMS.

Implements notification creation and delivery logic,
including integration with company robot.

Requirements: 7.5, 9.5, 11.6
"""
import logging
from typing import List, Optional

from django.db import transaction
from django.utils import timezone

from apps.notifications.models import Notification
from apps.users.models import User
from apps.tasks.models import Task
from apps.submissions.models import Submission
from apps.spot_checks.models import SpotCheck


logger = logging.getLogger(__name__)


class NotificationService:
    """
    通知服务
    
    负责创建和发送各类通知，预留公司机器人对接接口。
    
    Requirements:
    - 7.5: 学习任务创建成功后通知学员
    - 9.5: 练习任务创建成功后通知学员
    - 11.6: 考试任务创建成功后通知学员
    """
    
    # 通知模板
    TEMPLATES = {
        'TASK_ASSIGNED': {
            'LEARNING': {
                'title': '您有新的学习任务',
                'content': '您被分配了学习任务「{task_title}」，请在 {deadline} 前完成。'
            },
            'PRACTICE': {
                'title': '您有新的练习任务',
                'content': '您被分配了练习任务「{task_title}」，请在 {deadline} 前完成。'
            },
            'EXAM': {
                'title': '您有新的考试任务',
                'content': '您被分配了考试任务「{task_title}」，考试时间：{start_time} 至 {deadline}，时长 {duration} 分钟。'
            },
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
    
    @classmethod
    def send_task_assigned(cls, task: Task, assignee_ids: List[int]) -> List[Notification]:
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
        template = cls.TEMPLATES['TASK_ASSIGNED'].get(task.task_type, {})
        if not template:
            logger.warning(f"No template found for task type: {task.task_type}")
            return notifications
        
        # 格式化内容
        deadline_str = task.deadline.strftime('%Y-%m-%d %H:%M')
        
        if task.task_type == 'EXAM':
            start_time_str = task.start_time.strftime('%Y-%m-%d %H:%M') if task.start_time else ''
            content = template['content'].format(
                task_title=task.title,
                start_time=start_time_str,
                deadline=deadline_str,
                duration=task.duration or 0
            )
        else:
            content = template['content'].format(
                task_title=task.title,
                deadline=deadline_str
            )
        
        # 批量创建通知
        with transaction.atomic():
            for user_id in assignee_ids:
                notification = Notification.objects.create(
                    recipient_id=user_id,
                    notification_type='TASK_ASSIGNED',
                    title=template['title'],
                    content=content,
                    task=task
                )
                notifications.append(notification)
        
        # 尝试发送到机器人
        cls._send_to_robot_batch(notifications)
        
        return notifications
    
    @classmethod
    def send_deadline_reminder(cls, task: Task, user_id: int) -> Optional[Notification]:
        """
        发送截止时间提醒
        
        Args:
            task: 任务实例
            user_id: 用户 ID
            
        Returns:
            创建的通知实例
        """
        template = cls.TEMPLATES['DEADLINE_REMINDER']
        deadline_str = task.deadline.strftime('%Y-%m-%d %H:%M')
        
        content = template['content'].format(
            task_title=task.title,
            deadline=deadline_str
        )
        
        notification = Notification.objects.create(
            recipient_id=user_id,
            notification_type='DEADLINE_REMINDER',
            title=template['title'],
            content=content,
            task=task
        )
        
        # 尝试发送到机器人
        cls._send_to_robot(notification)
        
        return notification
    
    @classmethod
    def send_grading_completed(cls, submission: Submission) -> Optional[Notification]:
        """
        发送评分完成通知
        
        Args:
            submission: 答题记录实例
            
        Returns:
            创建的通知实例
        """
        template = cls.TEMPLATES['GRADING_COMPLETED']
        
        content = template['content'].format(
            task_title=submission.task.title,
            score=submission.obtained_score
        )
        
        notification = Notification.objects.create(
            recipient=submission.user,
            notification_type='GRADING_COMPLETED',
            title=template['title'],
            content=content,
            task=submission.task,
            submission=submission
        )
        
        # 尝试发送到机器人
        cls._send_to_robot(notification)
        
        return notification
    
    @classmethod
    def send_spot_check_notification(cls, spot_check: SpotCheck) -> Optional[Notification]:
        """
        发送抽查通知
        
        Args:
            spot_check: 抽查记录实例
            
        Returns:
            创建的通知实例
        """
        template = cls.TEMPLATES['SPOT_CHECK']
        
        content = template['content'].format(
            score=spot_check.score
        )
        
        notification = Notification.objects.create(
            recipient=spot_check.student,
            notification_type='SPOT_CHECK',
            title=template['title'],
            content=content,
            spot_check=spot_check
        )
        
        # 尝试发送到机器人
        cls._send_to_robot(notification)
        
        return notification
    
    @classmethod
    def _send_to_robot(cls, notification: Notification) -> bool:
        """
        发送单条通知到公司机器人
        
        预留接口，后续对接时实现具体逻辑。
        
        Args:
            notification: 通知实例
            
        Returns:
            是否发送成功
        """
        return cls._send_to_robot_batch([notification])
    
    @classmethod
    def _send_to_robot_batch(cls, notifications: List[Notification]) -> bool:
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
        #         notification.mark_as_sent_to_robot()
        #     return True
        # except Exception as e:
        #     logger.error(f"Failed to send notifications to robot: {e}")
        #     return False
        
        logger.info(f"Robot integration not implemented. {len(notifications)} notifications pending.")
        return False
    
    @classmethod
    def send_to_robot(cls, user_ids: List[int], message: str) -> bool:
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
    
    @classmethod
    def mark_all_as_read(cls, user: User) -> int:
        """
        标记用户所有通知为已读
        
        Args:
            user: 用户实例
            
        Returns:
            更新的通知数量
        """
        return Notification.objects.filter(
            recipient=user,
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now()
        )
    
    @classmethod
    def get_unread_count(cls, user: User) -> int:
        """
        获取用户未读通知数量
        
        Args:
            user: 用户实例
            
        Returns:
            未读通知数量
        """
        return Notification.get_unread_count(user)
