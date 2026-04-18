"""Dashboard selector facade."""

from .common_queries import (
    calculate_avg_score,
    calculate_task_stats,
    get_latest_knowledge,
    get_month_start_datetime,
    get_monthly_active_user_ids,
    get_monthly_spot_check_stats,
    get_monthly_spot_check_stats_by_student,
    get_monthly_tasks_count,
    get_pending_grading_count,
    get_score_distribution,
    get_weekly_active_users_count,
)
from .mentor_dashboard_queries import (
    get_assignments_by_students,
    get_student_dashboard_metrics,
)
from .student_dashboard_queries import (
    calculate_assignment_progress,
    get_student_all_tasks,
    get_student_assignments,
    get_student_exam_avg_score,
    get_task_participants_progress,
    get_urgent_tasks_count,
)
from .team_manager_dashboard_queries import calculate_average_completion_rate_by_students

__all__ = [
    'calculate_assignment_progress',
    'calculate_average_completion_rate_by_students',
    'calculate_avg_score',
    'calculate_task_stats',
    'get_assignments_by_students',
    'get_latest_knowledge',
    'get_month_start_datetime',
    'get_monthly_active_user_ids',
    'get_monthly_spot_check_stats',
    'get_monthly_spot_check_stats_by_student',
    'get_monthly_tasks_count',
    'get_pending_grading_count',
    'get_score_distribution',
    'get_student_all_tasks',
    'get_student_assignments',
    'get_student_dashboard_metrics',
    'get_student_exam_avg_score',
    'get_task_participants_progress',
    'get_urgent_tasks_count',
    'get_weekly_active_users_count',
]
