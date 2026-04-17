import pytest
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.grading.views import GradingAnswersView, PendingQuizzesView
from apps.questions.models import Question, QuestionOption
from apps.submissions.models import Answer, AnswerSelection
from apps.tasks.tests.factories import (
    QuestionFactory,
    QuizRevisionQuestionFactory,
    SubmissionFactory,
    TaskAssignmentFactory,
    TaskFactory,
    TaskQuizFactory,
    UserFactory,
)


def create_choice_question(*, created_by, content: str, correct_keys: list[str]) -> Question:
    question = Question.objects.create(
        content=content,
        question_type='MULTIPLE_CHOICE',
        score=2,
        created_by=created_by,
    )
    for index, label in enumerate(['选项 A', '选项 B', '选项 C'], start=1):
        QuestionOption.objects.create(
            question=question,
            sort_order=index,
            content=label,
            is_correct=chr(64 + index) in correct_keys,
        )
    return question


def create_objective_answer(*, submission, question, selected_keys: list[str], is_correct: bool):
    answer = Answer.objects.create(
        submission=submission,
        question=question,
        is_correct=is_correct,
    )
    key_map = question.get_option_key_map()
    for key in selected_keys:
        AnswerSelection.objects.create(
            answer=answer,
            question_option_id=key_map[key]['id'],
        )
    return answer


@pytest.mark.django_db
def test_objective_distribution_counts_answered_students_once():
    mentor = UserFactory()
    task = TaskFactory(created_by=mentor)
    task_quiz = TaskQuizFactory(task=task)

    question = create_choice_question(
        created_by=mentor,
        content='多选题',
        correct_keys=['A', 'B'],
    )
    quiz_question = QuizRevisionQuestionFactory(
        quiz=task_quiz.quiz,
        question=question,
        question_type='MULTIPLE_CHOICE',
        content='多选题',
        score=2,
    )

    assignment_a = TaskAssignmentFactory(task=task)
    assignment_b = TaskAssignmentFactory(task=task)
    assignment_c = TaskAssignmentFactory(task=task)

    submission_a = SubmissionFactory(task_assignment=assignment_a, task_quiz=task_quiz, quiz=task_quiz.quiz, status='SUBMITTED')
    submission_b = SubmissionFactory(task_assignment=assignment_b, task_quiz=task_quiz, quiz=task_quiz.quiz, status='SUBMITTED')
    submission_c = SubmissionFactory(task_assignment=assignment_c, task_quiz=task_quiz, quiz=task_quiz.quiz, status='SUBMITTED')

    create_objective_answer(submission=submission_a, question=quiz_question, selected_keys=['A', 'B'], is_correct=True)
    create_objective_answer(submission=submission_b, question=quiz_question, selected_keys=['B'], is_correct=False)
    create_objective_answer(submission=submission_c, question=quiz_question, selected_keys=[], is_correct=False)

    payload = GradingAnswersView()._get_grading_answers(task, quiz_question.id, task_quiz.id)
    option_map = {option['option_key']: option for option in payload['options']}

    assert payload['answered_count'] == 2
    assert option_map['A']['selected_count'] == 1
    assert option_map['B']['selected_count'] == 2
    assert option_map['C']['selected_count'] == 0


@pytest.mark.django_db
def test_pending_quizzes_view_uses_task_visibility_and_skips_zero_pending(monkeypatch):
    reviewer = UserFactory(username='reviewer')
    owner = UserFactory(username='owner')

    visible_pending_task = TaskFactory(created_by=owner, updated_by=owner, created_role='ADMIN')
    visible_graded_task = TaskFactory(created_by=owner, updated_by=owner, created_role='ADMIN')

    pending_task_quiz = TaskQuizFactory(task=visible_pending_task)
    graded_task_quiz = TaskQuizFactory(task=visible_graded_task)

    pending_question = QuestionFactory(
        created_by=owner,
        question_type='SHORT_ANSWER',
        reference_answer='参考答案',
        with_default_options=False,
    )
    graded_question = QuestionFactory(
        created_by=owner,
        question_type='SHORT_ANSWER',
        reference_answer='参考答案',
        with_default_options=False,
    )

    pending_revision_question = QuizRevisionQuestionFactory(
        quiz=pending_task_quiz.quiz,
        question=pending_question,
        question_type='SHORT_ANSWER',
        content='待批简答题',
        reference_answer='参考答案',
        score=5,
        with_default_options=False,
    )
    graded_revision_question = QuizRevisionQuestionFactory(
        quiz=graded_task_quiz.quiz,
        question=graded_question,
        question_type='SHORT_ANSWER',
        content='已批简答题',
        reference_answer='参考答案',
        score=5,
        with_default_options=False,
    )

    pending_assignment = TaskAssignmentFactory(task=visible_pending_task)
    graded_assignment = TaskAssignmentFactory(task=visible_graded_task)

    pending_submission = SubmissionFactory(
        task_assignment=pending_assignment,
        task_quiz=pending_task_quiz,
        quiz=pending_task_quiz.quiz,
        user=pending_assignment.assignee,
        status='GRADING',
        submitted_at=timezone.now(),
    )
    graded_submission = SubmissionFactory(
        task_assignment=graded_assignment,
        task_quiz=graded_task_quiz,
        quiz=graded_task_quiz.quiz,
        user=graded_assignment.assignee,
        status='GRADED',
        submitted_at=timezone.now(),
    )

    Answer.objects.create(
        submission=pending_submission,
        question=pending_revision_question,
        text_answer='待评分答案',
    )
    Answer.objects.create(
        submission=graded_submission,
        question=graded_revision_question,
        text_answer='已评分答案',
        graded_by=reviewer,
        graded_at=timezone.now(),
        obtained_score=5,
    )

    monkeypatch.setattr('apps.grading.views.enforce', lambda *args, **kwargs: True)
    monkeypatch.setattr(
        'apps.grading.views.scope_filter',
        lambda permission_code, request, **kwargs: kwargs['base_queryset'].filter(
            id__in=[visible_pending_task.id, visible_graded_task.id]
        ),
    )

    request = APIRequestFactory().get('/api/grading/pending/')
    force_authenticate(request, user=reviewer)

    response = PendingQuizzesView.as_view()(request)

    assert response.status_code == 200
    assert len(response.data['data']) == 1

    task_payload = response.data['data'][0]
    assert task_payload['task_id'] == visible_pending_task.id
    assert task_payload['task_title'] == visible_pending_task.title
    assert len(task_payload['quizzes']) == 1

    quiz_payload = task_payload['quizzes'][0]
    assert quiz_payload['quiz_id'] == pending_task_quiz.id
    assert quiz_payload['quiz_title'] == pending_task_quiz.quiz.title
    assert quiz_payload['quiz_type'] == pending_task_quiz.quiz.quiz_type
    assert quiz_payload['quiz_type_display'] == pending_task_quiz.quiz.get_quiz_type_display()
    assert quiz_payload['question_count'] == pending_task_quiz.quiz.question_count
    assert quiz_payload['duration'] == pending_task_quiz.quiz.duration
    assert quiz_payload['pending_count'] == 1
