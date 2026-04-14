from django.db.models import F, OuterRef, Subquery

from apps.submissions.models import Answer, Submission


def has_answer_content(user_answer):
    """判断答案是否可视为已作答。"""
    if user_answer is None:
        return False

    if isinstance(user_answer, str):
        return user_answer.strip() != ''

    if isinstance(user_answer, (list, tuple, set, dict)):
        return len(user_answer) > 0

    return True


def _get_latest_submission_subquery():
    return Submission.objects.filter(
        task_assignment_id=OuterRef('submission__task_assignment_id'),
        quiz_id=OuterRef('submission__quiz_id'),
        status__in=['GRADING', 'SUBMITTED', 'GRADED']
    ).order_by('-attempt_number', '-submitted_at', '-id').values('id')[:1]


def get_latest_quiz_answers(task, quiz_id):
    """获取每位学员在指定试卷的最新提交答案"""
    base_answers = Answer.objects.filter(
        submission__task_assignment__task=task,
        submission__quiz_id=quiz_id,
        submission__status__in=['GRADING', 'SUBMITTED', 'GRADED']
    )

    return base_answers.annotate(
        latest_submission_id=Subquery(_get_latest_submission_subquery())
    ).filter(submission_id=F('latest_submission_id'))


def calculate_question_pass_rate(task, question_id, quiz_id, max_score, is_objective):
    """
    计算题目通过率
    规则：
    1. 客观题：通过数(is_correct=True) / 总提交数
    2. 主观题：通过数(graded & >=60%) / 总已评分数 (graded)
       注意：主观题分母不包含等待评分的记录，避免拉低通过率
    """
    answers = get_latest_quiz_answers(task, quiz_id).filter(question_id=question_id)

    if is_objective:
        total_count = answers.count()
        if total_count == 0:
            return None
        correct_count = answers.filter(is_correct=True).count()
        return round(correct_count / total_count * 100, 1)

    graded_answers = answers.filter(graded_by__isnull=False)
    total_count = graded_answers.count()
    if total_count == 0:
        return None

    score_threshold = float(max_score) * 0.6
    correct_count = graded_answers.filter(
        obtained_score__gte=score_threshold
    ).count()

    return round(correct_count / total_count * 100, 1)
