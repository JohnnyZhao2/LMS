from decimal import Decimal
from typing import Any, Iterable, Optional

from django.db.models import Count, Prefetch, Q

from apps.submissions.models import Answer, AnswerSelection, Submission
from apps.submissions.scoring import submission_recency_key

REVIEWABLE_SUBMISSION_STATUSES = ('GRADING', 'SUBMITTED', 'GRADED')
OBJECTIVE_ANALYTICS_SUBMISSION_STATUSES = ('IN_PROGRESS', 'GRADING', 'SUBMITTED', 'GRADED')


def has_answer_content(user_answer):
    if user_answer is None:
        return False
    if isinstance(user_answer, str):
        return user_answer.strip() != ''
    if isinstance(user_answer, (list, tuple, set, dict)):
        return len(user_answer) > 0
    return True


def _select_latest_submission_id_groups(
    quiz_ids: Iterable[int],
    *status_groups: Iterable[str],
) -> tuple[list[int], ...]:
    """一次扫描 Submission，按多个状态分组分别挑出每个 (task_quiz_id, task_assignment_id) 的最新提交 ID。"""
    quiz_id_list = list(quiz_ids)
    group_sets = [set(group) for group in status_groups]
    if not quiz_id_list or not group_sets:
        return tuple([] for _ in group_sets)

    all_statuses = set().union(*group_sets)
    best_by_group: list[dict[tuple[int, int], tuple[tuple, int]]] = [{} for _ in group_sets]
    rows = Submission.objects.filter(
        task_quiz_id__in=quiz_id_list,
        status__in=all_statuses,
    ).values_list(
        'id', 'task_quiz_id', 'task_assignment_id', 'status', 'attempt_number', 'submitted_at'
    )

    for sub_id, quiz_id, assignment_id, status, attempt_number, submitted_at in rows:
        key = (quiz_id, assignment_id)
        rank = submission_recency_key(status, attempt_number, submitted_at, sub_id)
        for allowed_statuses, best in zip(group_sets, best_by_group):
            if status in allowed_statuses:
                prev = best.get(key)
                if prev is None or rank > prev[0]:
                    best[key] = (rank, sub_id)

    return tuple([sub_id for _, sub_id in best.values()] for best in best_by_group)


def _get_latest_submission_id_groups(quiz_ids: Iterable[int]) -> tuple[list[int], list[int]]:
    """一次扫描 Submission，同时按 (task_quiz_id, task_assignment_id) 挑出客观分析与可阅卷最新提交 ID。"""
    objective_ids, reviewable_ids = _select_latest_submission_id_groups(
        quiz_ids,
        OBJECTIVE_ANALYTICS_SUBMISSION_STATUSES,
        REVIEWABLE_SUBMISSION_STATUSES,
    )
    return objective_ids, reviewable_ids


def get_latest_submission_ids(
    quiz_ids: Iterable[int],
    *,
    submission_statuses=REVIEWABLE_SUBMISSION_STATUSES,
) -> list[int]:
    """按 (task_quiz_id, task_assignment_id) 一次性挑出最新提交 ID，避免 OuterRef 相关子查询。"""
    (latest_ids,) = _select_latest_submission_id_groups(quiz_ids, submission_statuses)
    return latest_ids


def get_latest_quiz_answers(
    quiz_id: int,
    *,
    submission_statuses=REVIEWABLE_SUBMISSION_STATUSES,
):
    latest_ids = get_latest_submission_ids(
        [quiz_id],
        submission_statuses=submission_statuses,
    )
    if not latest_ids:
        return Answer.objects.none()
    return Answer.objects.filter(
        submission_id__in=latest_ids,
    ).select_related('question').prefetch_related(
        'question__question_options',
        Prefetch(
            'answer_selections',
            queryset=AnswerSelection.objects.select_related('question_option'),
        ),
    )


def _is_objective_answer_correct(answer: Answer, user_answer: Any) -> bool:
    if answer.is_correct is not None:
        return bool(answer.is_correct)

    if not has_answer_content(user_answer):
        return False

    is_correct, _ = answer.question.check_answer(user_answer, full_score=answer.max_score)
    return bool(is_correct)


def calculate_pass_rate_from_answers(
    answer_pairs: list[tuple[Answer, Any]],
    max_score,
    is_objective: bool,
) -> Optional[float]:
    if is_objective:
        answered_pairs = [
            (answer, user_answer)
            for answer, user_answer in answer_pairs
            if has_answer_content(user_answer)
        ]
        total_count = len(answered_pairs)
        if total_count == 0:
            return None
        correct_count = sum(
            1 for answer, user_answer in answered_pairs
            if _is_objective_answer_correct(answer, user_answer)
        )
        return round(correct_count / total_count * 100, 1)

    graded_answers = [answer for answer, _ in answer_pairs if answer.graded_by_id is not None]
    total_count = len(graded_answers)
    if total_count == 0:
        return None

    score_threshold = Decimal(str(max_score)) * Decimal('0.6')
    correct_count = sum(1 for answer in graded_answers if answer.obtained_score >= score_threshold)
    return round(correct_count / total_count * 100, 1)


