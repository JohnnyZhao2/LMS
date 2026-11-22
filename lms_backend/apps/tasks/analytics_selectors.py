"""Task analytics, node progress, and student execution selectors."""

from typing import Any, Optional

from django.db.models import Prefetch
from django.utils import timezone

from apps.submissions.models import Submission
from apps.submissions.scoring import submission_recency_key
from core.exceptions import BusinessError, ErrorCodes

from .models import KnowledgeLearningProgress, Task, TaskAssignment, TaskKnowledge, TaskQuiz
from .selectors import (
    ANALYTICS_SUBMISSION_STATUSES,
    is_exam_submission_abnormal,
    task_knowledge_queryset,
    task_quiz_queryset,
)

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


def assignment_activity_minutes(assignment: TaskAssignment) -> float:
    total_seconds = 0.0
    for progress in assignment.knowledge_progress.all():
        if not progress.is_completed:
            continue
        if progress.completed_at and progress.started_at:
            total_seconds += max(0.0, (progress.completed_at - progress.started_at).total_seconds())
    for submission in assignment.submissions.all():
        if submission.submitted_at and submission.started_at:
            total_seconds += max(0.0, (submission.submitted_at - submission.started_at).total_seconds())
    return total_seconds / 60


def _build_distribution(
    values: list[float],
    ranges: list[tuple[str, float, float]],
) -> list[dict[str, int]]:
    distribution = {item[0]: 0 for item in ranges}
    for value in values:
        for label, minimum, maximum in ranges:
            if minimum <= value < maximum:
                distribution[label] += 1
                break
    return [{'range': label, 'count': count} for label, count in distribution.items()]


def _duration_minutes(started_at, ended_at) -> Optional[float]:
    if not started_at or not ended_at:
        return None
    return round(max(0.0, (ended_at - started_at).total_seconds() / 60), 1)


def _select_quiz_submission(
    submissions: list[Submission],
    *,
    allow_retry: bool,
) -> Optional[Submission]:
    submitted = [s for s in submissions if s.status in ANALYTICS_SUBMISSION_STATUSES]
    in_progress = [s for s in submissions if s.status == 'IN_PROGRESS']

    if submitted:
        latest = max(
            submitted,
            key=lambda s: submission_recency_key(s.status, s.attempt_number, s.submitted_at, s.id),
        )
        if allow_retry:
            if latest.status == 'GRADING':
                return latest
            graded = [
                s for s in submitted
                if s.status in ACCURACY_SUBMISSION_STATUSES and s.obtained_score is not None
            ]
            if graded:
                return max(graded, key=lambda s: (s.obtained_score, s.submitted_at or s.created_at, s.id))
        return latest

    if in_progress:
        return max(in_progress, key=lambda s: (s.started_at or s.created_at, s.id))
    return None


def _split_submission_scores(submission: Submission) -> tuple[Optional[float], Optional[float], bool]:
    objective_score = (
        round(float(submission.objective_score), 2)
        if submission.objective_score is not None
        else None
    )
    is_subjective_pending = submission.status == 'GRADING'
    subjective_score = (
        round(float(submission.subjective_score), 2)
        if not is_subjective_pending and submission.subjective_score is not None
        else None
    )
    return objective_score, subjective_score, is_subjective_pending


