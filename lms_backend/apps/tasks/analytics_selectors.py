"""Task analytics, node progress, and student execution selectors."""

from typing import Any, Optional

from django.db.models import Prefetch
from django.utils import timezone

from apps.submissions.models import Submission
from apps.submissions.scoring import submission_recency_key
from core.exceptions import BusinessError, ErrorCodes

from .models import KnowledgeLearningProgress, TaskAssignment, TaskKnowledge, TaskQuiz
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

_NODE_SPEC = {
    'KNOWLEDGE': (TaskKnowledge, {}, '任务知识节点不存在'),
    'PRACTICE': (TaskQuiz, {'allow_retry': True}, '任务测验节点不存在'),
    'EXAM': (TaskQuiz, {'allow_retry': False}, '任务考试节点不存在'),
}


def _pct(part: int, total: int) -> float:
    return round(part / total * 100, 1) if total > 0 else 0


def _avg(values: list[float]) -> Optional[float]:
    return round(sum(values) / len(values), 1) if values else None


def _recency_key(sub: Submission):
    return submission_recency_key(sub.status, sub.attempt_number, sub.submitted_at, sub.id)


def _best_graded(subs: list[Submission]) -> Optional[Submission]:
    graded = [s for s in subs if s.status in ACCURACY_SUBMISSION_STATUSES and s.obtained_score is not None]
    return max(graded, key=lambda s: (s.obtained_score, s.submitted_at or s.created_at, s.id)) if graded else None


def _duration_minutes(started_at, ended_at) -> Optional[float]:
    if not started_at or not ended_at:
        return None
    return round(max(0.0, (ended_at - started_at).total_seconds() / 60), 1)


def _build_distribution(values: list[float], ranges: list[tuple[str, float, float]]) -> list[dict[str, int]]:
    counts = {label: 0 for label, _, _ in ranges}
    for value in values:
        for label, minimum, maximum in ranges:
            if minimum <= value < maximum:
                counts[label] += 1
                break
    return [{'range': label, 'count': count} for label, count in counts.items()]


def assignment_activity_minutes(assignment: TaskAssignment) -> float:
    total_seconds = 0.0
    for progress in assignment.knowledge_progress.all():
        if progress.is_completed and progress.completed_at and progress.started_at:
            total_seconds += max(0.0, (progress.completed_at - progress.started_at).total_seconds())
    for sub in assignment.submissions.all():
        if sub.submitted_at and sub.started_at:
            total_seconds += max(0.0, (sub.submitted_at - sub.started_at).total_seconds())
    return total_seconds / 60


def _select_quiz_submission(submissions: list[Submission], *, allow_retry: bool) -> Optional[Submission]:
    submitted = [s for s in submissions if s.status in ANALYTICS_SUBMISSION_STATUSES]
    if submitted:
        latest = max(submitted, key=_recency_key)
        if allow_retry and latest.status != 'GRADING':
            return _best_graded(submitted) or latest
        return latest
    in_progress = [s for s in submissions if s.status == 'IN_PROGRESS']
    return max(in_progress, key=lambda s: (s.started_at or s.created_at, s.id)) if in_progress else None


def _split_submission_scores(submission: Submission) -> tuple[Optional[float], Optional[float], bool]:
    objective_score = round(float(submission.objective_score), 2) if submission.objective_score is not None else None
    is_pending = submission.status == 'GRADING'
    subjective_score = (
        round(float(submission.subjective_score), 2)
        if not is_pending and submission.subjective_score is not None
        else None
    )
    return objective_score, subjective_score, is_pending


def _node_progress_row(
    *,
    node_id: int,
    node_name: str,
    category: str,
    completed: int,
    pending: int,
    overdue: int,
    total: int,
    durations: list[float],
    **extra: Any,
) -> dict[str, Any]:
    return {
        'node_id': node_id,
        'node_name': node_name,
        'category': category,
        'completed_count': completed,
        'pending_count': pending,
        'overdue_count': overdue,
        'total_count': total,
        'percentage': _pct(completed, total),
        'average_time': _avg(durations),
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
        **extra,
    }


