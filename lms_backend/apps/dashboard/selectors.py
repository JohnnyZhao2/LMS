"""
Dashboard selectors.
集中管理仪表盘读模型查询与统计。
"""
from datetime import datetime, time, timedelta
from typing import Any, Dict, List, Optional

from django.conf import settings
from django.db.models import Avg, Count, OuterRef, QuerySet, Subquery
from django.utils import timezone

from apps.activity_logs.models import UserLog
from apps.knowledge.models import Knowledge
from apps.submissions.models import Submission
from apps.tasks.models import TaskAssignment
from apps.users.models import User


def get_pending_tasks(user_id: int, limit: int = 10) -> QuerySet:
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


def get_latest_knowledge(limit: int = 6) -> QuerySet:
    return Knowledge.objects.filter(
        is_deleted=False,
        is_current=True
    ).select_related(
        'created_by', 'updated_by'
    ).order_by('-updated_at')[:limit]


def get_student_assignments(
    user_id: int,
    task_deleted: bool = False
) -> QuerySet:
    qs = TaskAssignment.objects.filter(assignee_id=user_id)
    if not task_deleted:
        qs = qs.filter(task__is_deleted=False)
    return qs


def get_assignments_by_students(
    student_ids: List[int],
    task_deleted: bool = False
) -> QuerySet:
    qs = TaskAssignment.objects.filter(assignee_id__in=student_ids)
    if not task_deleted:
        qs = qs.filter(task__is_deleted=False)
    return qs.select_related('task')


def calculate_task_stats(assignments: QuerySet) -> Dict[str, Any]:
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


def calculate_avg_score(
    student_ids: Optional[List[int]] = None,
    user_id: Optional[int] = None,
    task_deleted: bool = False
) -> Optional[float]:
    qs = Submission.objects.filter(status='GRADED')
    if not task_deleted:
        qs = qs.filter(task_assignment__task__is_deleted=False)
    if student_ids:
        qs = qs.filter(user_id__in=student_ids)
    elif user_id:
        qs = qs.filter(user_id=user_id)
    result = qs.aggregate(avg_score=Avg('obtained_score'))
    return float(result['avg_score']) if result['avg_score'] else None


def get_weekly_active_users_count(user_ids: List[int]) -> int:
    if not user_ids:
        return 0
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
    active_user_ids = UserLog.objects.filter(
        user_id__in=user_ids,
        action='login',
        status='success',
        created_at__gte=start_dt,
        created_at__lt=end_dt
    ).values_list('user_id', flat=True).distinct()
    return User.objects.filter(
        id__in=active_user_ids,
        is_active=True
    ).count()


def get_monthly_tasks_count() -> int:
    """获取本月发布的任务数量"""
    if settings.USE_TZ:
        today = timezone.localdate()
    else:
        today = datetime.now().date()
    start_of_month = today.replace(day=1)
    start_dt = datetime.combine(start_of_month, time.min)
    if settings.USE_TZ:
        tz = timezone.get_current_timezone()
        start_dt = timezone.make_aware(start_dt, tz)

    from apps.tasks.models import Task
    return Task.objects.filter(
        is_deleted=False,
        created_at__gte=start_dt
    ).count()


def get_student_all_tasks(user_id: int, limit: int = 10) -> QuerySet:
    """
    获取学员的任务列表
    排序：按截止日期倒序（最新截止的在前）
    """
    return TaskAssignment.objects.filter(
        assignee_id=user_id,
        task__is_deleted=False,
    ).select_related(
        'task', 'task__created_by'
    ).prefetch_related(
        'task__task_knowledge',
        'task__task_quizzes',
        'knowledge_progress'
    ).order_by('-task__deadline')[:limit]


def get_urgent_tasks_count(user_id: int, hours: int = 48) -> int:
    """获取即将截止的任务数量（默认48小时内）"""
    deadline_threshold = timezone.now() + timedelta(hours=hours)
    return TaskAssignment.objects.filter(
        assignee_id=user_id,
        status='IN_PROGRESS',
        task__is_deleted=False,
        task__is_closed=False,
        task__deadline__lte=deadline_threshold,
        task__deadline__gt=timezone.now()
    ).count()


def get_student_exam_avg_score(user_id: int) -> Optional[float]:
    """获取学员的考试平均分"""
    result = Submission.objects.filter(
        user_id=user_id,
        status='GRADED',
        task_assignment__task__is_deleted=False,
        quiz__quiz_type='EXAM'
    ).aggregate(avg_score=Avg('obtained_score'))
    return float(result['avg_score']) if result['avg_score'] else None


