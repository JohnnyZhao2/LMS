"""
Task selectors.
集中管理任务相关查询，统一预加载与过滤逻辑。
"""
from typing import Any, Optional

from django.db.models import Count, Max, Prefetch, QuerySet, Sum
from django.utils import timezone

from apps.submissions.models import Submission

from .models import (
    KnowledgeLearningProgress,
    Task,
    TaskAssignment,
    TaskKnowledge,
    TaskQuiz,
)

ANALYTICS_SUBMISSION_STATUSES = ['SUBMITTED', 'GRADING', 'GRADED']
ACCURACY_SUBMISSION_STATUSES = ['SUBMITTED', 'GRADED']

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


def task_detail_queryset(include_deleted: bool = False) -> QuerySet:
    qs = Task.objects.select_related(
        'created_by',
        'updated_by'
    ).prefetch_related(
        'task_knowledge__knowledge__space_tag',
        'task_quizzes__quiz',
        'assignments__assignee'
    )
    if not include_deleted:
        qs = qs.filter(is_deleted=False)
    return qs


def task_base_queryset(include_deleted: bool = False) -> QuerySet:
    qs = Task.objects.select_related('created_by', 'updated_by')
    if not include_deleted:
        qs = qs.filter(is_deleted=False)
    return qs


def assignment_detail_queryset() -> QuerySet:
    return TaskAssignment.objects.select_related(
        'task',
        'task__created_by',
        'task__updated_by',
        'assignee'
    ).prefetch_related(
        'task__task_knowledge__knowledge__space_tag',
        'task__task_quizzes__quiz',
        'knowledge_progress__task_knowledge__knowledge__space_tag'
    )


def assignment_list_queryset() -> QuerySet:
    return TaskAssignment.objects.select_related(
        'task',
        'task__created_by',
        'task__updated_by',
        'assignee'
    ).prefetch_related(
        'task__task_knowledge__knowledge__space_tag',
        'task__task_quizzes',
        'knowledge_progress'
    )


def task_knowledge_queryset(task_id: int) -> QuerySet:
    return TaskKnowledge.objects.filter(
        task_id=task_id
    ).select_related('knowledge', 'knowledge__space_tag', 'task').order_by('order')


def task_quiz_queryset(task_id: int) -> QuerySet:
    return TaskQuiz.objects.filter(
        task_id=task_id
    ).select_related('quiz', 'task').order_by('order')


def knowledge_progress_queryset(assignment_id: int) -> QuerySet:
    return KnowledgeLearningProgress.objects.filter(
        assignment_id=assignment_id
    ).select_related(
        'task_knowledge',
        'task_knowledge__knowledge',
        'task_knowledge__knowledge__space_tag'
    ).order_by('task_knowledge__order')


def analytics_assignment_queryset(task_id: int, order_desc: bool = False) -> QuerySet:
    submissions_prefetch = Prefetch(
        'submissions',
        queryset=Submission.objects.select_related('quiz').filter(
            status__in=ANALYTICS_SUBMISSION_STATUSES
        )
    )
    queryset = TaskAssignment.objects.filter(task_id=task_id).select_related(
        'assignee',
        'assignee__department',
        'task',
    ).prefetch_related(
        'knowledge_progress',
        submissions_prefetch,
    )
    if order_desc:
        return queryset.order_by('-created_at')
    return queryset


def task_submission_score_totals(task_id: int) -> dict:
    totals = Submission.objects.filter(
        task_assignment__task_id=task_id,
        status__in=ACCURACY_SUBMISSION_STATUSES,
    ).aggregate(
        total_score=Sum('total_score'),
        obtained_score=Sum('obtained_score'),
        submission_count=Count('id'),
    )
    return {
        'total_score': totals['total_score'] or 0,
        'obtained_score': totals['obtained_score'] or 0,
        'submission_count': totals['submission_count'] or 0,
    }


def task_knowledge_completion_counts(task_id: int) -> dict[int, int]:
    rows = KnowledgeLearningProgress.objects.filter(
        task_knowledge__task_id=task_id,
        is_completed=True,
    ).values('task_knowledge_id').annotate(
        completed_count=Count('id')
    )
    return {row['task_knowledge_id']: row['completed_count'] for row in rows}


def task_quiz_completion_counts(task_id: int) -> dict[int, int]:
    rows = Submission.objects.filter(
        task_assignment__task_id=task_id,
        status__in=ANALYTICS_SUBMISSION_STATUSES,
    ).values('quiz_id').annotate(
        completed_count=Count('task_assignment_id', distinct=True)
    )
    return {row['quiz_id']: row['completed_count'] for row in rows}


