"""Dashboard 服务：学员 / 导师 / 全局概览统计与同伴进度。"""

from datetime import datetime, time, timedelta
from typing import Any, Dict, List, Optional

from django.conf import settings
from django.db.models import Avg, Count, F, FloatField, Prefetch, Q, QuerySet
from django.db.models.expressions import ExpressionWrapper
from django.utils import timezone

from apps.activity_logs.models import ActivityLog
from apps.authorization.engine import scope_learning_members
from apps.knowledge.models import Knowledge
from apps.submissions.models import Submission
from apps.tasks.models import Task, TaskAssignment, TaskQuiz
from apps.tasks.progress import build_assignment_progress, get_assignment_quiz_progress_map
from apps.users.models import User
from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes


def _get_month_start_datetime() -> datetime:
    if settings.USE_TZ:
        today = timezone.localdate()
    else:
        today = datetime.now().date()
    start_dt = datetime.combine(today.replace(day=1), time.min)
    if settings.USE_TZ:
        start_dt = timezone.make_aware(start_dt, timezone.get_current_timezone())
    return start_dt


def get_monthly_tasks_count() -> int:
    return Task.objects.filter(created_at__gte=_get_month_start_datetime()).count()


def get_latest_knowledge(limit: int = 6) -> QuerySet:
    return Knowledge.objects.select_related(
        'created_by', 'updated_by', 'space_tag',
    ).defer('related_links').order_by('-updated_at')[:limit]


def calculate_task_stats(assignments: QuerySet) -> Dict[str, Any]:
    stats = assignments.aggregate(
        total_tasks=Count('id'),
        completed_tasks=Count('id', filter=Q(status='COMPLETED')),
        in_progress_tasks=Count('id', filter=Q(status='IN_PROGRESS')),
        overdue_tasks=Count('id', filter=Q(status='OVERDUE')),
    )
    total_tasks = stats['total_tasks'] or 0
    completed_tasks = stats['completed_tasks'] or 0
    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0.0
    return {
        'total_tasks': total_tasks,
        'completed_tasks': completed_tasks,
        'in_progress_tasks': stats['in_progress_tasks'] or 0,
        'overdue_tasks': stats['overdue_tasks'] or 0,
        'completion_rate': round(completion_rate, 1),
    }


def calculate_exam_avg_score_rate(
    *,
    student_ids=None,
    user_id: Optional[int] = None,
) -> Optional[float]:
    """考试平均得分率（0–100），仅 GRADED + EXAM。"""
    qs = Submission.objects.filter(
        status=Submission.STATUS_GRADED,
        quiz__quiz_type='EXAM',
        obtained_score__isnull=False,
        total_score__gt=0,
    )
    if student_ids is not None:
        qs = qs.filter(user_id__in=student_ids)
    elif user_id is not None:
        qs = qs.filter(user_id=user_id)
    result = qs.aggregate(
        avg_rate=Avg(
            ExpressionWrapper(
                F('obtained_score') * 100.0 / F('total_score'),
                output_field=FloatField(),
            )
        )
    )
    avg = result['avg_rate']
    return round(float(avg), 1) if avg is not None else None


def get_weekly_active_users_count(user_ids) -> int:
    if settings.USE_TZ:
        today = timezone.localdate()
    else:
        today = datetime.now().date()
    start_date = today - timedelta(days=today.weekday())
    start_dt = datetime.combine(start_date, time.min)
    end_dt = start_dt + timedelta(days=7)
    if settings.USE_TZ:
        tz = timezone.get_current_timezone()
        start_dt = timezone.make_aware(start_dt, tz)
        end_dt = timezone.make_aware(end_dt, tz)
    return (
        ActivityLog.objects.filter(
            category='user',
            actor_id__in=user_ids,
            action='login',
            status='success',
            created_at__gte=start_dt,
            created_at__lt=end_dt,
        )
        .values('actor_id')
        .distinct()
        .count()
    )


def get_dashboard_user_queryset() -> QuerySet:
    return User.objects.filter(is_active=True).exclude(is_superuser=True).distinct()


def get_student_assignments(user_id: int) -> QuerySet:
    return TaskAssignment.objects.filter(assignee_id=user_id)


def get_student_all_tasks(user_id: int, limit: int = 10) -> QuerySet:
    return TaskAssignment.objects.filter(
        assignee_id=user_id,
    ).select_related(
        'task', 'task__created_by',
    ).prefetch_related(
        'task__task_knowledge',
        'task__task_quizzes',
        'knowledge_progress',
    ).order_by('-task__deadline')[:limit]