def calculate_assignment_progress(
    assignment: 'TaskAssignment',
    quiz_completed: Optional[int] = None
) -> Dict[str, Any]:
    """
    计算单个任务分配的进度
    Args:
        assignment: TaskAssignment 实例（需要预加载 task, task__task_knowledge, task__task_quizzes, knowledge_progress）
        quiz_completed: 预计算的已完成测验数量（避免 N+1 查询）
    Returns:
        进度字典，包含 completed, total, percentage, knowledge_total, knowledge_completed, quiz_total, quiz_completed
    """
    task = assignment.task
    total_k = task.task_knowledge.count()
    total_q = task.task_quizzes.count()
    total = total_k + total_q

    if total == 0:
        return {
            'completed': 0,
            'total': 0,
            'percentage': 0,
            'knowledge_total': 0,
            'knowledge_completed': 0,
            'quiz_total': 0,
            'quiz_completed': 0
        }

    completed_k = assignment.knowledge_progress.filter(is_completed=True).count()
    if quiz_completed is None:
        completed_q = Submission.objects.filter(
            task_assignment=assignment
        ).values_list('quiz_id', flat=True).distinct().count()
    else:
        completed_q = quiz_completed
    completed = completed_k + completed_q

    return {
        'completed': completed,
        'total': total,
        'percentage': round(completed / total * 100, 1),
        'knowledge_total': total_k,
        'knowledge_completed': completed_k,
        'quiz_total': total_q,
        'quiz_completed': completed_q
    }


def get_peer_ranking(user_id: int, limit: int = 5) -> List[Dict[str, Any]]:
    """
    获取同组学员的完成率排名
    基于同一导师下的学员进行排名
    """
    user = User.objects.filter(id=user_id).select_related('mentor').first()
    if not user or not user.mentor:
        return []

    # 获取同导师下的所有学员
    peers = User.objects.filter(
        mentor=user.mentor,
        is_active=True
    ).exclude(
        role__in=['ADMIN', 'DEPT_MANAGER', 'TEAM_MANAGER', 'MENTOR']
    )

    peer_stats = []
    for peer in peers:
        assignments = get_student_assignments(user_id=peer.id)
        stats = calculate_task_stats(assignments)
        peer_stats.append({
            'id': peer.id,
            'name': peer.username,
            'progress': stats['completion_rate'],
            'is_me': peer.id == user_id
        })

    # 按完成率排序
    peer_stats.sort(key=lambda x: x['progress'], reverse=True)

    # 添加排名
    for i, peer in enumerate(peer_stats):
        peer['rank'] = i + 1

    # 找到当前用户的位置，返回其周围的学员
    my_index = next((i for i, p in enumerate(peer_stats) if p['is_me']), 0)
    start = max(0, my_index - 2)
    end = min(len(peer_stats), start + limit)
    if end - start < limit:
        start = max(0, end - limit)

    return peer_stats[start:end]