def _build_node_progress_from_loaded(
    task_knowledge_items: list[TaskKnowledge],
    task_quiz_items: list[TaskQuiz],
    knowledge_progress_map: dict[int, list[KnowledgeLearningProgress]],
    quiz_submissions_map: dict[int, dict[int, list[Submission]]],
    total_count: int,
    *,
    is_task_overdue: bool = False,
) -> tuple[list[dict[str, Any]], set[int]]:
    nodes: list[dict[str, Any]] = []

    for tk in task_knowledge_items:
        rows = knowledge_progress_map.get(tk.id, [])
        completed = len(rows)
        remaining = max(0, total_count - completed)
        durations = [m for p in rows if (m := _duration_minutes(p.started_at, p.completed_at)) is not None]
        nodes.append(_node_progress_row(
            node_id=tk.id,
            node_name=tk.knowledge.title,
            category='KNOWLEDGE',
            completed=completed,
            pending=0 if is_task_overdue else remaining,
            overdue=remaining if is_task_overdue else 0,
            total=total_count,
            durations=durations,
        ))

    ordered_quizzes = sorted(task_quiz_items, key=lambda tq: (0 if tq.allow_retry else 1, tq.order, tq.id))
    abnormal_assignment_ids: set[int] = set()

    for tq in ordered_quizzes:
        representatives: list[Submission] = []
        completed = pending_grading = abnormal_count = 0
        durations: list[float] = []
        scores: list[float] = []
        score_percentages: list[float] = []

        for subs in quiz_submissions_map.get(tq.id, {}).values():
            rep = _select_quiz_submission(subs, allow_retry=tq.allow_retry)
            if rep is None:
                continue
            representatives.append(rep)
            if (minutes := _duration_minutes(rep.started_at, rep.submitted_at)) is not None:
                durations.append(minutes)

            best_graded = _best_graded(subs) if tq.allow_retry else None
            if rep.status == 'GRADING' and best_graded is None:
                pending_grading += 1
            elif rep.status in ACCURACY_SUBMISSION_STATUSES or best_graded is not None:
                completed += 1
                score_src = rep if rep.status in ACCURACY_SUBMISSION_STATUSES else best_graded
                if score_src and score_src.obtained_score is not None:
                    scores.append(float(score_src.obtained_score))
                    if score_src.total_score > 0:
                        score_percentages.append(round(float(score_src.obtained_score) / float(score_src.total_score) * 100, 1))

            if not tq.allow_retry and is_exam_submission_abnormal(rep):
                abnormal_count += 1
                abnormal_assignment_ids.add(rep.task_assignment_id)

        remaining = max(0, total_count - completed)
        overdue_count = max(0, remaining - pending_grading) if is_task_overdue else 0
        pending_count = pending_grading if is_task_overdue else remaining

        pass_rate = passed_count = failed_count = None
        if not tq.allow_retry and tq.pass_score is not None:
            graded_reps = [r for r in representatives if r.status in ACCURACY_SUBMISSION_STATUSES and r.obtained_score is not None]
            passed_count = sum(1 for r in graded_reps if r.obtained_score >= tq.pass_score)
            failed_count = len(graded_reps) - passed_count
            if graded_reps:
                pass_rate = _pct(passed_count, len(graded_reps))

        nodes.append(_node_progress_row(
            node_id=tq.id,
            node_name=tq.title,
            category='PRACTICE' if tq.allow_retry else 'EXAM',
            completed=completed,
            pending=pending_count,
            overdue=overdue_count,
            total=total_count,
            durations=durations,
            average_score=_avg(scores),
            duration=tq.duration,
            total_score=float(tq.total_score or 0),
            pass_score=float(tq.pass_score) if (not tq.allow_retry and tq.pass_score is not None) else None,
            pass_rate=pass_rate,
            passed_count=passed_count,
            failed_count=failed_count,
            abnormal_count=abnormal_count,
            score_distribution=_build_distribution(score_percentages, SCORE_DISTRIBUTION_RANGES),
        ))

    return nodes, abnormal_assignment_ids


