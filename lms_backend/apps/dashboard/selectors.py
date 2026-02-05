"""
Dashboard selectors.
集中管理仪表盘读模型查询与统计。
"""
from datetime import datetime, time, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Set

from django.conf import settings
from django.db.models import Avg, Case, Count, F, IntegerField, OuterRef, QuerySet, Subquery, Sum, Value, When, Window
from django.db.models.functions import Coalesce, RowNumber
from django.utils import timezone

from apps.activity_logs.models import UserLog
from apps.knowledge.models import Knowledge
from apps.spot_checks.models import SpotCheck
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


def calculate_average_completion_rate_by_students(
    student_ids: List[int],
    task_deleted: bool = False
) -> float:
    """
    计算成员维度的平均完成率（先算每个成员，再做平均）
    - 无任务成员按 0 计入均值
    """
    if not student_ids:
        return 0.0

    assignments = TaskAssignment.objects.filter(assignee_id__in=student_ids)
    if not task_deleted:
        assignments = assignments.filter(task__is_deleted=False)

    per_student_stats = assignments.values('assignee_id').annotate(
        total=Count('id'),
        completed=Sum(
            Case(
                When(status='COMPLETED', then=Value(1)),
                default=Value(0),
                output_field=IntegerField(),
            )
        ),
    )
    stats_map: Dict[int, Dict[str, int]] = {
        row['assignee_id']: {
            'total': row['total'],
            'completed': row['completed'],
        }
        for row in per_student_stats
    }

    total_rate = 0.0
    for student_id in student_ids:
        stat = stats_map.get(student_id)
        if not stat or stat['total'] == 0:
            total_rate += 0.0
            continue
        total_rate += stat['completed'] / stat['total'] * 100

    return round(total_rate / len(student_ids), 1)


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
    return float(result['avg_score']) if result['avg_score'] is not None else None


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