def _build_node_progress_from_loaded(
    task_knowledge_items: list[TaskKnowledge],
    task_quiz_items: list[TaskQuiz],
    knowledge_progress_map: dict[int, list[KnowledgeLearningProgress]],
    quiz_submissions_map: dict[int, dict[int, list[Submission]]],
    total_count: int,
    *,
    is_task_overdue: bool = False,
) -> tuple[list[dict[str, Any]], list[tuple[TaskQuiz, list[Submission]]]]:
    nodes: list[dict[str, Any]] = []

    for task_knowledge in task_knowledge_items:
        rows = knowledge_progress_map.get(task_knowledge.id, [])
        completed = len(rows)
        remaining = max(0, total_count - completed)
        overdue_count = remaining if is_task_overdue else 0
        pending_count = 0 if is_task_overdue else remaining
        durations = [
            minutes
            for progress in rows
            if (minutes := _duration_minutes(progress.started_at, progress.completed_at)) is not None
        ]
        average_time = round(sum(durations) / len(durations), 1) if durations else None
        nodes.append(
            {
                'node_id': task_knowledge.id,
                'node_name': task_knowledge.knowledge.title,
                'category': 'KNOWLEDGE',
                'completed_count': completed,
                'pending_count': pending_count,
                'overdue_count': overdue_count,
                'total_count': total_count,
                'percentage': round(completed / total_count * 100, 1) if total_count > 0 else 0,
                'average_time': average_time,
                'average_score': None,
                'duration': None,
                'total_score': None,
                'pass_score': None,
                'pass_rate': None,
                'passed_count': None,
                'failed_count': None,
                'abnormal_count': 0,
                'time_distribution': _build_distribution(durations, TIME_DISTRIBUTION_RANGES),
                'score_distribution': None,
            }
        )

    ordered_task_quizzes = sorted(
        task_quiz_items,
        key=lambda tq: (0 if tq.allow_retry else 1, tq.order, tq.id),
    )
    quiz_representatives: list[tuple[TaskQuiz, list[Submission]]] = []
    for task_quiz in ordered_task_quizzes:
        by_assignment = quiz_submissions_map.get(task_quiz.id, {})
        representatives: list[Submission] = []
        completed = 0
        durations = []
        scores = []
        score_percentages = []
        pending_grading_count = 0
        abnormal_count = 0
        for subs in by_assignment.values():
            rep = _select_quiz_submission(subs, allow_retry=task_quiz.allow_retry)
            if rep is None:
                continue
            representatives.append(rep)
            minutes = _duration_minutes(rep.started_at, rep.submitted_at)
            if minutes is not None:
                durations.append(minutes)
            graded_subs = (
                [
                    s for s in subs
                    if s.status in ACCURACY_SUBMISSION_STATUSES and s.obtained_score is not None
                ]
                if task_quiz.allow_retry
                else []
            )
            if rep.status == 'GRADING' and not graded_subs:
                pending_grading_count += 1
            elif rep.status in ACCURACY_SUBMISSION_STATUSES or graded_subs:
                completed += 1
                score_source = (
                    rep
                    if rep.status in ACCURACY_SUBMISSION_STATUSES
                    else max(graded_subs, key=lambda s: (s.obtained_score, s.submitted_at or s.created_at, s.id))
                )
                if score_source.obtained_score is not None:
                    scores.append(float(score_source.obtained_score))
                    if score_source.total_score > 0:
                        score_percentages.append(
                            round(float(score_source.obtained_score) / float(score_source.total_score) * 100, 1)
                        )
            if not task_quiz.allow_retry and is_exam_submission_abnormal(rep):
                abnormal_count += 1
        quiz_representatives.append((task_quiz, representatives))

        remaining = max(0, total_count - completed)
        if is_task_overdue:
            overdue_count = max(0, remaining - pending_grading_count)
            pending_count = pending_grading_count
        else:
            overdue_count = 0
            pending_count = remaining

        average_time = round(sum(durations) / len(durations), 1) if durations else None
        average_score = round(sum(scores) / len(scores), 1) if scores else None

        pass_rate = None
        passed_count = None
        failed_count = None
        if not task_quiz.allow_retry and task_quiz.pass_score is not None:
            graded_reps = [
                rep for rep in representatives
                if rep.status in ACCURACY_SUBMISSION_STATUSES and rep.obtained_score is not None
            ]
            passed_count = sum(1 for rep in graded_reps if rep.obtained_score >= task_quiz.pass_score)
            failed_count = len(graded_reps) - passed_count
            if graded_reps:
                pass_rate = round(passed_count / len(graded_reps) * 100, 1)

        nodes.append(
            {
                'node_id': task_quiz.id,
                'node_name': task_quiz.title,
                'category': 'PRACTICE' if task_quiz.allow_retry else 'EXAM',
                'completed_count': completed,
                'pending_count': pending_count,
                'overdue_count': overdue_count,
                'total_count': total_count,
                'percentage': round(completed / total_count * 100, 1) if total_count > 0 else 0,
                'average_time': average_time,
                'average_score': average_score,
                'duration': task_quiz.duration,
                'total_score': float(task_quiz.total_score or 0),
                'pass_score': (
                    float(task_quiz.pass_score)
                    if (not task_quiz.allow_retry and task_quiz.pass_score is not None)
                    else None
                ),
                'pass_rate': pass_rate,
                'passed_count': passed_count,
                'failed_count': failed_count,
                'abnormal_count': abnormal_count,
                'time_distribution': _build_distribution(durations, TIME_DISTRIBUTION_RANGES),
                'score_distribution': _build_distribution(score_percentages, SCORE_DISTRIBUTION_RANGES),
            }
        )
    return nodes, quiz_representatives


