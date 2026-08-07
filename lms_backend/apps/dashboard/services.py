"""
Dashboard 应用服务
提供业务逻辑：
- 仪表盘统计计算
- 学员进度跟踪
- 知识热度统计
"""
from typing import Any, Dict, List

from apps.authorization.engine import scope_filter
from core.base_service import BaseService
from apps.users.models import User

from .selectors import (
    calculate_avg_score,
    calculate_task_stats,
    get_assignments_by_students,
    get_latest_knowledge,
    get_monthly_tasks_count,
    get_student_all_tasks,
    get_student_assignments,
    get_student_exam_avg_score,
    get_task_participants_progress,
    get_urgent_tasks_count,
    get_weekly_active_users_count,
)

MENTOR_DASHBOARD_SCOPE_PERMISSION_CODE = 'tasks.view_task_analytics'


def get_dashboard_user_queryset():
    return User.objects.filter(
        is_active=True,
    ).exclude(is_superuser=True).distinct()


class StudentDashboardService(BaseService):
    """
    学员仪表盘服务
    处理：
    - 统计数据获取
    - 任务列表获取
    - 最新知识获取
    - 同伴排名获取
    """

    def get_dashboard_data(
        self,
        user: User,
        task_limit: int = 10,
        knowledge_limit: int = 6
    ) -> Dict[str, Any]:
        """
        获取学员仪表盘完整数据
        """
        stats = self.get_stats(user)
        tasks = get_student_all_tasks(user.id, limit=task_limit)
        latest_knowledge = get_latest_knowledge(limit=knowledge_limit)

        return {
            'stats': stats,
            'tasks': tasks,
            'latest_knowledge': latest_knowledge,
        }

    def get_task_participants(
        self,
        user: User,
        task_id: int
    ) -> List[Dict[str, Any]]:
        """
        获取任务参与者进度
        """
        return get_task_participants_progress(task_id, user.id)

    def get_stats(self, user: User) -> Dict[str, Any]:
        """
        获取学员统计数据
        """
        assignments = get_student_assignments(user_id=user.id)
        task_stats = calculate_task_stats(assignments)
        urgent_count = get_urgent_tasks_count(user.id)
        exam_avg_score = get_student_exam_avg_score(user.id)

        return {
            'in_progress_count': task_stats['in_progress_tasks'],
            'urgent_count': urgent_count,
            'completion_rate': task_stats['completion_rate'],
            'exam_avg_score': round(exam_avg_score, 1) if exam_avg_score is not None else None,
            'total_tasks': task_stats['total_tasks'],
            'completed_count': task_stats['completed_tasks'],
            'overdue_count': task_stats['overdue_tasks']
        }



class MentorDashboardService(BaseService):
    """
    导师/室经理仪表盘服务
    处理可访问学员的摘要统计
    """
    def get_dashboard_data(self) -> Dict[str, Any]:
        """
        获取导师/室经理的完整仪表盘数据
        """
        students = scope_filter(
            MENTOR_DASHBOARD_SCOPE_PERMISSION_CODE,
            self.request,
            resource_model=User,
        )
        student_ids = list(students.values_list('id', flat=True))
        return {
            'summary': self._calculate_summary(student_ids),
        }

    def _calculate_summary(
        self,
        student_ids: List[int]
    ) -> Dict[str, Any]:
        """计算总体摘要统计"""
        monthly_tasks = get_monthly_tasks_count()
        if not student_ids:
            return {
                'total_students': 0,
                'monthly_tasks': monthly_tasks,
                'total_tasks': 0,
                'completed_tasks': 0,
                'in_progress_tasks': 0,
                'overdue_tasks': 0,
                'overall_completion_rate': 0.0,
                'overall_avg_score': None,
            }
        assignments = get_assignments_by_students(student_ids=student_ids)
        stats = calculate_task_stats(assignments)
        overall_avg_score = calculate_avg_score(student_ids=student_ids)
        return {
            'total_students': len(student_ids),
            'monthly_tasks': monthly_tasks,
            'total_tasks': stats['total_tasks'],
            'completed_tasks': stats['completed_tasks'],
            'in_progress_tasks': stats['in_progress_tasks'],
            'overdue_tasks': stats['overdue_tasks'],
            'overall_completion_rate': round(stats['completion_rate'], 1),
            'overall_avg_score': round(overall_avg_score, 2) if overall_avg_score is not None else None,
        }


class AdminDashboardService(BaseService):
    """管理员系统概览。"""

    def get_dashboard_data(self) -> Dict[str, Any]:
        user_ids = list(get_dashboard_user_queryset().values_list('id', flat=True))
        return {
            'summary': {
                'weekly_active_users': get_weekly_active_users_count(user_ids=user_ids),
                'monthly_tasks': get_monthly_tasks_count(),
            }
        }