def _is_assignment_pending_grading(
    *,
    completed_knowledge_count: int,
    total_knowledge_count: int,
    submissions: list[Submission],
    total_quiz_count: int,
) -> bool:
    if completed_knowledge_count < total_knowledge_count:
        return False
    latest_by_quiz: dict[int, Submission] = {}
    completed_q: set[int] = set()
    for sub in submissions:
        if sub.status in ACCURACY_SUBMISSION_STATUSES:
            completed_q.add(sub.task_quiz_id)
        prev = latest_by_quiz.get(sub.task_quiz_id)
        if prev is None or _recency_key(sub) > _recency_key(prev):
            latest_by_quiz[sub.task_quiz_id] = sub
    grading_q = {qid for qid, sub in latest_by_quiz.items() if sub.status == 'GRADING'}
    return bool(grading_q) and len(completed_q | grading_q) >= total_quiz_count


def task_analytics_payload(task_id: int, *, deadline=None) -> dict[str, Any]:
    is_task_overdue = bool(deadline and deadline < timezone.now())
    assignments = list(
        TaskAssignment.objects.filter(task_id=task_id).prefetch_related(
            'knowledge_progress',
            Prefetch(
                'submissions',
                queryset=Submission.objects.filter(status__in=ANALYTICS_SUBMISSION_STATUSES).select_related('task_quiz'),
            ),
        )
    )
    task_knowledge_items = list(task_knowledge_queryset(task_id))
    task_quiz_items = list(task_quiz_queryset(task_id))
    total_knowledge_count = len(task_knowledge_items)
    total_quiz_count = len(task_quiz_items)

    knowledge_progress_map: dict[int, list[KnowledgeLearningProgress]] = {}
    quiz_submissions_map: dict[int, dict[int, list[Submission]]] = {}
    assignment_assignee_map: dict[int, int] = {}
    completed_durations: list[float] = []
    completed_count = overdue_count = 0

    for assignment in assignments:
        assignment_assignee_map[assignment.id] = assignment.assignee_id
        completed_k = [p for p in assignment.knowledge_progress.all() if p.is_completed]
        subs = list(assignment.submissions.all())
        for p in completed_k:
            knowledge_progress_map.setdefault(p.task_knowledge_id, []).append(p)
        for s in subs:
            quiz_submissions_map.setdefault(s.task_quiz_id, {}).setdefault(assignment.id, []).append(s)

        if assignment.status == 'COMPLETED':
            completed_count += 1
            if assignment.completed_at is not None:
                completed_durations.append(assignment_activity_minutes(assignment))
        elif (assignment.status == 'OVERDUE' or is_task_overdue) and not _is_assignment_pending_grading(
            completed_knowledge_count=len(completed_k),
            total_knowledge_count=total_knowledge_count,
            submissions=subs,
            total_quiz_count=total_quiz_count,
        ):
            overdue_count += 1

    total_count = len(assignments)
    node_progress, abnormal_assignment_ids = _build_node_progress_from_loaded(
        task_knowledge_items,
        task_quiz_items,
        knowledge_progress_map,
        quiz_submissions_map,
        total_count,
        is_task_overdue=is_task_overdue,
    )
    abnormal_assignee_ids = {
        assignment_assignee_map[aid] for aid in abnormal_assignment_ids if aid in assignment_assignee_map
    }

    return {
        'completion': {
            'completed_count': completed_count,
            'in_progress_count': max(0, total_count - completed_count - overdue_count),
            'overdue_count': overdue_count,
            'total_count': total_count,
            'percentage': _pct(completed_count, total_count),
        },
        'average_time': round(sum(completed_durations) / len(completed_durations), 1) if completed_durations else 0.0,
        'abnormal_count': len(abnormal_assignee_ids),
        'node_progress': node_progress,
    }


