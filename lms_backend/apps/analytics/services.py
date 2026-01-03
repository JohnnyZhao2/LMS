"""
Analytics services.

Provides business logic for:
- Dashboard statistics calculation
- Student progress tracking
- Department/team analytics
- Knowledge heat statistics

This service layer separates business logic from Views and Serializers,
improving code reusability and testability.
"""
from typing import List, Optional, Dict, Any
from decimal import Decimal
from django.db.models import QuerySet, Avg, Count, Sum, Max
from django.db.models.functions import Coalesce

from apps.users.models import User, Department
from apps.users.permissions import get_current_role, get_accessible_students
from apps.tasks.models import TaskAssignment
from apps.knowledge.models import Knowledge
from apps.submissions.models import Submission, Answer


def calculate_task_stats(assignments: QuerySet) -> dict:
    """
    Calculate task statistics from a queryset of TaskAssignment objects.
    
    Args:
        assignments: QuerySet of TaskAssignment objects
        
    Returns:
        dict with keys:
            - total_tasks: int
            - completed_tasks: int
            - in_progress_tasks: int
            - overdue_tasks: int
            - completion_rate: float (percentage, rounded to 1 decimal)
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


class StudentDashboardService:
    """
    Service for student dashboard analytics.
    
    Handles:
    - Pending tasks retrieval
    - Latest knowledge retrieval
    - Task summary statistics
    """
    
    @staticmethod
    def get_pending_tasks(user: User, limit: int = 10) -> QuerySet:
        """
        Get pending tasks for a student.
        
        Args:
            user: Student user
            limit: Maximum number of tasks to return
            
        Returns:
            QuerySet of pending TaskAssignment
        """
        return TaskAssignment.objects.filter(
            assignee=user,
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
    def get_latest_knowledge(limit: int = 5) -> QuerySet:
        """
        Get latest published knowledge documents.
        
        Args:
            limit: Maximum number of documents to return
            
        Returns:
            QuerySet of Knowledge
        """
        return Knowledge.objects.filter(
            is_deleted=False
        ).select_related(
            'created_by', 'updated_by'
        ).order_by('-created_at')[:limit]
    
    @staticmethod
    def get_task_summary(user: User) -> Dict[str, int]:
        """
        Get task summary statistics for a student.
        
        Args:
            user: Student user
            
        Returns:
            Dict with pending, completed, overdue, total counts
        """
        base_query = TaskAssignment.objects.filter(
            assignee=user,
            task__is_deleted=False
        )
        
        return {
            'pending': base_query.filter(status='IN_PROGRESS').count(),
            'completed': base_query.filter(status='COMPLETED').count(),
            'overdue': base_query.filter(status='OVERDUE').count(),
            'total': base_query.count()
        }


class StudentProfileService:
    """
    Service for student personal center analytics.
    
    Handles:
    - Score history retrieval
    - Wrong answers book
    - Score statistics
    """
    
    @staticmethod
    def get_score_history(
        user: User,
        status_filter: str = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        Get student's score history with pagination.
        
        Args:
            user: Student user
            status_filter: Optional status filter
            page: Page number
            page_size: Items per page
            
        Returns:
            Dict with results, count, pagination info, and summary
        """
        queryset = Submission.objects.filter(
            user=user,
            task_assignment__task__is_deleted=False,
            status__in=['SUBMITTED', 'GRADING', 'GRADED']
        ).select_related(
            'task_assignment__task',
            'quiz'
        ).order_by('-submitted_at', '-created_at')
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        total_count = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        submissions = queryset[start:end]
        
        summary = StudentProfileService._get_score_summary(user)
        
        return {
            'submissions': submissions,
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size if total_count > 0 else 0,
            'summary': summary
        }
    
    @staticmethod
    def _get_score_summary(user: User) -> Dict[str, Any]:
        """Calculate score summary statistics."""
        quiz_stats = Submission.objects.filter(
            user=user,
            task_assignment__task__is_deleted=False,
            status='GRADED'
        ).aggregate(
            total_count=Count('id'),
            avg_score=Avg('obtained_score'),
            max_score=Max('obtained_score')
        )
        
        return {
            'practice': {
                'total_count': quiz_stats['total_count'] or 0,
                'avg_score': float(quiz_stats['avg_score']) if quiz_stats['avg_score'] else None,
                'max_score': float(quiz_stats['max_score']) if quiz_stats['max_score'] else None,
            },
            'exam': {
                'total_count': 0,
                'avg_score': None,
                'max_score': None,
                'passed_count': 0,
            }
        }
    
    @staticmethod
    def get_wrong_answers(
        user: User,
        question_type: str = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        Get student's wrong answers with pagination.
        
        Args:
            user: Student user
            question_type: Optional question type filter
            page: Page number
            page_size: Items per page
            
        Returns:
            Dict with results, count, pagination info, and summary
        """
        queryset = Answer.objects.filter(
            submission__user=user,
            submission__task_assignment__task__is_deleted=False,
            submission__status__in=['SUBMITTED', 'GRADING', 'GRADED'],
            is_correct=False
        ).select_related(
            'submission__task_assignment__task',
            'submission__quiz',
            'question'
        ).order_by('-submission__submitted_at', '-created_at')
        
        if question_type:
            queryset = queryset.filter(question__question_type=question_type)
        
        total_count = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        wrong_answers = queryset[start:end]
        
        summary = StudentProfileService._get_wrong_answer_summary(user)
        
        return {
            'wrong_answers': wrong_answers,
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size if total_count > 0 else 0,
            'summary': summary
        }
    
    @staticmethod
    def _get_wrong_answer_summary(user: User) -> Dict[str, Any]:
        """Calculate wrong answer summary statistics."""
        by_type = Answer.objects.filter(
            submission__user=user,
            submission__task_assignment__task__is_deleted=False,
            submission__status__in=['SUBMITTED', 'GRADING', 'GRADED'],
            is_correct=False
        ).values('question__question_type').annotate(count=Count('id'))
        
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


class MentorDashboardService:
    """
    Service for mentor/department manager dashboard analytics.
    
    Handles:
    - Summary statistics for accessible students
    - Individual student statistics
    - Quick links generation
    """
    
    @staticmethod
    def get_dashboard_data(user: User) -> Dict[str, Any]:
        """
        Get complete dashboard data for mentor/dept manager.
        
        Args:
            user: Mentor or department manager user
            
        Returns:
            Dict with summary, students, quick_links, current_role
        """
        current_role = get_current_role(user)
        students = get_accessible_students(user, current_role)
        student_ids = list(students.values_list('id', flat=True))
        
        summary = MentorDashboardService._calculate_summary(student_ids, user, current_role)
        student_stats = MentorDashboardService._calculate_student_stats(students)
        quick_links = MentorDashboardService._generate_quick_links(current_role)
        
        return {
            'summary': summary,
            'students': student_stats,
            'quick_links': quick_links,
            'current_role': current_role
        }
    
    @staticmethod
    def _calculate_summary(
        student_ids: List[int],
        user: User,
        current_role: str
    ) -> Dict[str, Any]:
        """Calculate overall summary statistics."""
        if not student_ids:
            return {
                'total_students': 0,
                'total_tasks': 0,
                'completed_tasks': 0,
                'in_progress_tasks': 0,
                'overdue_tasks': 0,
                'overall_completion_rate': 0.0,
                'overall_avg_score': None,
                'pending_grading_count': 0,
                'learning_tasks': {'total': 0, 'completed': 0, 'completion_rate': 0.0},
                'practice_tasks': {'total': 0, 'completed': 0, 'completion_rate': 0.0},
                'exam_tasks': {'total': 0, 'completed': 0, 'completion_rate': 0.0, 'avg_score': None}
            }
        
        assignments = TaskAssignment.objects.filter(
            assignee_id__in=student_ids,
            task__is_deleted=False
        ).select_related('task')
        
        stats = calculate_task_stats(assignments)
        
        avg_score_result = Submission.objects.filter(
            user_id__in=student_ids,
            status='GRADED',
            task_assignment__task__is_deleted=False
        ).aggregate(avg_score=Avg('obtained_score'))
        overall_avg_score = float(avg_score_result['avg_score']) if avg_score_result['avg_score'] else None
        
        pending_grading_count = Submission.objects.filter(
            user_id__in=student_ids,
            status='GRADING',
            task_assignment__task__is_deleted=False
        ).count()
        
        default_stats = {'total': 0, 'completed': 0, 'completion_rate': 0.0}
        
        return {
            'total_students': len(student_ids),
            'total_tasks': stats['total_tasks'],
            'completed_tasks': stats['completed_tasks'],
            'in_progress_tasks': stats['in_progress_tasks'],
            'overdue_tasks': stats['overdue_tasks'],
            'overall_completion_rate': round(stats['completion_rate'], 1),
            'overall_avg_score': round(overall_avg_score, 2) if overall_avg_score else None,
            'pending_grading_count': pending_grading_count,
            'learning_tasks': default_stats,
            'practice_tasks': default_stats,
            'exam_tasks': {**default_stats, 'avg_score': None}
        }
    
    @staticmethod
    def _calculate_student_stats(students: QuerySet) -> List[Dict[str, Any]]:
        """Calculate statistics for each student."""
        student_stats = []
        
        for student in students.select_related('department'):
            assignments = TaskAssignment.objects.filter(
                assignee=student,
                task__is_deleted=False
            )
            
            stats = calculate_task_stats(assignments)
            
            avg_score_result = Submission.objects.filter(
                user=student,
                status='GRADED',
                task_assignment__task__is_deleted=False
            ).aggregate(avg_score=Avg('obtained_score'))
            avg_score = float(avg_score_result['avg_score']) if avg_score_result['avg_score'] else None
            
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
    def _generate_quick_links(current_role: str) -> Dict[str, str]:
        """Generate quick access links."""
        return {
            'create_learning_task': '/tasks/learning/create',
            'create_practice_task': '/tasks/practice/create',
            'create_exam_task': '/tasks/exam/create',
            'test_center': '/test-center',
            'spot_checks': '/spot-checks',
            'grading_center': '/grading',
            'question_bank': '/questions',
            'quiz_management': '/quizzes'
        }


class TeamManagerDashboardService:
    """
    Service for team manager data board analytics.
    
    Handles:
    - Overview statistics across all departments
    - Department-level statistics
    - Knowledge heat statistics
    """
    
    @staticmethod
    def get_overview_data() -> Dict[str, Any]:
        """
        Get team manager overview data.
        
        Returns:
            Dict with overview and departments statistics
        """
        departments = Department.objects.all()
        
        overview = TeamManagerDashboardService._calculate_overview()
        department_stats = TeamManagerDashboardService._calculate_department_stats(departments)
        
        return {
            'overview': overview,
            'departments': department_stats
        }
    
    @staticmethod
    def _calculate_overview() -> Dict[str, Any]:
        """Calculate overall statistics across all departments."""
        total_departments = Department.objects.count()
        total_students = User.objects.filter(is_active=True).count()
        
        assignments = TaskAssignment.objects.filter(task__is_deleted=False)
        stats = calculate_task_stats(assignments)
        
        avg_score_result = Submission.objects.filter(
            status='GRADED',
            task_assignment__task__is_deleted=False
        ).aggregate(avg_score=Avg('obtained_score'))
        overall_avg_score = float(avg_score_result['avg_score']) if avg_score_result['avg_score'] else None
        
        return {
            'total_departments': total_departments,
            'total_students': total_students,
            'total_tasks': stats['total_tasks'],
            'completed_tasks': stats['completed_tasks'],
            'in_progress_tasks': stats['in_progress_tasks'],
            'overdue_tasks': stats['overdue_tasks'],
            'overall_completion_rate': round(stats['completion_rate'], 1),
            'overall_avg_score': round(overall_avg_score, 2) if overall_avg_score else None,
            'learning_tasks': {'total': 0, 'completed': 0, 'completion_rate': 0.0},
            'practice_tasks': {'total': 0, 'completed': 0, 'completion_rate': 0.0},
            'exam_tasks': {'total': 0, 'completed': 0, 'completion_rate': 0.0, 'avg_score': None}
        }
    
    @staticmethod
    def _calculate_department_stats(departments: QuerySet) -> List[Dict[str, Any]]:
        """Calculate statistics for each department."""
        department_stats = []
        
        for dept in departments:
            students = User.objects.filter(department=dept, is_active=True)
            student_ids = list(students.values_list('id', flat=True))
            total_students = len(student_ids)
            
            if total_students == 0:
                department_stats.append({
                    'id': dept.id,
                    'name': dept.name,
                    'code': dept.code,
                    'total_students': 0,
                    'total_tasks': 0,
                    'completed_tasks': 0,
                    'in_progress_tasks': 0,
                    'overdue_tasks': 0,
                    'completion_rate': 0.0,
                    'avg_score': None,
                    'exam_count': 0,
                    'exam_passed_count': 0,
                    'exam_pass_rate': None
                })
                continue
            
            assignments = TaskAssignment.objects.filter(
                assignee_id__in=student_ids,
                task__is_deleted=False
            )
            
            stats = calculate_task_stats(assignments)
            
            avg_score_result = Submission.objects.filter(
                user_id__in=student_ids,
                status='GRADED',
                task_assignment__task__is_deleted=False
            ).aggregate(avg_score=Avg('obtained_score'))
            avg_score = float(avg_score_result['avg_score']) if avg_score_result['avg_score'] else None
            
            department_stats.append({
                'id': dept.id,
                'name': dept.name,
                'code': dept.code,
                'total_students': total_students,
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
        
        return department_stats
    
    @staticmethod
    def get_knowledge_heat(
        limit: int = 20,
        knowledge_type: str = None
    ) -> Dict[str, Any]:
        """
        Get knowledge heat statistics.
        
        Args:
            limit: Maximum number of results
            knowledge_type: Optional knowledge type filter
            
        Returns:
            Dict with results and summary
        """
        queryset = Knowledge.objects.filter(
            is_deleted=False
        ).select_related('created_by')
        
        if knowledge_type:
            queryset = queryset.filter(knowledge_type=knowledge_type)
        
        queryset = queryset.order_by('-view_count')[:limit]
        
        heat_data = []
        for knowledge in queryset:
            line_type = knowledge.line_type
            heat_data.append({
                'id': knowledge.id,
                'title': knowledge.title,
                'knowledge_type': knowledge.knowledge_type,
                'knowledge_type_display': knowledge.get_knowledge_type_display(),
                'line_type': line_type.id if line_type else None,
                'line_type_display': line_type.name if line_type else None,
                'system_tags': [tag.name for tag in knowledge.system_tags.all()],
                'view_count': knowledge.view_count,
                'created_by_name': knowledge.created_by.username if knowledge.created_by else None,
                'created_at': knowledge.created_at,
                'updated_at': knowledge.updated_at
            })
        
        total_views = Knowledge.objects.filter(is_deleted=False).aggregate(
            total=Sum('view_count')
        )['total'] or 0
        
        total_knowledge = Knowledge.objects.filter(is_deleted=False).count()
        
        return {
            'results': heat_data,
            'summary': {
                'total_knowledge': total_knowledge,
                'total_views': total_views,
                'avg_views': round(total_views / total_knowledge, 1) if total_knowledge > 0 else 0
            }
        }