def get_students_needing_attention(
    student_ids: List[int],
    days_inactive: int = 7
) -> List[Dict[str, Any]]:
    """
    获取需要关注的学员列表
    预警规则：
    1. 有逾期任务
    2. 最近考试不及格（< 60分）
    3. 近 N 天无活跃记录
    """
    if not student_ids:
        return []

    from apps.quizzes.models import Quiz

    alerts_by_student: Dict[int, List[Dict[str, Any]]] = {}

    # 1. 查询有逾期任务的学员
    overdue_assignments = TaskAssignment.objects.filter(
        assignee_id__in=student_ids,
        status='OVERDUE',
        task__is_deleted=False
    ).select_related('task', 'assignee', 'assignee__department')

    for assignment in overdue_assignments:
        student_id = assignment.assignee_id
        if student_id not in alerts_by_student:
            alerts_by_student[student_id] = []
        # 检查是否已有逾期任务的预警
        existing_overdue = next(
            (a for a in alerts_by_student[student_id] if a['type'] == 'overdue'),
            None
        )
        if existing_overdue:
            existing_overdue['count'] += 1
            existing_overdue['tasks'].append({
                'task_id': assignment.task.id,
                'task_title': assignment.task.title
            })
        else:
            alerts_by_student[student_id].append({
                'type': 'overdue',
                'level': 'high',
                'message': '有逾期任务',
                'count': 1,
                'tasks': [{
                    'task_id': assignment.task.id,
                    'task_title': assignment.task.title
                }]
            })

    # 2. 查询最近考试不及格的学员
    failed_submissions = Submission.objects.filter(
        user_id__in=student_ids,
        status='GRADED',
        quiz__quiz_type='EXAM',
        task_assignment__task__is_deleted=False
    ).select_related('quiz', 'user', 'user__department')

    for submission in failed_submissions:
        pass_score = submission.quiz.pass_score or 60
        if submission.obtained_score is not None and submission.obtained_score < pass_score:
            student_id = submission.user_id
            if student_id not in alerts_by_student:
                alerts_by_student[student_id] = []
            # 检查是否已有考试不及格的预警
            existing_failed = next(
                (a for a in alerts_by_student[student_id] if a['type'] == 'failed_exam'),
                None
            )
            if not existing_failed:
                alerts_by_student[student_id].append({
                    'type': 'failed_exam',
                    'level': 'high',
                    'message': '考试不及格',
                    'score': float(submission.obtained_score),
                    'quiz_title': submission.quiz.title
                })

    # 3. 查询近 N 天无活跃记录的学员
    if settings.USE_TZ:
        now = timezone.now()
    else:
        now = datetime.now()
    inactive_threshold = now - timedelta(days=days_inactive)

    # 获取近 N 天有活跃记录的学员 ID
    active_user_ids = set(UserLog.objects.filter(
        user_id__in=student_ids,
        created_at__gte=inactive_threshold
    ).values_list('user_id', flat=True).distinct())

    # 找出不活跃的学员
    inactive_user_ids = set(student_ids) - active_user_ids
    for student_id in inactive_user_ids:
        if student_id not in alerts_by_student:
            alerts_by_student[student_id] = []
        alerts_by_student[student_id].append({
            'type': 'inactive',
            'level': 'medium',
            'message': f'近 {days_inactive} 天无活跃记录'
        })

    # 构建返回结果
    result = []
    students = User.objects.filter(id__in=alerts_by_student.keys()).select_related('department')
    student_map = {s.id: s for s in students}

    for student_id, alerts in alerts_by_student.items():
        student = student_map.get(student_id)
        if not student:
            continue
        # 按优先级排序：high > medium > low
        level_order = {'high': 0, 'medium': 1, 'low': 2}
        alerts.sort(key=lambda x: level_order.get(x['level'], 2))
        result.append({
            'student_id': student_id,
            'student_name': student.username,
            'employee_id': student.employee_id or '',
            'department_name': student.department.name if student.department else None,
            'alerts': alerts,
            'alert_count': len(alerts),
            'highest_level': alerts[0]['level'] if alerts else 'low'
        })

    # 按预警数量和级别排序
    result.sort(key=lambda x: (-x['alert_count'], {'high': 0, 'medium': 1, 'low': 2}.get(x['highest_level'], 2)))

    return result


def get_task_participants_progress(
    task_id: int,
    current_user_id: int,
    limit: int = 5
) -> List[Dict[str, Any]]:
    """
    获取任务参与者的进度
    Args:
        task_id: 任务ID
        current_user_id: 当前用户ID
        limit: 返回数量限制
    Returns:
        参与者进度列表
    """
    # 子查询：计算每个 assignment 的已完成测验数量
    quiz_completed_subquery = Submission.objects.filter(
        task_assignment=OuterRef('pk')
    ).values('task_assignment').annotate(
        cnt=Count('quiz_id', distinct=True)
    ).values('cnt')

    # 获取该任务的所有分配，并预计算已完成测验数量
    assignments = TaskAssignment.objects.filter(
        task_id=task_id,
        task__is_deleted=False
    ).select_related(
        'assignee', 'task'
    ).prefetch_related(
        'task__task_knowledge',
        'task__task_quizzes',
        'knowledge_progress'
    ).annotate(
        quiz_completed_count=Subquery(quiz_completed_subquery)
    )

    if not assignments.exists():
        return []

    participants = []
    for assignment in assignments:
        quiz_completed = assignment.quiz_completed_count or 0
        progress_data = calculate_assignment_progress(assignment, quiz_completed)
        participants.append({
            'id': assignment.assignee.id,
            'name': assignment.assignee.username,
            'progress': progress_data['percentage'],
            'is_me': assignment.assignee.id == current_user_id
        })

    # 按进度排序
    participants.sort(key=lambda x: x['progress'], reverse=True)

    # 添加排名
    for i, p in enumerate(participants):
        p['rank'] = i + 1

    # 找到当前用户位置，返回周围的参与者
    my_index = next((i for i, p in enumerate(participants) if p['is_me']), 0)
    start = max(0, my_index - 2)
    end = min(len(participants), start + limit)
    if end - start < limit:
        start = max(0, end - limit)

    return participants[start:end]