def calculate_quiz_question_pass_rates(
    quiz_id: int,
    questions,
) -> dict[int, Optional[float]]:
    """一次性批量计算整张试卷所有题目的通过率，消除按题循环 N+1。"""
    pass_rates: dict[int, Optional[float]] = {q.id: None for q in questions}
    if not questions:
        return pass_rates

    obj_questions = [q for q in questions if q.is_objective]
    subj_questions = {q.id: q for q in questions if not q.is_objective}

    latest_objective_ids, latest_reviewable_ids = _get_latest_submission_id_groups([quiz_id])

    # 1. 批量计算主观题通过率（仅查已评分轻量元组，不加载 Answer ORM 对象）
    if subj_questions and latest_reviewable_ids:
        subj_stats: dict[int, list[int]] = {}
        rows = Answer.objects.filter(
            submission_id__in=latest_reviewable_ids,
            question_id__in=subj_questions.keys(),
            graded_by__isnull=False,
        ).values_list('question_id', 'obtained_score')
        for q_id, obtained_score in rows:
            stat = subj_stats.setdefault(q_id, [0, 0])
            stat[0] += 1
            if obtained_score >= subj_questions[q_id].score * Decimal('0.6'):
                stat[1] += 1
        for q_id, (total, correct) in subj_stats.items():
            if total > 0:
                pass_rates[q_id] = round(correct / total * 100, 1)

    # 2. 批量计算客观题通过率（1 次查齐该卷全部客观题最新答案）
    if obj_questions and latest_objective_ids:
        obj_q_ids = [q.id for q in obj_questions]
        selected_options_by_answer: dict[int, set[int]] = {}
        answer_meta: dict[int, tuple[int, Optional[bool]]] = {}
        for ans_id, q_id, is_correct, opt_id in AnswerSelection.objects.filter(
            answer__submission_id__in=latest_objective_ids,
            answer__question_id__in=obj_q_ids,
        ).values_list('answer_id', 'answer__question_id', 'answer__is_correct', 'question_option_id'):
            selected_options_by_answer.setdefault(ans_id, set()).add(opt_id)
            answer_meta[ans_id] = (q_id, is_correct)

        if selected_options_by_answer:
            correct_options_by_q: dict[int, set[int]] = {}
            for q in obj_questions:
                correct_options_by_q[q.id] = {
                    opt.id for opt in q.question_options.all() if opt.is_correct
                }

            obj_stats: dict[int, list[int]] = {}
            for ans_id, (q_id, is_correct) in answer_meta.items():
                stat = obj_stats.setdefault(q_id, [0, 0])
                stat[0] += 1
                if is_correct is not None:
                    passed = bool(is_correct)
                else:
                    passed = selected_options_by_answer[ans_id] == correct_options_by_q.get(q_id, set())
                if passed:
                    stat[1] += 1

            for q_id, (total, correct) in obj_stats.items():
                if total > 0:
                    pass_rates[q_id] = round(correct / total * 100, 1)

    return pass_rates


def get_pending_quiz_metrics(
    quiz_ids: Iterable[int],
) -> dict[int, tuple[int, bool]]:
    """批量计算多张试卷的 (pending_count, has_analysis_data)，固定 3 条轻量 SQL。"""
    quiz_id_list = list(quiz_ids)
    if not quiz_id_list:
        return {}

    latest_objective_ids, latest_reviewable_ids = _get_latest_submission_id_groups(quiz_id_list)

    pending_by_quiz: dict[int, int] = {}
    has_analysis_quizzes: set[int] = set()

    if latest_reviewable_ids:
        subj_rows = (
            Answer.objects.filter(
                submission_id__in=latest_reviewable_ids,
                question__question_type='SHORT_ANSWER',
            )
            .values('submission__task_quiz_id')
            .annotate(
                total_subj=Count('id'),
                pending_cnt=Count(
                    'id',
                    filter=Q(
                        submission__status__in=['SUBMITTED', 'GRADING'],
                        graded_by__isnull=True,
                    ),
                ),
            )
        )
        for row in subj_rows:
            qid = row['submission__task_quiz_id']
            pending_by_quiz[qid] = row['pending_cnt']
            if row['total_subj'] > 0:
                has_analysis_quizzes.add(qid)

    if latest_objective_ids:
        obj_quiz_ids = (
            AnswerSelection.objects.filter(
                answer__submission_id__in=latest_objective_ids,
            )
            .values_list('answer__submission__task_quiz_id', flat=True)
            .distinct()
        )
        has_analysis_quizzes.update(obj_quiz_ids)

    return {
        qid: (pending_by_quiz.get(qid, 0), qid in has_analysis_quizzes)
        for qid in quiz_id_list
    }