def task_exam_highest_scores(task_id: int) -> list:
    return list(
        Submission.objects.filter(
            task_assignment__task_id=task_id,
            quiz__quiz_type='EXAM',
            status__in=ANALYTICS_SUBMISSION_STATUSES,
            obtained_score__isnull=False,
        ).values('task_assignment_id').annotate(
            max_obtained=Max('obtained_score')
        ).values_list('max_obtained', flat=True)
    )


def task_exam_submissions_queryset(task_id: int) -> QuerySet:
    return Submission.objects.filter(
        task_assignment__task_id=task_id,
        quiz__quiz_type='EXAM',
        status__in=ANALYTICS_SUBMISSION_STATUSES,
        obtained_score__isnull=False,
    ).select_related('quiz')


def is_assignment_abnormal(assignment: TaskAssignment) -> bool:
    """判断学员任务是否异常。"""
    for progress in assignment.knowledge_progress.all():
        if not progress.is_completed:
            continue
        if progress.completed_at and progress.created_at:
            duration = (progress.completed_at - progress.created_at).total_seconds() / 60
            if duration < 5:
                return True

    for submission in assignment.submissions.all():
        if submission.submitted_at and submission.started_at:
            duration = (submission.submitted_at - submission.started_at).total_seconds() / 60
            threshold = 30 if submission.quiz.quiz_type == 'EXAM' else 5
            if duration < threshold:
                return True

    return False


def task_completion_stats(task_id: int) -> dict[str, Any]:
    assignments = analytics_assignment_queryset(task_id=task_id)
    total_count = assignments.count()
    completed_count = assignments.filter(status='COMPLETED').count()
    return {
        'completed_count': completed_count,
        'total_count': total_count,
        'percentage': round(completed_count / total_count * 100, 1) if total_count > 0 else 0,
    }


def task_average_completion_minutes(task_id: int) -> float:
    completed_assignments = analytics_assignment_queryset(task_id=task_id).filter(
        status='COMPLETED',
        completed_at__isnull=False,
    )
    if not completed_assignments.exists():
        return 0.0

    total_time = sum(
        (assignment.completed_at - assignment.created_at).total_seconds() / 60
        for assignment in completed_assignments
    )
    return round(total_time / completed_assignments.count(), 1)


def task_accuracy_stats(task_id: int) -> dict[str, Any]:
    has_quiz = task_quiz_queryset(task_id).exists()
    percentage = None

    if has_quiz:
        score_totals = task_submission_score_totals(task_id)
        total_score = score_totals['total_score']
        obtained_score = score_totals['obtained_score']
        if score_totals['submission_count'] > 0 and total_score > 0:
            percentage = round(float(obtained_score) / float(total_score) * 100, 1)

    return {
        'has_quiz': has_quiz,
        'percentage': percentage,
    }


def task_abnormal_count(task_id: int) -> int:
    abnormal_ids = {
        assignment.assignee_id
        for assignment in analytics_assignment_queryset(task_id=task_id).filter(status='COMPLETED')
        if is_assignment_abnormal(assignment)
    }
    return len(abnormal_ids)


def task_node_progress(task_id: int, total_count: int) -> list[dict[str, Any]]:
    nodes: list[dict[str, Any]] = []
    knowledge_counts = task_knowledge_completion_counts(task_id)
    quiz_counts = task_quiz_completion_counts(task_id)

    for task_knowledge in task_knowledge_queryset(task_id):
        completed = knowledge_counts.get(task_knowledge.id, 0)
        nodes.append({
            'node_id': task_knowledge.id,
            'node_name': task_knowledge.knowledge.title,
            'category': 'KNOWLEDGE',
            'completed_count': completed,
            'total_count': total_count,
            'percentage': round(completed / total_count * 100, 1) if total_count > 0 else 0,
        })

    for task_quiz in task_quiz_queryset(task_id):
        completed = quiz_counts.get(task_quiz.quiz_id, 0)
        nodes.append({
            'node_id': task_quiz.id,
            'node_name': task_quiz.quiz.title,
            'category': task_quiz.quiz.quiz_type,
            'completed_count': completed,
            'total_count': total_count,
            'percentage': round(completed / total_count * 100, 1) if total_count > 0 else 0,
        })

    return nodes