def get_urgent_tasks_count(user_id: int, hours: int = 48) -> int:
    deadline_threshold = timezone.now() + timedelta(hours=hours)
    return TaskAssignment.objects.filter(
        assignee_id=user_id,
        status='IN_PROGRESS',
        task__deadline__lte=deadline_threshold,
        task__deadline__gt=timezone.now(),
    ).count()


def get_task_participants_progress(
    task_id: int,
    current_user_id: int,
) -> List[Dict[str, Any]]:
    assignments = list(
        TaskAssignment.objects.filter(task_id=task_id).select_related(
            'assignee', 'task',
        ).prefetch_related(
            'task__task_knowledge',
            Prefetch('task__task_quizzes', queryset=TaskQuiz.objects.select_related('quiz')),
            'knowledge_progress',
        )
    )
    quiz_progress_map = get_assignment_quiz_progress_map(
        [assignment.id for assignment in assignments]
    )

    participants = []
    for assignment in assignments:
        progress_data = build_assignment_progress(
            assignment,
            quiz_progress=quiz_progress_map.get(assignment.id),
        )
        participants.append({
            'id': assignment.assignee.id,
            'name': assignment.assignee.username,
            'progress': progress_data['percentage'],
            'is_me': assignment.assignee.id == current_user_id,
        })

    participants.sort(key=lambda x: x['progress'], reverse=True)
    for index, participant in enumerate(participants):
        participant['rank'] = index + 1
    return participants


class StudentDashboardService(BaseService):
    """学员仪表盘：统计、任务、最新知识、同伴进度。"""

    def get_dashboard_data(
        self,
        user: User,
        task_limit: int = 10,
        knowledge_limit: int = 6,
    ) -> Dict[str, Any]:
        tasks = list(get_student_all_tasks(user.id, limit=task_limit))
        quiz_progress_map = get_assignment_quiz_progress_map(
            [assignment.id for assignment in tasks]
        )
        return {
            'stats': self.get_stats(user),
            'tasks': tasks,
            'latest_knowledge': get_latest_knowledge(limit=knowledge_limit),
            'quiz_progress_map': quiz_progress_map,
        }

    def get_task_participants(self, user: User, task_id: int) -> List[Dict[str, Any]]:
        if not TaskAssignment.objects.filter(
            task_id=task_id,
            assignee_id=user.id,
        ).exists():
            raise BusinessError(
                ErrorCodes.PERMISSION_DENIED,
                '无权查看该任务参与者',
            )
        return get_task_participants_progress(task_id, user.id)

    def get_stats(self, user: User) -> Dict[str, Any]:
        assignments = get_student_assignments(user_id=user.id)
        task_stats = calculate_task_stats(assignments)
        exam_avg_score = calculate_exam_avg_score_rate(user_id=user.id)
        return {
            'in_progress_count': task_stats['in_progress_tasks'],
            'urgent_count': get_urgent_tasks_count(user.id),
            'completion_rate': task_stats['completion_rate'],
            'exam_avg_score': exam_avg_score,
            'total_tasks': task_stats['total_tasks'],
            'completed_count': task_stats['completed_tasks'],
            'overdue_count': task_stats['overdue_tasks'],
        }


class MentorDashboardService(BaseService):
    """导师/室组仪表盘：管理范围内学员任务与考试得分率。"""

    def get_dashboard_data(self) -> Dict[str, Any]:
        students = scope_learning_members(self.request)
        student_ids = students.values('id')
        total_students = students.count()
        if total_students == 0:
            return {
                'summary': {
                    'total_students': 0,
                    'total_tasks': 0,
                    'completed_tasks': 0,
                    'in_progress_tasks': 0,
                    'overdue_tasks': 0,
                    'overall_completion_rate': 0.0,
                    'overall_avg_score': None,
                },
            }

        assignments = TaskAssignment.objects.filter(assignee_id__in=student_ids)
        stats = calculate_task_stats(assignments)
        overall_avg_score = calculate_exam_avg_score_rate(student_ids=student_ids)
        return {
            'summary': {
                'total_students': total_students,
                'total_tasks': stats['total_tasks'],
                'completed_tasks': stats['completed_tasks'],
                'in_progress_tasks': stats['in_progress_tasks'],
                'overdue_tasks': stats['overdue_tasks'],
                'overall_completion_rate': round(stats['completion_rate'], 1),
                'overall_avg_score': overall_avg_score,
            },
        }


class AdminDashboardService(BaseService):
    """全局仪表盘：周活与本月任务数。"""

    def get_dashboard_data(self) -> Dict[str, Any]:
        user_ids = get_dashboard_user_queryset().values('id')
        return {
            'summary': {
                'weekly_active_users': get_weekly_active_users_count(user_ids=user_ids),
                'monthly_tasks': get_monthly_tasks_count(),
            },
        }
