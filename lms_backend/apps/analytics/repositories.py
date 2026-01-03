"""
Analytics 模块仓储实现

负责所有分析统计相关的数据访问操作。
封装了跨模块的数据查询，为 Analytics Service 提供统一的数据访问接口。
"""
from typing import Optional, List, Dict, Any
from django.db.models import QuerySet, Avg, Count, Sum, Max
from django.db.models.functions import Coalesce

from core.base_repository import BaseRepository
from apps.tasks.models import TaskAssignment
from apps.knowledge.models import Knowledge
from apps.submissions.models import Submission, Answer
from apps.users.models import User, Department


class TaskAssignmentAnalyticsRepository:
    """
    任务分配分析仓储
    
    提供用于分析统计的任务分配查询方法。
    """
    
    @staticmethod
    def get_pending_tasks(
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
    
    @staticmethod
    def get_student_assignments(
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
    
    @staticmethod
    def get_assignments_by_students(
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
    
    @staticmethod
    def calculate_task_stats(assignments: QuerySet) -> Dict[str, Any]:
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


class KnowledgeAnalyticsRepository:
    """
    知识文档分析仓储
    
    提供用于分析统计的知识文档查询方法。
    """
    
    @staticmethod
    def get_latest_knowledge(limit: int = 5) -> QuerySet[Knowledge]:
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
    
    @staticmethod
    def get_knowledge_heat(
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
    
    @staticmethod
    def get_knowledge_statistics() -> Dict[str, Any]:
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


class SubmissionAnalyticsRepository:
    """
    答题记录分析仓储
    
    提供用于分析统计的答题记录查询方法。
    """
    
    @staticmethod
    def get_student_submissions(
        user_id: int,
        status_filter: List[str] = None,
        task_deleted: bool = False
    ) -> QuerySet[Submission]:
        """
        获取学员的答题记录
        
        Args:
            user_id: 学员用户 ID
            status_filter: 可选的状态过滤列表
            task_deleted: 是否包含已删除的任务
            
        Returns:
            QuerySet
        """
        qs = Submission.objects.filter(user_id=user_id)
        
        if not task_deleted:
            qs = qs.filter(task_assignment__task__is_deleted=False)
        
        if status_filter:
            qs = qs.filter(status__in=status_filter)
        
        return qs.select_related(
            'task_assignment__task',
            'quiz'
        ).order_by('-submitted_at', '-created_at')
    
    @staticmethod
    def get_student_graded_submissions(
        user_id: int,
        task_deleted: bool = False
    ) -> QuerySet[Submission]:
        """
        获取学员已评分的答题记录
        
        Args:
            user_id: 学员用户 ID
            task_deleted: 是否包含已删除的任务
            
        Returns:
            QuerySet
        """
        return SubmissionAnalyticsRepository.get_student_submissions(
            user_id=user_id,
            status_filter=['GRADED'],
            task_deleted=task_deleted
        )
    
    @staticmethod
    def get_submissions_by_students(
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
    
    @staticmethod
    def calculate_avg_score(
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
    
    @staticmethod
    def get_pending_grading_count(
        student_ids: List[int] = None,
        task_deleted: bool = False
    ) -> int:
        """
        获取待评分数量
        
        Args:
            student_ids: 可选的学员用户 ID 列表
            task_deleted: 是否包含已删除的任务
            
        Returns:
            待评分数量
        """
        qs = Submission.objects.filter(status='GRADING')
        
        if not task_deleted:
            qs = qs.filter(task_assignment__task__is_deleted=False)
        
        if student_ids:
            qs = qs.filter(user_id__in=student_ids)
        
        return qs.count()
    
    @staticmethod
    def get_score_summary(
        user_id: int,
        task_deleted: bool = False
    ) -> Dict[str, Any]:
        """
        获取学员成绩摘要
        
        Args:
            user_id: 学员用户 ID
            task_deleted: 是否包含已删除的任务
            
        Returns:
            成绩摘要字典
        """
        qs = Submission.objects.filter(
            user_id=user_id,
            status='GRADED'
        )
        
        if not task_deleted:
            qs = qs.filter(task_assignment__task__is_deleted=False)
        
        stats = qs.aggregate(
            total_count=Count('id'),
            avg_score=Avg('obtained_score'),
            max_score=Max('obtained_score')
        )
        
        return {
            'practice': {
                'total_count': stats['total_count'] or 0,
                'avg_score': float(stats['avg_score']) if stats['avg_score'] else None,
                'max_score': float(stats['max_score']) if stats['max_score'] else None,
            },
            'exam': {
                'total_count': 0,
                'avg_score': None,
                'max_score': None,
                'passed_count': 0,
            }
        }


class AnswerAnalyticsRepository:
    """
    答案记录分析仓储
    
    提供用于分析统计的答案记录查询方法。
    """
    
    @staticmethod
    def get_wrong_answers(
        user_id: int,
        question_type: str = None,
        task_deleted: bool = False
    ) -> QuerySet[Answer]:
        """
        获取学员的错题
        
        Args:
            user_id: 学员用户 ID
            question_type: 可选的题目类型过滤
            task_deleted: 是否包含已删除的任务
            
        Returns:
            QuerySet
        """
        qs = Answer.objects.filter(
            submission__user_id=user_id,
            submission__status__in=['SUBMITTED', 'GRADING', 'GRADED'],
            is_correct=False
        )
        
        if not task_deleted:
            qs = qs.filter(submission__task_assignment__task__is_deleted=False)
        
        if question_type:
            qs = qs.filter(question__question_type=question_type)
        
        return qs.select_related(
            'submission__task_assignment__task',
            'submission__quiz',
            'question'
        ).order_by('-submission__submitted_at', '-created_at')
    
    @staticmethod
    def get_wrong_answer_summary(
        user_id: int,
        task_deleted: bool = False
    ) -> Dict[str, Any]:
        """
        获取错题摘要统计
        
        Args:
            user_id: 学员用户 ID
            task_deleted: 是否包含已删除的任务
            
        Returns:
            错题摘要字典
        """
        qs = Answer.objects.filter(
            submission__user_id=user_id,
            submission__status__in=['SUBMITTED', 'GRADING', 'GRADED'],
            is_correct=False
        )
        
        if not task_deleted:
            qs = qs.filter(submission__task_assignment__task__is_deleted=False)
        
        by_type = qs.values('question__question_type').annotate(count=Count('id'))
        
        type_counts = {
            'SINGLE_CHOICE': 0,
            'MULTIPLE_CHOICE': 0,
            'TRUE_FALSE': 0,
            'SHORT_ANSWER': 0,
        }
        
        for item in by_type:
            q_type = item['question__question_type']
            if q_type in type_counts:
                type_counts[q_type] = item['count']
        
        return {
            'total_count': sum(type_counts.values()),
            'by_type': type_counts
        }


class UserAnalyticsRepository:
    """
    用户分析仓储
    
    提供用于分析统计的用户查询方法。
    """
    
    @staticmethod
    def get_all_active_users() -> QuerySet[User]:
        """
        获取所有活跃用户
        
        Returns:
            QuerySet
        """
        return User.objects.filter(is_active=True)
    
    @staticmethod
    def get_users_by_department(department_id: int) -> QuerySet[User]:
        """
        获取部门下的所有用户
        
        Args:
            department_id: 部门 ID
            
        Returns:
            QuerySet
        """
        return User.objects.filter(
            department_id=department_id,
            is_active=True
        )


class DepartmentAnalyticsRepository:
    """
    部门分析仓储
    
    提供用于分析统计的部门查询方法。
    """
    
    @staticmethod
    def get_all_departments() -> QuerySet[Department]:
        """
        获取所有部门
        
        Returns:
            QuerySet
        """
        return Department.objects.all()
    
    @staticmethod
    def count_departments() -> int:
        """
        统计部门数量
        
        Returns:
            部门数量
        """
        return Department.objects.count()