def _is_deadline_overdue(deadline) -> bool:
    return bool(deadline and deadline < timezone.now())


def task_analytics_payload(task_id: int, *, deadline=None) -> dict[str, Any]:
    is_task_overdue = _is_deadline_overdue(deadline)

    assignments = list(
        TaskAssignment.objects.filter(task_id=task_id).prefetch_related(
            'knowledge_progress',
            Prefetch(
                'submissions',
                queryset=Submission.objects.filter(
                    status__in=ANALYTICS_SUBMISSION_STATUSES,
                ).select_related('task_quiz'),
            ),
        )
    )
    total_count = len(assignments)
    completed_assignments = [
        a for a in assignments if a.status == 'COMPLETED' and a.completed_at is not None
    ]
    completed_count = sum(1 for a in assignments if a.status == 'COMPLETED')

    knowledge_progress_map: dict[int, list[KnowledgeLearningProgress]] = {}
    quiz_submissions_map: dict[int, dict[int, list[Submission]]] = {}
    assignment_assignee_map = {a.id: a.assignee_id for a in assignments}
    for assignment in assignments:
        for progress in assignment.knowledge_progress.all():
            if progress.is_completed:
                knowledge_progress_map.setdefault(progress.task_knowledge_id, []).append(progress)
        for submission in assignment.submissions.all():
            quiz_submissions_map.setdefault(submission.task_quiz_id, {}).setdefault(
                assignment.id, []
            ).append(submission)

    task_knowledge_items = list(task_knowledge_queryset(task_id))
    task_quiz_items = list(task_quiz_queryset(task_id))
    total_knowledge_count = len(task_knowledge_items)
    total_quiz_count = len(task_quiz_items)
    pending_grading_ids: set[int] = set()
    for assignment in assignments:
        if assignment.status == 'COMPLETED':
            continue
        completed_k = sum(1 for p in assignment.knowledge_progress.all() if p.is_completed)
        if completed_k < total_knowledge_count:
            continue
        latest_by_quiz: dict[int, Submission] = {}
        completed_q: set[int] = set()
        for sub in assignment.submissions.all():
            if sub.status in ACCURACY_SUBMISSION_STATUSES:
                completed_q.add(sub.task_quiz_id)
            prev = latest_by_quiz.get(sub.task_quiz_id)
            if prev is None or submission_recency_key(
                sub.status, sub.attempt_number, sub.submitted_at, sub.id
            ) > submission_recency_key(
                prev.status, prev.attempt_number, prev.submitted_at, prev.id
            ):
                latest_by_quiz[sub.task_quiz_id] = sub
        grading_q = {qid for qid, sub in latest_by_quiz.items() if sub.status == 'GRADING'}
        if grading_q and len(completed_q | grading_q) >= total_quiz_count:
            pending_grading_ids.add(assignment.id)

    overdue_count = sum(
        1 for a in assignments
        if a.status != 'COMPLETED'
        and (a.status == 'OVERDUE' or is_task_overdue)
        and a.id not in pending_grading_ids
    )
    in_progress_count = max(0, total_count - completed_count - overdue_count)
    average_time = (
        round(
            sum(assignment_activity_minutes(a) for a in completed_assignments) / len(completed_assignments),
            1,
        )
        if completed_assignments
        else 0.0
    )

    node_progress, quiz_representatives = _build_node_progress_from_loaded(
        task_knowledge_items,
        task_quiz_items,
        knowledge_progress_map,
        quiz_submissions_map,
        total_count,
        is_task_overdue=is_task_overdue,
    )

    abnormal_assignee_ids: set[int] = set()
    for task_quiz, representatives in quiz_representatives:
        for rep in representatives:
            if not task_quiz.allow_retry and is_exam_submission_abnormal(rep):
                assignee_id = assignment_assignee_map.get(rep.task_assignment_id)
                if assignee_id is not None:
                    abnormal_assignee_ids.add(assignee_id)

    return {
        'completion': {
            'completed_count': completed_count,
            'in_progress_count': in_progress_count,
            'overdue_count': overdue_count,
            'total_count': total_count,
            'percentage': round(completed_count / total_count * 100, 1) if total_count > 0 else 0,
        },
        'average_time': average_time,
        'abnormal_count': len(abnormal_assignee_ids),
        'node_progress': node_progress,
    }


