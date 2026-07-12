from django.db.models import F, OuterRef, Prefetch, Subquery

from apps.submissions.models import Answer, AnswerSelection, Submission

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


def _get_latest_submission_subquery(submission_statuses):
    return Submission.objects.filter(
        task_assignment_id=OuterRef('submission__task_assignment_id'),
        task_quiz_id=OuterRef('submission__task_quiz_id'),
        status__in=submission_statuses,
    ).order_by('-attempt_number', '-submitted_at', '-id').values('id')[:1]


def get_latest_quiz_answers(task, quiz_id, *, submission_statuses=REVIEWABLE_SUBMISSION_STATUSES):
    resolved_statuses = tuple(submission_statuses)
    base_answers = Answer.objects.filter(
        submission__task_assignment__task=task,
        submission__task_quiz_id=quiz_id,
        submission__status__in=resolved_statuses,
    ).select_related('question').prefetch_related(
        'question__question_options',
        Prefetch(
            'answer_selections',
            queryset=AnswerSelection.objects.select_related('question_option'),
        ),
    )
    return base_answers.annotate(
        latest_submission_id=Subquery(_get_latest_submission_subquery(resolved_statuses))
    ).filter(submission_id=F('latest_submission_id'))


def _is_objective_answer_correct(answer):
    if answer.is_correct is not None:
        return bool(answer.is_correct)

    user_answer = answer.user_answer
    if not has_answer_content(user_answer):
        return False

    is_correct, _ = answer.question.check_answer(user_answer, full_score=answer.max_score)
    return bool(is_correct)


def calculate_question_pass_rate(task, question_id, quiz_id, max_score, is_objective):
    submission_statuses = (
        OBJECTIVE_ANALYTICS_SUBMISSION_STATUSES
        if is_objective
        else REVIEWABLE_SUBMISSION_STATUSES
    )
    answers = list(
        get_latest_quiz_answers(
            task,
            quiz_id,
            submission_statuses=submission_statuses,
        ).filter(question_id=question_id)
    )
    if is_objective:
        answered_answers = [answer for answer in answers if has_answer_content(answer.user_answer)]
        total_count = len(answered_answers)
        if total_count == 0:
            return None
        correct_count = sum(1 for answer in answered_answers if _is_objective_answer_correct(answer))
        return round(correct_count / total_count * 100, 1)

    graded_answers = [answer for answer in answers if answer.graded_by_id is not None]
    total_count = len(graded_answers)
    if total_count == 0:
        return None

    score_threshold = float(max_score) * 0.6
    correct_count = sum(1 for answer in graded_answers if float(answer.obtained_score) >= score_threshold)
    return round(correct_count / total_count * 100, 1)
