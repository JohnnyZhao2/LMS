"""任务分析：一次加载基础数据，内存中计算各指标。"""

from __future__ import annotations

from typing import Any, Iterable, Optional

from django.db.models import Prefetch, QuerySet
from django.utils import timezone

from apps.submissions.models import Submission

from .models import TaskAssignment, TaskKnowledge, TaskQuiz
from .progress import (
    QUIZ_COMPLETION_STATUSES,
    assignment_activity_minutes,
    assignment_execution_status,
    is_assignment_abnormal,
)


ACCURACY_SUBMISSION_STATUSES = ('SUBMITTED', 'GRADED')

TIME_DISTRIBUTION_RANGES = [
    ('0-15', 0, 15),
    ('15-30', 15, 30),
    ('30-45', 30, 45),
    ('45-60', 45, 60),
    ('60+', 60, float('inf')),
]

SCORE_DISTRIBUTION_RANGES = [
    ('0-60', 0, 60),
    ('60-70', 60, 70),
    ('70-80', 70, 80),
    ('80-90', 80, 90),
    ('90-100', 90, 101),
]


def build_task_analytics(task_id: int, scoped_members: QuerySet) -> dict[str, Any]:
    """构建任务分析 payload。"""
    base = _load_analytics_base(task_id, scoped_members)
    completion = _completion_stats(base['assignments'])
    node_counts = base['node_counts']
    average_time = _average_completion_minutes(base['assignments'], node_counts)
    has_quiz = len(base['quiz_nodes']) > 0
    accuracy_percentage = _accuracy_percentage(base['assignments']) if has_quiz else None
    score_distribution = None
    pass_rate = None
    if has_quiz:
        score_distribution = _score_distribution(base['assignments'])
        pass_rate = _exam_pass_rate(base['quiz_nodes'], base['assignments'])

    return {
        'completion': completion,
        'average_learning_time': average_time['learning'],
        'average_practice_time': average_time['practice'],
        'average_exam_time': average_time['exam'],
        'accuracy': {'has_quiz': has_quiz, 'percentage': accuracy_percentage},
        'abnormal_count': _abnormal_count(base['assignments']),
        'node_progress': _node_progress(
            base['knowledge_nodes'],
            base['quiz_nodes'],
            base['assignments'],
            completion['total_count'],
        ),
        'learning_time_distribution': _time_distribution(
            base['assignments'], 'learning', node_counts
        ),
        'practice_time_distribution': _time_distribution(
            base['assignments'], 'practice', node_counts
        ),
        'exam_time_distribution': _time_distribution(
            base['assignments'], 'exam', node_counts
        ),
        'score_distribution': score_distribution,
        'pass_rate': pass_rate,
    }


def build_student_executions(task_id: int, scoped_members: QuerySet) -> list[dict[str, Any]]:
    """构建学员执行明细列表。"""
    base = _load_analytics_base(task_id, scoped_members, order_desc=True)
    total_nodes = len(base['knowledge_nodes']) + len(base['quiz_nodes'])
    node_counts = base['node_counts']
    now = timezone.now()
    results = []

    for assignment in base['assignments']:
        completed_knowledge = sum(
            1 for progress in assignment.knowledge_progress.all() if progress.is_completed
        )
        completed_quiz_count = len({
            submission.task_quiz_id for submission in assignment.submissions.all()
        })
        time_spent = assignment_activity_minutes(assignment)
        abnormal = is_assignment_abnormal(assignment)
        results.append(
            {
                'student_id': assignment.assignee.id,
                'student_name': assignment.assignee.username,
                'avatar_key': assignment.assignee.avatar_key,
                'employee_id': assignment.assignee.employee_id or '',
                'department': (
                    assignment.assignee.department.name
                    if assignment.assignee.department
                    else ''
                ),
                'status': assignment_execution_status(
                    assignment, abnormal=abnormal, now=now
                ),
                'node_progress': f'{completed_knowledge + completed_quiz_count}/{total_nodes}',
                'score': float(assignment.score) if assignment.score is not None else None,
                'learning_time_spent': (
                    int(time_spent['learning']) if node_counts['learning'] > 0 else None
                ),
                'practice_time_spent': (
                    int(time_spent['practice']) if node_counts['practice'] > 0 else None
                ),
                'exam_time_spent': (
                    int(time_spent['exam']) if node_counts['exam'] > 0 else None
                ),
                'is_abnormal': abnormal,
            }
        )
    return results


