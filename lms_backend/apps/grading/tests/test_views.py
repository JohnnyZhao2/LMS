import pytest
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.grading.selectors import calculate_question_pass_rate
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
def test_objective_analysis_includes_in_progress_answers():
    mentor = UserFactory()
    task = TaskFactory(created_by=mentor)
    task_quiz = TaskQuizFactory(task=task)

    question = create_choice_question(
        created_by=mentor,
        content='进行中多选题',
        correct_keys=['A', 'B'],
    )
    quiz_question = QuizRevisionQuestionFactory(
        quiz=task_quiz.quiz,
        question=question,
        question_type='MULTIPLE_CHOICE',
        content='进行中多选题',
        score=2,
    )

    assignment = TaskAssignmentFactory(task=task)
    submission = SubmissionFactory(
        task_assignment=assignment,
        task_quiz=task_quiz,
        quiz=task_quiz.quiz,
        status='IN_PROGRESS',
    )

    answer = Answer.objects.create(
        submission=submission,
        question=quiz_question,
    )
    key_map = quiz_question.get_option_key_map()
    AnswerSelection.objects.create(answer=answer, question_option_id=key_map['A']['id'])
    AnswerSelection.objects.create(answer=answer, question_option_id=key_map['B']['id'])

    payload = GradingAnswersView()._get_grading_answers(task, quiz_question.id, task_quiz.id)
    option_map = {option['option_key']: option for option in payload['options']}
    pass_rate = calculate_question_pass_rate(task, quiz_question.id, task_quiz.id, quiz_question.score, True)

    assert payload['answered_count'] == 1
    assert option_map['A']['selected_count'] == 1
    assert option_map['B']['selected_count'] == 1
    assert pass_rate == 100.0


@pytest.mark.django_db
def test_pending_quizzes_view_returns_quizzes_with_analysis_data(monkeypatch):
    reviewer = UserFactory(username='reviewer')
    owner = UserFactory(username='owner')

    visible_pending_task = TaskFactory(created_by=owner, updated_by=owner, created_role='ADMIN')
    visible_objective_task = TaskFactory(created_by=owner, updated_by=owner, created_role='ADMIN')
    visible_empty_task = TaskFactory(created_by=owner, updated_by=owner, created_role='ADMIN')

    pending_task_quiz = TaskQuizFactory(task=visible_pending_task)
    objective_task_quiz = TaskQuizFactory(task=visible_objective_task)
    TaskQuizFactory(task=visible_empty_task)

    pending_question = QuestionFactory(
        created_by=owner,
        question_type='SHORT_ANSWER',
        reference_answer='参考答案',
        with_default_options=False,
    )
    objective_question = create_choice_question(
        created_by=owner,
        content='客观题',
        correct_keys=['A', 'B'],
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
    objective_revision_question = QuizRevisionQuestionFactory(
        quiz=objective_task_quiz.quiz,
        question=objective_question,
        question_type='MULTIPLE_CHOICE',
        content='客观题',
        score=2,
    )

    pending_assignment = TaskAssignmentFactory(task=visible_pending_task)
    objective_assignment = TaskAssignmentFactory(task=visible_objective_task)

    pending_submission = SubmissionFactory(
        task_assignment=pending_assignment,
        task_quiz=pending_task_quiz,
        quiz=pending_task_quiz.quiz,
        user=pending_assignment.assignee,
        status='GRADING',
        submitted_at=timezone.now(),
    )
    objective_submission = SubmissionFactory(
        task_assignment=objective_assignment,
        task_quiz=objective_task_quiz,
        quiz=objective_task_quiz.quiz,
        user=objective_assignment.assignee,
        status='IN_PROGRESS',
    )

    Answer.objects.create(
        submission=pending_submission,
        question=pending_revision_question,
        text_answer='待评分答案',
    )
    create_objective_answer(
        submission=objective_submission,
        question=objective_revision_question,
        selected_keys=['A', 'B'],
        is_correct=True,
    )

    monkeypatch.setattr('apps.grading.views.enforce', lambda *args, **kwargs: True)
    monkeypatch.setattr(
        'apps.grading.views.scope_filter',
        lambda permission_code, request, **kwargs: kwargs['base_queryset'].filter(
            id__in=[visible_pending_task.id, visible_objective_task.id, visible_empty_task.id]
        ),
    )

    request = APIRequestFactory().get('/api/grading/pending/')
    force_authenticate(request, user=reviewer)

    response = PendingQuizzesView.as_view()(request)

    assert response.status_code == 200
    assert len(response.data['data']) == 2

    task_payloads = {item['task_id']: item for item in response.data['data']}
    assert visible_empty_task.id not in task_payloads

    pending_task_payload = task_payloads[visible_pending_task.id]
    assert pending_task_payload['task_title'] == visible_pending_task.title
    assert len(pending_task_payload['quizzes']) == 1

    pending_quiz_payload = pending_task_payload['quizzes'][0]
    assert pending_quiz_payload['quiz_id'] == pending_task_quiz.id
    assert pending_quiz_payload['quiz_title'] == pending_task_quiz.quiz.title
    assert pending_quiz_payload['quiz_type'] == pending_task_quiz.quiz.quiz_type
    assert pending_quiz_payload['quiz_type_display'] == pending_task_quiz.quiz.get_quiz_type_display()
    assert pending_quiz_payload['question_count'] == pending_task_quiz.quiz.question_count
    assert pending_quiz_payload['duration'] == pending_task_quiz.quiz.duration
    assert pending_quiz_payload['pending_count'] == 1

    objective_task_payload = task_payloads[visible_objective_task.id]
    assert objective_task_payload['task_title'] == visible_objective_task.title
    assert len(objective_task_payload['quizzes']) == 1

    objective_quiz_payload = objective_task_payload['quizzes'][0]
    assert objective_quiz_payload['quiz_id'] == objective_task_quiz.id
    assert objective_quiz_payload['quiz_title'] == objective_task_quiz.quiz.title
    assert objective_quiz_payload['pending_count'] == 0