def get_month_start_datetime() -> datetime:
    """获取本月起始时间（考虑时区）"""
    if settings.USE_TZ:
        today = timezone.localdate()
    else:
        today = datetime.now().date()
    start_of_month = today.replace(day=1)
    start_dt = datetime.combine(start_of_month, time.min)
    if settings.USE_TZ:
        tz = timezone.get_current_timezone()
        start_dt = timezone.make_aware(start_dt, tz)
    return start_dt


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
    return float(result['avg_score']) if result['avg_score'] is not None else None


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
    recent_exam_limit: int = 3
) -> List[Dict[str, Any]]:
    """
    获取需要关注的学员列表
    预警规则：
    1. 有逾期任务
    2. 最近 N 次考试中存在不及格（< 60分）
    """
    if not student_ids:
        return []

    alerts_by_student: Dict[int, List[Dict[str, Any]]] = {}

    if settings.USE_TZ:
        now = timezone.now()
    else:
        now = datetime.now()

    # 1. 查询有逾期任务的学员
    overdue_assignments = TaskAssignment.objects.filter(
        assignee_id__in=student_ids,
        task__is_deleted=False,
        task__is_closed=False,
        task__deadline__lt=now
    ).exclude(
        status='COMPLETED'
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

    # 2. 查询最近 N 次考试中存在不及格的学员
    if recent_exam_limit > 0:
        failed_submissions = Submission.objects.filter(
            user_id__in=student_ids,
            status='GRADED',
            quiz__quiz_type='EXAM',
            task_assignment__task__is_deleted=False
        ).annotate(
            _row_number=Window(
                expression=RowNumber(),
                partition_by=[F('user_id')],
                order_by=Coalesce('submitted_at', 'created_at').desc()
            ),
            _pass_score=Coalesce('quiz__pass_score', Value(Decimal('60')))
        ).filter(
            _row_number__lte=recent_exam_limit,
            obtained_score__isnull=False,
            obtained_score__lt=F('_pass_score')
        ).select_related(
            'quiz',
            'user',
            'user__department',
            'task_assignment',
            'task_assignment__task'
        ).order_by('user_id', Coalesce('submitted_at', 'created_at').desc())

        for submission in failed_submissions:
            student_id = submission.user_id
            if student_id not in alerts_by_student:
                alerts_by_student[student_id] = []
            # 检查是否已有考试不及格的预警
            existing_failed = next(
                (a for a in alerts_by_student[student_id] if a['type'] == 'failed_exam'),
                None
            )
            if not existing_failed:
                task = submission.task_assignment.task if submission.task_assignment else None
                alerts_by_student[student_id].append({
                    'type': 'failed_exam',
                    'level': 'high',
                    'message': '考试不及格',
                    'score': float(submission.obtained_score),
                    'quiz_title': submission.quiz.title,
                    'task_id': task.id if task else None,
                    'task_title': task.title if task else None
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


def get_overdue_warning(
    student_ids: List[int],
    due_soon_hours: int = 12,
    limit: int = 3
) -> Dict[str, Any]:
    """
    获取逾期/即将逾期任务预警
    Returns:
        {
            "overdue_count": int,
            "due_soon_count": int,
            "due_soon_hours": int,
            "items": [ ... ]
        }
    """
    if not student_ids:
        return {
            'overdue_count': 0,
            'due_soon_count': 0,
            'due_soon_hours': due_soon_hours,
            'items': []
        }

    now = timezone.now()
    due_soon_deadline = now + timedelta(hours=due_soon_hours)

    base_qs = TaskAssignment.objects.filter(
        assignee_id__in=student_ids,
        task__is_deleted=False,
        task__is_closed=False,
    ).select_related('task', 'assignee', 'assignee__department')

    overdue_qs = base_qs.filter(
        task__deadline__lt=now
    ).exclude(
        status='COMPLETED'
    ).order_by('-task__deadline')

    due_soon_qs = base_qs.filter(
        status='IN_PROGRESS',
        task__deadline__gte=now,
        task__deadline__lte=due_soon_deadline
    ).order_by('task__deadline')

    overdue_count = overdue_qs.count()
    due_soon_count = due_soon_qs.count()

    items: List[Dict[str, Any]] = []

    for assignment in overdue_qs[:limit]:
        delta_hours = round((assignment.task.deadline - now).total_seconds() / 3600, 1)
        items.append({
            'assignment_id': assignment.id,
            'task_id': assignment.task.id,
            'task_title': assignment.task.title,
            'student_id': assignment.assignee.id,
            'student_name': assignment.assignee.username,
            'employee_id': assignment.assignee.employee_id or '',
            'department_name': assignment.assignee.department.name if assignment.assignee.department else None,
            'deadline': assignment.task.deadline,
            'urgency': 'OVERDUE',
            'hours_to_deadline': delta_hours,
        })

    if len(items) < limit:
        remaining = limit - len(items)
        for assignment in due_soon_qs[:remaining]:
            delta_hours = round((assignment.task.deadline - now).total_seconds() / 3600, 1)
            items.append({
                'assignment_id': assignment.id,
                'task_id': assignment.task.id,
                'task_title': assignment.task.title,
                'student_id': assignment.assignee.id,
                'student_name': assignment.assignee.username,
                'employee_id': assignment.assignee.employee_id or '',
                'department_name': assignment.assignee.department.name if assignment.assignee.department else None,
                'deadline': assignment.task.deadline,
                'urgency': 'DUE_SOON',
                'hours_to_deadline': delta_hours,
            })

    return {
        'overdue_count': overdue_count,
        'due_soon_count': due_soon_count,
        'due_soon_hours': due_soon_hours,
        'items': items
    }


def get_pending_grading_count(student_ids: List[int]) -> int:
    """获取待人工评分的提交数量（GRADING）"""
    if not student_ids:
        return 0
    return Submission.objects.filter(
        user_id__in=student_ids,
        status='GRADING',
        task_assignment__task__is_deleted=False
    ).count()


def get_monthly_spot_check_stats(student_ids: List[int]) -> Dict[str, Any]:
    """获取本月抽查统计（名下学员）"""
    if not student_ids:
        return {'count': 0, 'avg_score': None}
    start_dt = get_month_start_datetime()
    result = SpotCheck.objects.filter(
        student_id__in=student_ids,
        checked_at__gte=start_dt
    ).aggregate(
        count=Count('id'),
        avg_score=Avg('score')
    )
    avg_score = float(result['avg_score']) if result['avg_score'] is not None else None
    return {
        'count': result['count'],
        'avg_score': round(avg_score, 1) if avg_score is not None else None
    }


def get_monthly_spot_check_stats_by_student(student_ids: List[int]) -> Dict[int, Dict[str, Any]]:
    """获取本月抽查统计（按学员分组）"""
    if not student_ids:
        return {}
    start_dt = get_month_start_datetime()
    stats = SpotCheck.objects.filter(
        student_id__in=student_ids,
        checked_at__gte=start_dt
    ).values('student_id').annotate(
        count=Count('id'),
        avg_score=Avg('score')
    )
    result: Dict[int, Dict[str, Any]] = {}
    for item in stats:
        avg_score = float(item['avg_score']) if item['avg_score'] is not None else None
        result[item['student_id']] = {
            'count': item['count'],
            'avg_score': round(avg_score, 1) if avg_score is not None else None
        }
    return result


def get_monthly_active_user_ids(user_ids: List[int]) -> Set[int]:
    """获取本月活跃用户 ID 集合（登录成功）"""
    if not user_ids:
        return set()
    start_dt = get_month_start_datetime()
    active_user_ids = UserLog.objects.filter(
        user_id__in=user_ids,
        action='login',
        status='success',
        created_at__gte=start_dt
    ).values_list('user_id', flat=True).distinct()
    return set(active_user_ids)


def get_score_distribution(student_ids: List[int]) -> Dict[str, int]:
    """
    获取成绩分布（考试提交）
    规则：
    - 不及格：低于试卷 pass_score（默认 60）
    - 及格/良/优：基于总分百分比 80/90 划分
    """
    if not student_ids:
        return {
            'excellent': 0,
            'good': 0,
            'pass': 0,
            'fail': 0,
            'total': 0
        }

    submissions = Submission.objects.filter(
        user_id__in=student_ids,
        status='GRADED',
        quiz__quiz_type='EXAM',
        task_assignment__task__is_deleted=False,
        obtained_score__isnull=False
    ).values_list(
        'obtained_score',
        'total_score',
        'quiz__pass_score'
    )

    distribution = {
        'excellent': 0,
        'good': 0,
        'pass': 0,
        'fail': 0,
        'total': 0
    }

    for obtained_score, total_score, pass_score in submissions:
        score = float(obtained_score) if obtained_score is not None else 0.0
        total = float(total_score) if total_score is not None else 0.0
        pass_line = float(pass_score) if pass_score is not None else 60.0

        distribution['total'] += 1

        if score < pass_line:
            distribution['fail'] += 1
            continue

        score_pct = (score / total * 100) if total > 0 else score

        if score_pct >= 90:
            distribution['excellent'] += 1
        elif score_pct >= 80:
            distribution['good'] += 1
        else:
            distribution['pass'] += 1

    return distribution


def get_department_comparison(student_ids: List[int]) -> List[Dict[str, Any]]:
    """
    获取跨部门对比数据
    Returns:
        [
            {"id": 1, "name": "一室", "student_count": 45, "completion_rate": 88.5, "avg_score": 82.3},
            {"id": 2, "name": "二室", "student_count": 75, "completion_rate": 82.1, "avg_score": 75.8},
        ]
    """
    if not student_ids:
        return []

    from apps.users.models import Department

    # 获取学员所属部门
    students = User.objects.filter(id__in=student_ids).select_related('department')
    dept_student_map: Dict[int, List[int]] = {}
    for student in students:
        if student.department_id:
            if student.department_id not in dept_student_map:
                dept_student_map[student.department_id] = []
            dept_student_map[student.department_id].append(student.id)

    if not dept_student_map:
        return []

    # 获取部门信息
    departments = Department.objects.filter(id__in=dept_student_map.keys())
    dept_info = {d.id: d.name for d in departments}

    result = []
    for dept_id, dept_student_ids in dept_student_map.items():
        completion_rate = calculate_average_completion_rate_by_students(dept_student_ids)
        avg_score = calculate_avg_score(student_ids=dept_student_ids)
        result.append({
            'id': dept_id,
            'name': dept_info.get(dept_id, f'部门{dept_id}'),
            'student_count': len(dept_student_ids),
            'completion_rate': completion_rate,
            'avg_score': round(avg_score, 1) if avg_score is not None else None
        })

    # 按学员数量排序
    result.sort(key=lambda x: x['student_count'], reverse=True)
    return result


def get_monthly_score_trend(student_ids: List[int], months: int = 6) -> List[Dict[str, Any]]:
    """
    获取月度成绩趋势
    Returns:
        [
            {"month": "2026-01", "avg_score": 76.2, "submission_count": 150},
            {"month": "2025-12", "avg_score": 74.8, "submission_count": 142},
        ]
    """
    if not student_ids:
        return []

    from django.db.models.functions import TruncMonth

    # 计算起始时间
    if settings.USE_TZ:
        today = timezone.localdate()
    else:
        today = datetime.now().date()
    start_year = today.year
    start_month = today.month - (months - 1)
    while start_month <= 0:
        start_month += 12
        start_year -= 1
    start_dt = datetime.combine(today.replace(year=start_year, month=start_month, day=1), time.min)
    if settings.USE_TZ:
        tz = timezone.get_current_timezone()
        start_dt = timezone.make_aware(start_dt, tz)

    # 按月聚合
    monthly_stats = Submission.objects.filter(
        user_id__in=student_ids,
        status='GRADED',
        task_assignment__task__is_deleted=False,
        obtained_score__isnull=False
    ).annotate(
        effective_submitted_at=Coalesce('submitted_at', 'created_at'),
    ).filter(
        effective_submitted_at__gte=start_dt
    ).annotate(
        month=TruncMonth('effective_submitted_at')
    ).values('month').annotate(
        avg_score=Avg('obtained_score'),
        submission_count=Count('id')
    ).order_by('-month')

    result = []
    for item in monthly_stats:
        if item['month']:
            result.append({
                'month': item['month'].strftime('%Y-%m'),
                'avg_score': round(float(item['avg_score']), 1) if item['avg_score'] is not None else None,
                'submission_count': item['submission_count']
            })

    return result[:months]


def get_mentor_performance(student_ids: List[int]) -> List[Dict[str, Any]]:
    """
    获取导师绩效数据
    Returns:
        [
            {
                "id": 1, "name": "张导师", "department_name": "一室",
                "student_count": 15, "completion_rate": 92.0, "avg_score": 85.2
            },
        ]
    """
    if not student_ids:
        return []

    # 获取学员及其导师
    students = User.objects.filter(
        id__in=student_ids
    ).select_related('mentor', 'mentor__department').exclude(mentor__isnull=True)

    mentor_student_map: Dict[int, List[int]] = {}
    mentor_info: Dict[int, Dict[str, Any]] = {}

    for student in students:
        if student.mentor_id:
            if student.mentor_id not in mentor_student_map:
                mentor_student_map[student.mentor_id] = []
                mentor_info[student.mentor_id] = {
                    'id': student.mentor_id,
                    'name': student.mentor.username,
                    'department_name': student.mentor.department.name if student.mentor.department else None
                }
            mentor_student_map[student.mentor_id].append(student.id)

    if not mentor_student_map:
        return []

    result = []
    for mentor_id, mentor_student_ids in mentor_student_map.items():
        completion_rate = calculate_average_completion_rate_by_students(mentor_student_ids)
        avg_score = calculate_avg_score(student_ids=mentor_student_ids)
        info = mentor_info[mentor_id]
        result.append({
            'id': info['id'],
            'name': info['name'],
            'department_name': info['department_name'],
            'student_count': len(mentor_student_ids),
            'completion_rate': completion_rate,
            'avg_score': round(avg_score, 1) if avg_score is not None else None
        })

    # 按完成率排序
    result.sort(key=lambda x: x['completion_rate'], reverse=True)
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