def build_task_abnormal_counts(task_ids: Iterable[int]) -> dict[int, int]:
    """批量计算任务列表异常人数，避免列表预取全部执行明细。"""
    normalized_ids = [task_id for task_id in task_ids if task_id]
    if not normalized_ids:
        return {}

    submissions_prefetch = Prefetch(
        'submissions',
        queryset=Submission.objects.select_related('quiz').filter(
            status__in=QUIZ_COMPLETION_STATUSES,
        ),
    )
    assignments = (
        TaskAssignment.objects.filter(
            task_id__in=normalized_ids,
            status='COMPLETED',
        )
        .prefetch_related('knowledge_progress', submissions_prefetch)
    )
    counts: dict[int, int] = {task_id: 0 for task_id in normalized_ids}
    seen: dict[int, set[int]] = {task_id: set() for task_id in normalized_ids}
    for assignment in assignments:
        if not is_assignment_abnormal(assignment):
            continue
        task_id = assignment.task_id
        if assignment.assignee_id in seen[task_id]:
            continue
        seen[task_id].add(assignment.assignee_id)
        counts[task_id] += 1
    return counts


def _load_analytics_base(
    task_id: int,
    scoped_members: QuerySet,
    *,
    order_desc: bool = False,
) -> dict[str, Any]:
    submissions_prefetch = Prefetch(
        'submissions',
        queryset=Submission.objects.select_related('quiz').filter(
            status__in=QUIZ_COMPLETION_STATUSES,
        ),
    )
    assignments = list(
        TaskAssignment.objects.filter(
            task_id=task_id,
            assignee_id__in=scoped_members.values('id'),
        )
        .select_related('assignee', 'assignee__department', 'task')
        .prefetch_related('knowledge_progress', submissions_prefetch)
        .order_by('-created_at' if order_desc else 'created_at')
    )
    knowledge_nodes = list(
        TaskKnowledge.objects.filter(task_id=task_id)
        .select_related('knowledge')
        .order_by('order')
    )
    quiz_nodes = list(
        TaskQuiz.objects.filter(task_id=task_id)
        .select_related('quiz')
        .order_by('order')
    )
    return {
        'assignments': assignments,
        'knowledge_nodes': knowledge_nodes,
        'quiz_nodes': quiz_nodes,
        'node_counts': {
            'learning': len(knowledge_nodes),
            'practice': sum(1 for node in quiz_nodes if node.quiz.quiz_type == 'PRACTICE'),
            'exam': sum(1 for node in quiz_nodes if node.quiz.quiz_type == 'EXAM'),
        },
    }


def _completion_stats(assignments: list[TaskAssignment]) -> dict[str, Any]:
    total_count = len(assignments)
    completed_count = sum(1 for item in assignments if item.status == 'COMPLETED')
    return {
        'completed_count': completed_count,
        'total_count': total_count,
        'percentage': round(completed_count / total_count * 100, 1) if total_count > 0 else 0,
    }


def _average_completion_minutes(
    assignments: list[TaskAssignment],
    node_counts: dict[str, int],
) -> dict[str, Optional[float]]:
    completed = [
        item
        for item in assignments
        if item.status == 'COMPLETED' and item.completed_at is not None
    ]
    empty_values = {
        'learning': None if node_counts['learning'] == 0 else 0.0,
        'practice': None if node_counts['practice'] == 0 else 0.0,
        'exam': None if node_counts['exam'] == 0 else 0.0,
    }
    if not completed:
        return empty_values

    learning_total = 0.0
    practice_total = 0.0
    exam_total = 0.0
    for assignment in completed:
        duration = assignment_activity_minutes(assignment)
        learning_total += duration['learning']
        practice_total += duration['practice']
        exam_total += duration['exam']

    count = len(completed)
    return {
        'learning': round(learning_total / count, 1) if node_counts['learning'] > 0 else None,
        'practice': round(practice_total / count, 1) if node_counts['practice'] > 0 else None,
        'exam': round(exam_total / count, 1) if node_counts['exam'] > 0 else None,
    }


def _accuracy_percentage(assignments: list[TaskAssignment]) -> Optional[float]:
    total_score = 0.0
    obtained_score = 0.0
    submission_count = 0
    for assignment in assignments:
        for submission in assignment.submissions.all():
            if submission.status not in ACCURACY_SUBMISSION_STATUSES:
                continue
            submission_count += 1
            total_score += float(submission.total_score or 0)
            obtained_score += float(submission.obtained_score or 0)
    if submission_count == 0 or total_score <= 0:
        return None
    return round(obtained_score / total_score * 100, 1)