def _resolve_target_node(
    task_id: int,
    node_type: Optional[str],
    node_id: Optional[int],
) -> Optional[tuple[str, int]]:
    if node_type is None and node_id is None:
        first_knowledge = task_knowledge_queryset(task_id).first()
        if first_knowledge is not None:
            return ('KNOWLEDGE', first_knowledge.id)
        first_quiz = task_quiz_queryset(task_id).order_by('-allow_retry', 'order', 'id').first()
        if first_quiz is not None:
            return ('PRACTICE' if first_quiz.allow_retry else 'EXAM', first_quiz.id)
        return None

    if node_type == 'KNOWLEDGE':
        if not TaskKnowledge.objects.filter(id=node_id, task_id=task_id).exists():
            raise BusinessError(ErrorCodes.RESOURCE_NOT_FOUND, '任务知识节点不存在')
        return ('KNOWLEDGE', node_id)
    if node_type == 'PRACTICE':
        if not TaskQuiz.objects.filter(id=node_id, task_id=task_id, allow_retry=True).exists():
            raise BusinessError(ErrorCodes.RESOURCE_NOT_FOUND, '任务测验节点不存在')
        return ('PRACTICE', node_id)
    if node_type == 'EXAM':
        if not TaskQuiz.objects.filter(id=node_id, task_id=task_id, allow_retry=False).exists():
            raise BusinessError(ErrorCodes.RESOURCE_NOT_FOUND, '任务考试节点不存在')
        return ('EXAM', node_id)
    raise BusinessError(ErrorCodes.INVALID_INPUT, '无效的节点类型')


def _student_identity_payload(assignment: TaskAssignment) -> dict[str, Any]:
    return {
        'student_id': assignment.assignee.id,
        'student_name': assignment.assignee.username,
        'avatar_key': assignment.assignee.avatar_key,
        'employee_id': assignment.assignee.employee_id or '',
        'department': assignment.assignee.department.name if assignment.assignee.department else '',
    }


def _default_execution_row(assignment: TaskAssignment, **overrides: Any) -> dict[str, Any]:
    return {
        **_student_identity_payload(assignment),
        'status': 'NOT_STARTED',
        'started_at': None,
        'completed_at': None,
        'time_spent': None,
        'objective_score': None,
        'subjective_score': None,
        'score': None,
        'is_passed': None,
        'is_subjective_pending': False,
        'attempt_count': None,
        'is_abnormal': False,
        **overrides,
    }