def task_time_distribution(task_id: int) -> list[dict[str, int]]:
    distribution = {item[0]: 0 for item in TIME_DISTRIBUTION_RANGES}
    completed_assignments = analytics_assignment_queryset(task_id=task_id).filter(
        status='COMPLETED',
        completed_at__isnull=False,
    )

    for assignment in completed_assignments:
        if assignment.completed_at and assignment.created_at:
            duration = (assignment.completed_at - assignment.created_at).total_seconds() / 60
            for label, minimum, maximum in TIME_DISTRIBUTION_RANGES:
                if minimum <= duration < maximum:
                    distribution[label] += 1
                    break

    return [{'range': label, 'count': count} for label, count in distribution.items()]


def task_score_distribution(task_id: int) -> list[dict[str, int]]:
    distribution = {item[0]: 0 for item in SCORE_DISTRIBUTION_RANGES}

    for max_score in task_exam_highest_scores(task_id):
        score = float(max_score)
        for label, minimum, maximum in SCORE_DISTRIBUTION_RANGES:
            if minimum <= score < maximum:
                distribution[label] += 1
                break

    return [{'range': label, 'count': count} for label, count in distribution.items()]


def task_exam_pass_rate(task_id: int) -> Optional[float]:
    has_exam = task_quiz_queryset(task_id).filter(quiz__quiz_type='EXAM').exists()
    if not has_exam:
        return None

    exam_submissions = task_exam_submissions_queryset(task_id)
    if not exam_submissions.exists():
        return 0.0

    total_count = exam_submissions.count()
    passed_count = sum(
        1
        for submission in exam_submissions
        if submission.quiz.pass_score and submission.obtained_score >= submission.quiz.pass_score
    )
    return round(passed_count / total_count * 100, 1) if total_count > 0 else 0.0


def task_analytics_payload(task_id: int) -> dict[str, Any]:
    completion = task_completion_stats(task_id)
    accuracy = task_accuracy_stats(task_id)

    score_distribution = None
    pass_rate = None
    if accuracy['has_quiz']:
        score_distribution = task_score_distribution(task_id)
        pass_rate = task_exam_pass_rate(task_id)

    return {
        'completion': completion,
        'average_time': task_average_completion_minutes(task_id),
        'accuracy': accuracy,
        'abnormal_count': task_abnormal_count(task_id),
        'node_progress': task_node_progress(task_id, completion['total_count']),
        'time_distribution': task_time_distribution(task_id),
        'score_distribution': score_distribution,
        'pass_rate': pass_rate,
    }


def task_student_executions(task_id: int) -> list[dict[str, Any]]:
    assignments = analytics_assignment_queryset(task_id=task_id, order_desc=True)
    total_nodes = task_knowledge_queryset(task_id).count() + task_quiz_queryset(task_id).count()
    now = timezone.now()
    results = []

    for assignment in assignments:
        completed_knowledge = sum(1 for progress in assignment.knowledge_progress.all() if progress.is_completed)
        completed_quiz_count = len({submission.quiz_id for submission in assignment.submissions.all()})
        completed_nodes = completed_knowledge + completed_quiz_count

        time_spent = 0
        if assignment.completed_at and assignment.created_at:
            time_spent = int((assignment.completed_at - assignment.created_at).total_seconds() / 60)

        score = None
        exam_submissions = [
            submission for submission in assignment.submissions.all()
            if submission.quiz.quiz_type == 'EXAM' and submission.obtained_score is not None
        ]
        if exam_submissions:
            best_submission = max(exam_submissions, key=lambda submission: submission.obtained_score)
            score = float(best_submission.obtained_score)

        abnormal = is_assignment_abnormal(assignment)
        status = assignment.status
        if status != 'COMPLETED' and assignment.task.deadline < now:
            status = 'OVERDUE'
        if status == 'COMPLETED' and abnormal:
            status = 'COMPLETED_ABNORMAL'

        results.append({
            'student_id': assignment.assignee.id,
            'student_name': assignment.assignee.username,
            'avatar_key': assignment.assignee.avatar_key,
            'employee_id': assignment.assignee.employee_id or '',
            'department': assignment.assignee.department.name if assignment.assignee.department else '',
            'status': status,
            'node_progress': f'{completed_nodes}/{total_nodes}',
            'score': score,
            'time_spent': time_spent,
            'answer_details': '查看详情',
            'is_abnormal': abnormal,
        })

    return results