def _abnormal_count(assignments: list[TaskAssignment]) -> int:
    abnormal_ids = {
        assignment.assignee_id
        for assignment in assignments
        if assignment.status == 'COMPLETED' and is_assignment_abnormal(assignment)
    }
    return len(abnormal_ids)


def _node_progress(
    knowledge_nodes: list[TaskKnowledge],
    quiz_nodes: list[TaskQuiz],
    assignments: list[TaskAssignment],
    total_count: int,
) -> list[dict[str, Any]]:
    knowledge_counts: dict[int, int] = {}
    quiz_counts: dict[int, int] = {}
    for assignment in assignments:
        for progress in assignment.knowledge_progress.all():
            if progress.is_completed:
                knowledge_counts[progress.task_knowledge_id] = (
                    knowledge_counts.get(progress.task_knowledge_id, 0) + 1
                )
        seen_quizzes: set[int] = set()
        for submission in assignment.submissions.all():
            if submission.task_quiz_id in seen_quizzes:
                continue
            seen_quizzes.add(submission.task_quiz_id)
            quiz_counts[submission.task_quiz_id] = quiz_counts.get(submission.task_quiz_id, 0) + 1

    nodes: list[dict[str, Any]] = []
    for task_knowledge in knowledge_nodes:
        completed = knowledge_counts.get(task_knowledge.id, 0)
        nodes.append(
            {
                'node_id': task_knowledge.id,
                'node_name': task_knowledge.knowledge.title,
                'category': 'KNOWLEDGE',
                'completed_count': completed,
                'total_count': total_count,
                'percentage': round(completed / total_count * 100, 1) if total_count > 0 else 0,
            }
        )
    for task_quiz in quiz_nodes:
        completed = quiz_counts.get(task_quiz.id, 0)
        nodes.append(
            {
                'node_id': task_quiz.id,
                'node_name': task_quiz.quiz.title,
                'category': task_quiz.quiz.quiz_type,
                'completed_count': completed,
                'total_count': total_count,
                'percentage': round(completed / total_count * 100, 1) if total_count > 0 else 0,
            }
        )
    return nodes


def _time_distribution(
    assignments: list[TaskAssignment],
    duration_type: str,
    node_counts: dict[str, int],
) -> list[dict[str, int]]:
    if node_counts[duration_type] == 0:
        return []
    distribution = {label: 0 for label, _, _ in TIME_DISTRIBUTION_RANGES}
    for assignment in assignments:
        if assignment.status != 'COMPLETED' or assignment.completed_at is None:
            continue
        duration = assignment_activity_minutes(assignment)[duration_type]
        for label, minimum, maximum in TIME_DISTRIBUTION_RANGES:
            if minimum <= duration < maximum:
                distribution[label] += 1
                break
    return [{'range': label, 'count': count} for label, count in distribution.items()]


def _score_distribution(assignments: list[TaskAssignment]) -> list[dict[str, int]]:
    best_percentages: dict[int, float] = {}
    for assignment in assignments:
        for submission in assignment.submissions.all():
            if submission.status not in ACCURACY_SUBMISSION_STATUSES:
                continue
            if submission.obtained_score is None or not submission.total_score:
                continue
            percentage = round(
                float(submission.obtained_score) / float(submission.total_score) * 100,
                1,
            )
            previous = best_percentages.get(assignment.id)
            if previous is None or percentage > previous:
                best_percentages[assignment.id] = percentage

    distribution = {label: 0 for label, _, _ in SCORE_DISTRIBUTION_RANGES}
    for score in best_percentages.values():
        for label, minimum, maximum in SCORE_DISTRIBUTION_RANGES:
            if minimum <= score < maximum:
                distribution[label] += 1
                break
    return [{'range': label, 'count': count} for label, count in distribution.items()]


def _exam_pass_rate(
    quiz_nodes: list[TaskQuiz],
    assignments: list[TaskAssignment],
) -> Optional[float]:
    has_exam = any(node.quiz.quiz_type == 'EXAM' for node in quiz_nodes)
    if not has_exam:
        return None

    exam_submissions = []
    for assignment in assignments:
        for submission in assignment.submissions.all():
            if submission.quiz.quiz_type != 'EXAM':
                continue
            if submission.obtained_score is None:
                continue
            exam_submissions.append(submission)

    if not exam_submissions:
        return 0.0
    passed_count = sum(
        1
        for submission in exam_submissions
        if submission.quiz.pass_score
        and submission.obtained_score >= submission.quiz.pass_score
    )
    return round(passed_count / len(exam_submissions) * 100, 1)


__all__ = [
    'build_task_analytics',
    'build_student_executions',
    'build_task_abnormal_counts',
]