def task_student_executions(
    task_id: int,
    *,
    deadline=None,
    node_type: Optional[str] = None,
    node_id: Optional[int] = None,
) -> list[dict[str, Any]]:
    resolved = _resolve_target_node(task_id, node_type, node_id)
    if resolved is None:
        return []
    target_type, target_id = resolved

    is_task_overdue = _is_deadline_overdue(deadline)

    assignments = list(
        TaskAssignment.objects.filter(task_id=task_id).select_related(
            'assignee',
            'assignee__department',
        ).order_by('-created_at')
    )
    results: list[dict[str, Any]] = []

    if target_type == 'KNOWLEDGE':
        progress_by_assignment = {
            progress.assignment_id: progress
            for progress in KnowledgeLearningProgress.objects.filter(
                assignment__task_id=task_id,
                task_knowledge_id=target_id,
            )
        }
        for assignment in assignments:
            progress = progress_by_assignment.get(assignment.id)
            if progress is None or (
                not progress.is_completed and not progress.started_at and not progress.completed_at
            ):
                results.append(
                    _default_execution_row(
                        assignment,
                        status='OVERDUE' if is_task_overdue else 'NOT_STARTED',
                    )
                )
            elif progress.is_completed:
                results.append(
                    _default_execution_row(
                        assignment,
                        status='COMPLETED',
                        started_at=progress.started_at,
                        completed_at=progress.completed_at,
                        time_spent=_duration_minutes(progress.started_at, progress.completed_at),
                    )
                )
            else:
                results.append(
                    _default_execution_row(
                        assignment,
                        status='OVERDUE' if is_task_overdue else 'IN_PROGRESS',
                        started_at=progress.started_at,
                    )
                )
        return results

    allow_retry = target_type == 'PRACTICE'
    subs_by_assignment: dict[int, list[Submission]] = {}
    for submission in Submission.objects.filter(
        task_assignment__task_id=task_id,
        task_quiz_id=target_id,
    ).select_related('task_quiz'):
        subs_by_assignment.setdefault(submission.task_assignment_id, []).append(submission)

    for assignment in assignments:
        subs = subs_by_assignment.get(assignment.id, [])
        submitted_subs = [s for s in subs if s.status in ANALYTICS_SUBMISSION_STATUSES]
        rep = _select_quiz_submission(subs, allow_retry=allow_retry)
        if rep is None:
            results.append(
                _default_execution_row(
                    assignment,
                    status='OVERDUE' if is_task_overdue else 'NOT_STARTED',
                    attempt_count=0 if allow_retry else None,
                )
            )
        elif not submitted_subs:
            results.append(
                _default_execution_row(
                    assignment,
                    status='OVERDUE' if is_task_overdue else 'IN_PROGRESS',
                    started_at=rep.started_at,
                    attempt_count=0 if allow_retry else None,
                )
            )
        else:
            objective_score, subjective_score, is_subjective_pending = _split_submission_scores(rep)
            if not is_subjective_pending and rep.obtained_score is not None:
                score = float(rep.obtained_score)
                pass_score = rep.task_quiz.pass_score
                is_passed = (
                    bool(rep.obtained_score >= pass_score)
                    if (not allow_retry and pass_score is not None)
                    else None
                )
            else:
                score = None
                is_passed = None
            results.append(
                _default_execution_row(
                    assignment,
                    status='PENDING_GRADING' if is_subjective_pending else 'COMPLETED',
                    started_at=rep.started_at,
                    completed_at=rep.submitted_at,
                    time_spent=_duration_minutes(rep.started_at, rep.submitted_at),
                    objective_score=objective_score,
                    subjective_score=subjective_score,
                    score=score,
                    is_passed=is_passed,
                    is_subjective_pending=is_subjective_pending,
                    attempt_count=len(submitted_subs) if allow_retry else None,
                    is_abnormal=(not allow_retry) and is_exam_submission_abnormal(rep),
                )
            )
    return results