def _resolve_target_node(task_id: int, node_type: Optional[str], node_id: Optional[int]) -> Optional[tuple[str, int]]:
    if node_type is None and node_id is None:
        if (first_k := task_knowledge_queryset(task_id).first()) is not None:
            return ('KNOWLEDGE', first_k.id)
        if (first_q := task_quiz_queryset(task_id).order_by('-allow_retry', 'order', 'id').first()) is not None:
            return ('PRACTICE' if first_q.allow_retry else 'EXAM', first_q.id)
        return None

    spec = _NODE_SPEC.get(node_type or '')
    if spec is None:
        raise BusinessError(ErrorCodes.INVALID_INPUT, '无效的节点类型')
    model, extra_filters, err_msg = spec
    if not model.objects.filter(id=node_id, task_id=task_id, **extra_filters).exists():
        raise BusinessError(ErrorCodes.RESOURCE_NOT_FOUND, err_msg)
    return (node_type, node_id)  # type: ignore[return-value]


def _execution_row(assignment: TaskAssignment, **overrides: Any) -> dict[str, Any]:
    assignee = assignment.assignee
    return {
        'student_id': assignee.id,
        'student_name': assignee.username,
        'avatar_key': assignee.avatar_key,
        'employee_id': assignee.employee_id or '',
        'department': assignee.department.name if assignee.department else '',
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
    is_task_overdue = bool(deadline and deadline < timezone.now())
    assignments = list(
        TaskAssignment.objects.filter(task_id=task_id).select_related('assignee', 'assignee__department').order_by('-created_at')
    )

    if target_type == 'KNOWLEDGE':
        progress_map = {
            p.assignment_id: p
            for p in KnowledgeLearningProgress.objects.filter(assignment__task_id=task_id, task_knowledge_id=target_id)
        }
        results = []
        for assignment in assignments:
            progress = progress_map.get(assignment.id)
            if progress is None or (not progress.is_completed and not progress.started_at and not progress.completed_at):
                results.append(_execution_row(assignment, status='OVERDUE' if is_task_overdue else 'NOT_STARTED'))
            elif progress.is_completed:
                results.append(_execution_row(
                    assignment,
                    status='COMPLETED',
                    started_at=progress.started_at,
                    completed_at=progress.completed_at,
                    time_spent=_duration_minutes(progress.started_at, progress.completed_at),
                ))
            else:
                results.append(_execution_row(
                    assignment,
                    status='OVERDUE' if is_task_overdue else 'IN_PROGRESS',
                    started_at=progress.started_at,
                ))
        return results

    allow_retry = target_type == 'PRACTICE'
    subs_by_assignment: dict[int, list[Submission]] = {}
    for sub in Submission.objects.filter(task_assignment__task_id=task_id, task_quiz_id=target_id).select_related('task_quiz'):
        subs_by_assignment.setdefault(sub.task_assignment_id, []).append(sub)

    results = []
    for assignment in assignments:
        subs = subs_by_assignment.get(assignment.id, [])
        submitted_subs = [s for s in subs if s.status in ANALYTICS_SUBMISSION_STATUSES]
        rep = _select_quiz_submission(subs, allow_retry=allow_retry)
        if rep is None:
            results.append(_execution_row(
                assignment,
                status='OVERDUE' if is_task_overdue else 'NOT_STARTED',
                attempt_count=0 if allow_retry else None,
            ))
        elif not submitted_subs:
            results.append(_execution_row(
                assignment,
                status='OVERDUE' if is_task_overdue else 'IN_PROGRESS',
                started_at=rep.started_at,
                attempt_count=0 if allow_retry else None,
            ))
        else:
            obj_score, subj_score, is_pending = _split_submission_scores(rep)
            has_final_score = not is_pending and rep.obtained_score is not None
            pass_score = rep.task_quiz.pass_score
            results.append(_execution_row(
                assignment,
                status='PENDING_GRADING' if is_pending else 'COMPLETED',
                started_at=rep.started_at,
                completed_at=rep.submitted_at,
                time_spent=_duration_minutes(rep.started_at, rep.submitted_at),
                objective_score=obj_score,
                subjective_score=subj_score,
                score=float(rep.obtained_score) if has_final_score else None,
                is_passed=(bool(rep.obtained_score >= pass_score) if (has_final_score and not allow_retry and pass_score is not None) else None),
                is_subjective_pending=is_pending,
                attempt_count=len(submitted_subs) if allow_retry else None,
                is_abnormal=(not allow_retry) and is_exam_submission_abnormal(rep),
            ))
    return results
