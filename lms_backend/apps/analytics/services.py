"""
Analytics 应用服务
提供业务逻辑：
- 仪表盘统计计算
- 学员进度跟踪
- 部门/团队分析
- 知识热度统计
此服务层通过 Repository 访问数据，将业务逻辑与数据访问分离，
提高代码可重用性和可测试性。
"""
from typing import List, Dict, Any
from django.db.models import QuerySet
from core.base_service import BaseService
from apps.users.models import User
from apps.users.permissions import get_current_role, get_accessible_students
from .repositories import (
    TaskAssignmentAnalyticsRepository,
    KnowledgeAnalyticsRepository,
    SubmissionAnalyticsRepository,
)
class StudentDashboardService(BaseService):
    """
    学员仪表盘服务
    处理：
    - 待办任务获取
    - 最新知识获取
    - 任务摘要统计
    """
    def __init__(self):
        self.task_assignment_repo = TaskAssignmentAnalyticsRepository()
        self.knowledge_repo = KnowledgeAnalyticsRepository()
    def get_pending_tasks(self, user: User, limit: int = 10) -> QuerySet:
        """
        获取学员的待办任务
        Args:
            user: 学员用户
            limit: 最大返回数量
        Returns:
            待办任务 QuerySet
        """
        return self.task_assignment_repo.get_pending_tasks(
            user_id=user.id,
            limit=limit
        )
    def get_latest_knowledge(self, limit: int = 5) -> QuerySet:
        """
        获取最新发布的知识文档
        Args:
            limit: 最大返回数量
        Returns:
            知识文档 QuerySet
        """
        return self.knowledge_repo.get_latest_knowledge(limit=limit)
    def get_task_summary(self, user: User) -> Dict[str, int]:
        """
        获取学员任务摘要统计
        Args:
            user: 学员用户
        Returns:
            包含待办、已完成、逾期、总数量的字典
        """
        assignments = self.task_assignment_repo.get_student_assignments(
            user_id=user.id
        )
        stats = self.task_assignment_repo.calculate_task_stats(assignments)
        return {
            'pending': stats['in_progress_tasks'],
            'completed': stats['completed_tasks'],
            'overdue': stats['overdue_tasks'],
            'total': stats['total_tasks']
        }
class MentorDashboardService(BaseService):
    """
    导师/室经理仪表盘服务
    处理：
    - 可访问学员的摘要统计
    - 单个学员统计
    - 快捷链接生成
    """
    def __init__(self):
        self.task_assignment_repo = TaskAssignmentAnalyticsRepository()
        self.submission_repo = SubmissionAnalyticsRepository()
    def get_dashboard_data(self, user: User) -> Dict[str, Any]:
        """
        获取导师/室经理的完整仪表盘数据
        Args:
            user: 导师或室经理用户
        Returns:
            包含摘要、学员、快捷链接、当前角色的字典
        """
        current_role = get_current_role(user)
        students = get_accessible_students(user, current_role)
        student_ids = list(students.values_list('id', flat=True))
        summary = self._calculate_summary(student_ids)
        student_stats = self._calculate_student_stats(students)
        quick_links = self._generate_quick_links()
        return {
            'summary': summary,
            'students': student_stats,
            'quick_links': quick_links,
            'current_role': current_role
        }
    def _calculate_summary(
        self,
        student_ids: List[int]
    ) -> Dict[str, Any]:
        """计算总体摘要统计"""
        if not student_ids:
            return {
                'total_students': 0,
                'total_tasks': 0,
                'completed_tasks': 0,
                'in_progress_tasks': 0,
                'overdue_tasks': 0,
                'overall_completion_rate': 0.0,
                'overall_avg_score': None,
                'learning_tasks': {'total': 0, 'completed': 0, 'completion_rate': 0.0},
                'practice_tasks': {'total': 0, 'completed': 0, 'completion_rate': 0.0},
                'exam_tasks': {'total': 0, 'completed': 0, 'completion_rate': 0.0, 'avg_score': None}
            }
        assignments = self.task_assignment_repo.get_assignments_by_students(
            student_ids=student_ids
        )
        stats = self.task_assignment_repo.calculate_task_stats(assignments)
        overall_avg_score = self.submission_repo.calculate_avg_score(
            student_ids=student_ids
        )
        default_stats = {'total': 0, 'completed': 0, 'completion_rate': 0.0}
        return {
            'total_students': len(student_ids),
            'total_tasks': stats['total_tasks'],
            'completed_tasks': stats['completed_tasks'],
            'in_progress_tasks': stats['in_progress_tasks'],
            'overdue_tasks': stats['overdue_tasks'],
            'overall_completion_rate': round(stats['completion_rate'], 1),
            'overall_avg_score': round(overall_avg_score, 2) if overall_avg_score else None,
            'learning_tasks': default_stats,
            'practice_tasks': default_stats,
            'exam_tasks': {**default_stats, 'avg_score': None}
        }
    def _calculate_student_stats(self, students: QuerySet) -> List[Dict[str, Any]]:
        """计算每个学员的统计"""
        student_stats = []
        for student in students.select_related('department'):
            assignments = self.task_assignment_repo.get_student_assignments(
                user_id=student.id
            )
            stats = self.task_assignment_repo.calculate_task_stats(assignments)
            avg_score = self.submission_repo.calculate_avg_score(
                user_id=student.id
            )
            student_stats.append({
                'id': student.id,
                'employee_id': student.employee_id,
                'username': student.username,
                'department_name': student.department.name if student.department else None,
                'total_tasks': stats['total_tasks'],
                'completed_tasks': stats['completed_tasks'],
                'in_progress_tasks': stats['in_progress_tasks'],
                'overdue_tasks': stats['overdue_tasks'],
                'completion_rate': stats['completion_rate'],
                'avg_score': round(avg_score, 2) if avg_score else None,
                'exam_count': 0,
                'exam_passed_count': 0,
                'exam_pass_rate': None
            })
        return student_stats
    @staticmethod
    def _generate_quick_links() -> Dict[str, str]:
        """生成快捷访问链接"""
        return {
            'create_learning_task': '/tasks/learning/create',
            'create_practice_task': '/tasks/practice/create',
            'create_exam_task': '/tasks/exam/create',
            'test_center': '/test-center',
            'spot_checks': '/spot-checks',
            'question_bank': '/questions',
            'quiz_management': '/quizzes'
        }
