from __future__ import annotations

from datetime import timedelta
from types import SimpleNamespace

import pytest
from django.utils import timezone

from apps.grading.views import GradingAnswersView, PendingQuizzesView
from apps.questions.services import QuestionService
from apps.quizzes.services import QuizService
from apps.submissions.services import SubmissionService
from apps.submissions.workflows import grade_subjective_answer
from apps.tasks.assignment_workflow import get_assignment_progress_data
from apps.tasks.task_service import TaskService
from apps.tasks.tests.factories import UserFactory


def build_request(user, current_role: str = 'ADMIN'):
    user.current_role = current_role
    return SimpleNamespace(user=user, META={})


def build_single_choice_payload(
    *,
    content: str,
    score: str,
    source_question_id: int | None = None,
) -> dict:
    payload = {
        'content': content,
        'question_type': 'SINGLE_CHOICE',
        'options': [
            {'key': 'A', 'value': '选项A'},
            {'key': 'B', 'value': '选项B'},
        ],
        'answer': 'A',
        'explanation': '单选题解析',
        'score': score,
        'tag_ids': [],
        'space_tag_id': None,
    }
    if source_question_id is not None:
        payload['source_question_id'] = source_question_id
    return payload


def build_short_answer_payload(
    *,
    content: str,
    score: str,
    source_question_id: int | None = None,
) -> dict:
    payload = {
        'content': content,
        'question_type': 'SHORT_ANSWER',
        'options': [],
        'answer': '主流程参考答案',
        'explanation': '简答题解析',
        'score': score,
        'tag_ids': [],
        'space_tag_id': None,
    }
    if source_question_id is not None:
        payload['source_question_id'] = source_question_id
    return payload


@pytest.mark.django_db
def test_start_quiz_api_returns_submission_payload(api_client, monkeypatch):
    monkeypatch.setattr('apps.questions.services.enforce', lambda *args, **kwargs: True)
    monkeypatch.setattr('apps.tasks.task_service.enforce', lambda *args, **kwargs: True)
    monkeypatch.setattr('apps.tasks.policies.scope_filter', lambda *args, **kwargs: kwargs['resource_model'].objects.all())
    monkeypatch.setattr('apps.submissions.views.common.enforce', lambda *args, **kwargs: True)

    admin_user = UserFactory(username='答题入口管理员')
    student = UserFactory(
        employee_id='FLOW_START_API_001',
        username='答题入口学员',
        mentor=admin_user,
        department=admin_user.department,
    )
    question_service = QuestionService(build_request(admin_user))
    quiz_service = QuizService(build_request(admin_user))
    task_service = TaskService(build_request(admin_user))

    question = question_service.create(
        build_single_choice_payload(content='开始答题接口单选题', score='3')
    )
    quiz = quiz_service.create(
        {'title': '开始答题接口试卷', 'quiz_type': 'PRACTICE'},
        questions=[
            build_single_choice_payload(
                content='开始答题接口单选题',
                score='3',
                source_question_id=question.id,
            )
        ],
    )
    task = task_service.create_task(
        title='开始答题接口任务',
        description='',
        deadline=timezone.now() + timedelta(days=3),
        quiz_ids=[quiz.id],
        assignee_ids=[student.id],
    )
    assignment = task.assignments.get()
    task_quiz = task.task_quizzes.get()

    student.current_role = 'STUDENT'
    api_client.force_authenticate(user=student)
    response = api_client.post(
        '/api/submissions/start/',
        {
            'assignment_id': assignment.id,
            'quiz_id': task_quiz.id,
        },
        format='json',
    )

    assert response.status_code == 201, response.data
    payload = response.data['data']
    assert payload['task_quiz_id'] == task_quiz.id
    assert payload['quiz_title'] == '开始答题接口试卷'
    assert payload['answers'][0]['question_content'] == '开始答题接口单选题'


