"""
Dashboard 模块仓储实现
负责所有看板统计相关的数据访问操作。
封装了跨模块的数据查询，为 Dashboard Service 提供统一的数据访问接口。
"""
from typing import Optional, List, Dict, Any
from django.db.models import QuerySet, Avg, Count, Sum
from django.db.models.functions import Coalesce
from core.base_repository import BaseRepository
from apps.tasks.models import TaskAssignment
from apps.knowledge.models import Knowledge
from apps.submissions.models import Submission
class TaskAssignmentDashboardRepository:
    """
    任务分配分析仓储
    提供用于分析统计的任务分配查询方法。
    """
    def get_pending_tasks(
        self,
        user_id: int,
        limit: int = 10
    ) -> QuerySet[TaskAssignment]:
        """
        获取学员的待办任务
        Args:
            user_id: 学员用户 ID
            limit: 最大返回数量
        Returns:
            QuerySet
        """
        return TaskAssignment.objects.filter(
            assignee_id=user_id,
            status='IN_PROGRESS',
            task__is_deleted=False,
            task__is_closed=False
        ).select_related(
            'task', 'task__created_by'
        ).prefetch_related(
            'task__task_knowledge',
            'task__task_quizzes',
            'knowledge_progress'
        ).order_by('task__deadline')[:limit]
    def get_student_assignments(
        self,
        user_id: int,
        task_deleted: bool = False
    ) -> QuerySet[TaskAssignment]:
        """
        获取学员的所有任务分配
        Args:
            user_id: 学员用户 ID
            task_deleted: 是否包含已删除的任务
        Returns:
            QuerySet
        """
        qs = TaskAssignment.objects.filter(assignee_id=user_id)
        if not task_deleted:
            qs = qs.filter(task__is_deleted=False)
        return qs
    def get_assignments_by_students(
        self,
        student_ids: List[int],
        task_deleted: bool = False
    ) -> QuerySet[TaskAssignment]:
        """
        获取多个学员的任务分配
        Args:
            student_ids: 学员用户 ID 列表
            task_deleted: 是否包含已删除的任务
        Returns:
            QuerySet
        """
        qs = TaskAssignment.objects.filter(assignee_id__in=student_ids)
        if not task_deleted:
            qs = qs.filter(task__is_deleted=False)
        return qs.select_related('task')
    def get_all_assignments(self, task_deleted: bool = False) -> QuerySet[TaskAssignment]:
        """
        获取所有任务分配
        Args:
            task_deleted: 是否包含已删除的任务
        Returns:
            QuerySet
        """
        qs = TaskAssignment.objects.all()
        if not task_deleted:
            qs = qs.filter(task__is_deleted=False)
        return qs
    def calculate_task_stats(self, assignments: QuerySet) -> Dict[str, Any]:
        """
        计算任务统计信息
        Args:
            assignments: 任务分配查询集
        Returns:
            统计信息字典
        """
        total_tasks = assignments.count()
        completed_tasks = assignments.filter(status='COMPLETED').count()
        in_progress_tasks = assignments.filter(status='IN_PROGRESS').count()
        overdue_tasks = assignments.filter(status='OVERDUE').count()
        completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0.0
        return {
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'in_progress_tasks': in_progress_tasks,
            'overdue_tasks': overdue_tasks,
            'completion_rate': round(completion_rate, 1)
        }
class KnowledgeDashboardRepository:
    """
    知识文档分析仓储
    提供用于分析统计的知识文档查询方法。
    """
    def get_latest_knowledge(self, limit: int = 5) -> QuerySet[Knowledge]:
        """
        获取最新发布的知识文档
        Args:
            limit: 最大返回数量
        Returns:
            QuerySet
        """
        return Knowledge.objects.filter(
            is_deleted=False
        ).select_related(
            'created_by', 'updated_by'
        ).order_by('-created_at')[:limit]
    def get_knowledge_heat(
        self,
        limit: int = 20,
        knowledge_type: str = None
    ) -> QuerySet[Knowledge]:
        """
        获取知识热度统计
        Args:
            limit: 最大返回数量
            knowledge_type: 可选的知识类型过滤
        Returns:
            QuerySet
        """
        qs = Knowledge.objects.filter(
            is_deleted=False
        ).select_related('created_by')
        if knowledge_type:
            qs = qs.filter(knowledge_type=knowledge_type)
        return qs.order_by('-view_count')[:limit]
    def get_knowledge_statistics(self) -> Dict[str, Any]:
        """
        获取知识文档总体统计
        Returns:
            统计信息字典
        """
        total_views = Knowledge.objects.filter(is_deleted=False).aggregate(
            total=Sum('view_count')
        )['total'] or 0
        total_knowledge = Knowledge.objects.filter(is_deleted=False).count()
        return {
            'total_knowledge': total_knowledge,
            'total_views': total_views,
            'avg_views': round(total_views / total_knowledge, 1) if total_knowledge > 0 else 0
        }
class SubmissionDashboardRepository:
    """
    答题记录分析仓储
    提供用于分析统计的答题记录查询方法。
    """
    def get_submissions_by_students(
        self,
        student_ids: List[int],
        status: str = None,
        task_deleted: bool = False
    ) -> QuerySet[Submission]:
        """
        获取多个学员的答题记录
        Args:
            student_ids: 学员用户 ID 列表
            status: 可选的状态过滤
            task_deleted: 是否包含已删除的任务
        Returns:
            QuerySet
        """
        qs = Submission.objects.filter(user_id__in=student_ids)
        if not task_deleted:
            qs = qs.filter(task_assignment__task__is_deleted=False)
        if status:
            qs = qs.filter(status=status)
        return qs
    def calculate_avg_score(
        self,
        student_ids: List[int] = None,
        user_id: int = None,
        task_deleted: bool = False
    ) -> Optional[float]:
        """
        计算平均分
        Args:
            student_ids: 可选的学员用户 ID 列表
            user_id: 可选的单个学员用户 ID
            task_deleted: 是否包含已删除的任务
        Returns:
            平均分或 None
        """
        qs = Submission.objects.filter(status='GRADED')
        if not task_deleted:
            qs = qs.filter(task_assignment__task__is_deleted=False)
        if student_ids:
            qs = qs.filter(user_id__in=student_ids)
        elif user_id:
            qs = qs.filter(user_id=user_id)
        result = qs.aggregate(avg_score=Avg('obtained_score'))
        return float(result['avg_score']) if result['avg_score'] else None