@pytest.mark.django_db
def test_main_flow_pipeline_with_32_students(monkeypatch):
    monkeypatch.setattr('apps.questions.services.enforce', lambda *args, **kwargs: True)
    monkeypatch.setattr('apps.tasks.task_service.enforce', lambda *args, **kwargs: True)
    monkeypatch.setattr('apps.tasks.policies.scope_filter', lambda *args, **kwargs: kwargs['resource_model'].objects.all())

    admin_user = UserFactory(username='主流程管理员')
    question_service = QuestionService(build_request(admin_user))
    quiz_service = QuizService(build_request(admin_user))
    task_service = TaskService(build_request(admin_user))

    single_choice_question = question_service.create(
        build_single_choice_payload(content='主流程单选题 V1', score='3')
    )
    short_answer_question = question_service.create(
        build_short_answer_payload(content='主流程简答题 V1', score='7')
    )

    question_service.update(
        single_choice_question.id,
        build_single_choice_payload(content='主流程单选题 V2', score='4'),
    )
    question_service.update(
        short_answer_question.id,
        build_short_answer_payload(content='主流程简答题 V2', score='6'),
    )

    quiz = quiz_service.create(
        {
            'title': '上线主流程试卷',
            'quiz_type': 'PRACTICE',
        },
        questions=[
            build_single_choice_payload(
                content='试卷里的单选题',
                score='4',
                source_question_id=single_choice_question.id,
            ),
            build_short_answer_payload(
                content='试卷里的简答题',
                score='6',
                source_question_id=short_answer_question.id,
            ),
        ],
    )

    students = [
        UserFactory(
            employee_id=f'FLOW_STU_{index:03d}',
            username=f'流程学员{index:02d}',
            mentor=admin_user,
            department=admin_user.department,
        )
        for index in range(1, 33)
    ]

    task = task_service.create_task(
        title='上线前主流程验证任务',
        description='覆盖题目、试卷、任务、作答、进度、阅卷',
        deadline=timezone.now() + timedelta(days=3),
        quiz_ids=[quiz.id],
        assignee_ids=[student.id for student in students],
    )

    task_quiz = task.task_quizzes.select_related('quiz').get()
    assignment_map = {
        assignment.assignee_id: assignment
        for assignment in task.assignments.select_related('assignee')
    }

    assert len(assignment_map) == 32
    assert task_quiz.quiz.title == '上线主流程试卷'
    assert task_quiz.quiz.question_count == 2

    question_service.update(
        single_choice_question.id,
        build_single_choice_payload(content='题库题后续又被编辑', score='9'),
    )
    task_quiz.refresh_from_db()
    assert task_quiz.quiz.quiz_questions.order_by('order').first().content == '试卷里的单选题'

    for student in students[:25]:
        submission_service = SubmissionService(build_request(student, current_role='STUDENT'))
        assignment = assignment_map[student.id]
        _, validated_task_quiz, _ = submission_service.validate_assignment_for_quiz(
            assignment.id,
            task_quiz.id,
            student,
        )
        submission = submission_service.start_quiz(
            assignment,
            validated_task_quiz,
            student,
            is_exam=False,
        )
        questions = list(submission.answers.select_related('question').order_by('question__order'))
        submission_service.save_answer(submission, questions[0].question_id, user_answer='A')
        submission_service.save_answer(submission, questions[1].question_id, user_answer=f'{student.username} 的简答')
        submission_service.submit(submission)

    for student in students[25:29]:
        submission_service = SubmissionService(build_request(student, current_role='STUDENT'))
        assignment = assignment_map[student.id]
        _, validated_task_quiz, _ = submission_service.validate_assignment_for_quiz(
            assignment.id,
            task_quiz.id,
            student,
        )
        submission = submission_service.start_quiz(
            assignment,
            validated_task_quiz,
            student,
            is_exam=False,
        )
        first_question = submission.answers.select_related('question').order_by('question__order').first()
        submission_service.save_answer(submission, first_question.question_id, user_answer='A')

    graded_student = students[0]
    graded_submission_service = SubmissionService(build_request(graded_student, current_role='STUDENT'))
    graded_assignment = assignment_map[graded_student.id]
    graded_submission = graded_assignment.submissions.select_related('quiz').get(status='GRADING')
    subjective_answer = graded_submission.answers.select_related('question').get(question__question_type='SHORT_ANSWER')
    grade_subjective_answer(subjective_answer, grader=admin_user, score='5', comment='主流程人工阅卷通过')
    graded_submission.refresh_from_db()
    graded_assignment.refresh_from_db()

    pending_count = PendingQuizzesView()._count_pending_grading(task, task_quiz.id)
    grading_payload = GradingAnswersView()._get_grading_answers(
        task,
        subjective_answer.question_id,
        task_quiz.id,
    )

    fresh_task_quiz = task.task_quizzes.select_related('quiz').get()
    assert fresh_task_quiz.quiz.quiz_questions.count() == 2
    assert pending_count == 24
    assert len(grading_payload['subjective_answers']) == 25
    assert any(
        item['student_id'] == graded_student.id and item['score'] == 5.0
        for item in grading_payload['subjective_answers']
    )
    assert graded_submission.status == 'GRADED'
    assert graded_assignment.status == 'COMPLETED'
    assert float(graded_submission.obtained_score) == 9.0
    assert get_assignment_progress_data(graded_assignment)['percentage'] == 100.0
    assert get_assignment_progress_data(graded_assignment)['quiz_completed'] == 1

    untouched_assignment = assignment_map[students[-1].id]
    in_progress_assignment = assignment_map[students[27].id]

    assert get_assignment_progress_data(untouched_assignment)['percentage'] == 0
    assert get_assignment_progress_data(in_progress_assignment)['quiz_completed'] == 0
    assert task.assignments.filter(submissions__status='GRADING').distinct().count() == 24
    assert task.assignments.filter(submissions__status='GRADED').distinct().count() == 1
    assert task.assignments.filter(submissions__status='IN_PROGRESS').distinct().count() == 4
