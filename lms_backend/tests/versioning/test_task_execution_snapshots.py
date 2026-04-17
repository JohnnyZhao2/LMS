from datetime import timedelta
from types import SimpleNamespace

import pytest
from django.utils import timezone

from apps.knowledge.models import KnowledgeRevision
from apps.knowledge.services import KnowledgeService
from apps.quizzes.models import QuizRevision
from apps.quizzes.services import QuizService, ensure_quiz_revision
from apps.submissions.services import SubmissionService
from apps.tasks.serializers import CompleteKnowledgeLearningSerializer, TaskDetailSerializer
from apps.tasks.student_task_service import StudentTaskService
from apps.tasks.task_service import TaskService
from apps.tasks.tests.factories import TaskAssignmentFactory, TaskFactory, TaskKnowledgeFactory, UserFactory
from core.exceptions import BusinessError, ErrorCodes


def build_request(user):
    return SimpleNamespace(user=user, META={})


def build_choice_payload(
    *,
    content: str,
    answer: str = 'A',
    explanation: str = '',
    score: str = '1',
    source_question_id=None,
    relation_id=None,
):
    payload = {
        'content': content,
        'question_type': 'SINGLE_CHOICE',
        'options': [
            {'key': 'A', 'value': '选项A'},
            {'key': 'B', 'value': '选项B'},
        ],
        'answer': answer,
        'explanation': explanation,
        'score': score,
        'tag_ids': [],
        'space_tag_id': None,
    }
    if source_question_id is not None:
        payload['source_question_id'] = source_question_id
    if relation_id is not None:
        payload['id'] = relation_id
    return payload


def create_resources(admin_user):
    knowledge = KnowledgeService(build_request(admin_user)).create(
        {'title': '知识 A', 'content': '<p>内容 A</p>', 'tag_ids': []}
    )
    quiz_service = QuizService(build_request(admin_user))
    quiz = quiz_service.create(
        {'title': '试卷 A', 'quiz_type': 'PRACTICE'},
        questions=[build_choice_payload(content='题目 A1')],
    )
    return knowledge, quiz


@pytest.mark.django_db
def test_create_task_binds_current_resources_to_snapshots_and_reuses_them(monkeypatch):
    admin_user = UserFactory()
    student_a = UserFactory()
    student_b = UserFactory()
    knowledge, quiz = create_resources(admin_user)
    monkeypatch.setattr('apps.tasks.task_service.enforce', lambda *args, **kwargs: True)

    service = TaskService(build_request(admin_user))
    task_a = service.create_task(
        title='任务 A',
        description='',
        deadline=timezone.now() + timedelta(days=7),
        knowledge_ids=[knowledge.id, knowledge.id],
        quiz_ids=[quiz.id, quiz.id],
        assignee_ids=[student_a.id],
    )
    task_b = service.create_task(
        title='任务 B',
        description='',
        deadline=timezone.now() + timedelta(days=7),
        knowledge_ids=[knowledge.id],
        quiz_ids=[quiz.id],
        assignee_ids=[student_b.id],
    )

    task_a_knowledge = task_a.task_knowledge.get()
    task_b_knowledge = task_b.task_knowledge.get()
    task_a_quiz = task_a.task_quizzes.get()
    task_b_quiz = task_b.task_quizzes.get()

    assert task_a.task_knowledge.count() == 1
    assert task_a.task_quizzes.count() == 1
    assert KnowledgeRevision.objects.count() == 1
    assert QuizRevision.objects.count() == 1
    assert task_a_knowledge.source_knowledge_id == knowledge.id
    assert task_b_knowledge.knowledge_id == task_a_knowledge.knowledge_id
    assert task_a_quiz.source_quiz_id == quiz.id
    assert task_b_quiz.quiz_id == task_a_quiz.quiz_id


@pytest.mark.django_db
def test_update_task_blocks_resource_replacement_after_knowledge_progress(monkeypatch):
    admin_user = UserFactory()
    student = UserFactory()
    knowledge, quiz = create_resources(admin_user)
    other_knowledge = KnowledgeService(build_request(admin_user)).create(
        {'title': '知识 B', 'content': '<p>内容 B</p>', 'tag_ids': []}
    )
    monkeypatch.setattr('apps.tasks.task_service.enforce', lambda *args, **kwargs: True)

    task_service = TaskService(build_request(admin_user))
    task = task_service.create_task(
        title='任务 A',
        description='',
        deadline=timezone.now() + timedelta(days=7),
        knowledge_ids=[knowledge.id],
        quiz_ids=[quiz.id],
        assignee_ids=[student.id],
    )
    assignment = task.assignments.get()
    student_service = StudentTaskService(build_request(student))
    student_service.complete_knowledge_learning(assignment, task.task_knowledge.get().id)

    with pytest.raises(BusinessError) as exc:
        task_service.update_task(task, knowledge_ids=[other_knowledge.id])

    assert exc.value.code == ErrorCodes.INVALID_OPERATION
    assert '无法修改知识文档' in str(exc.value.message)


@pytest.mark.django_db
def test_update_task_blocks_quiz_replacement_after_submission_started(monkeypatch):
    admin_user = UserFactory()
    student = UserFactory()
    knowledge, quiz = create_resources(admin_user)
    other_quiz = QuizService(build_request(admin_user)).create(
        {'title': '试卷 B', 'quiz_type': 'PRACTICE'},
        questions=[build_choice_payload(content='题目 B1')],
    )
    monkeypatch.setattr('apps.tasks.task_service.enforce', lambda *args, **kwargs: True)

    task_service = TaskService(build_request(admin_user))
    task = task_service.create_task(
        title='任务 A',
        description='',
        deadline=timezone.now() + timedelta(days=7),
        knowledge_ids=[knowledge.id],
        quiz_ids=[quiz.id],
        assignee_ids=[student.id],
    )
    assignment = task.assignments.get()
    task_quiz = task.task_quizzes.get()
    submission_service = SubmissionService(build_request(student))
    _, validated_task_quiz, _ = submission_service.validate_assignment_for_quiz(assignment.id, task_quiz.id, student)
    submission_service.start_quiz(assignment, validated_task_quiz, student, is_exam=False)

    with pytest.raises(BusinessError) as exc:
        task_service.update_task(task, quiz_ids=[other_quiz.id])

    assert exc.value.code == ErrorCodes.INVALID_OPERATION
    assert '无法修改试卷' in str(exc.value.message)


@pytest.mark.django_db
def test_update_task_allows_basic_fields_and_assignee_addition_after_progress(monkeypatch):
    admin_user = UserFactory()
    student_a = UserFactory()
    student_b = UserFactory()
    knowledge, quiz = create_resources(admin_user)
    monkeypatch.setattr('apps.tasks.task_service.enforce', lambda *args, **kwargs: True)

    task_service = TaskService(build_request(admin_user))
    task = task_service.create_task(
        title='任务 A',
        description='旧描述',
        deadline=timezone.now() + timedelta(days=7),
        knowledge_ids=[knowledge.id],
        quiz_ids=[quiz.id],
        assignee_ids=[student_a.id],
    )
    assignment = task.assignments.get()
    StudentTaskService(build_request(student_a)).complete_knowledge_learning(
        assignment,
        task.task_knowledge.get().id,
    )

    updated = task_service.update_task(
        task,
        title='任务 A 已更新',
        description='新描述',
        assignee_ids=[student_a.id, student_b.id],
    )

    assert updated.title == '任务 A 已更新'
    assert updated.description == '新描述'
    assert updated.assignments.count() == 2


@pytest.mark.django_db
def test_update_task_blocks_assignee_removal_after_progress(monkeypatch):
    admin_user = UserFactory()
    student_a = UserFactory()
    student_b = UserFactory()
    knowledge, quiz = create_resources(admin_user)
    monkeypatch.setattr('apps.tasks.task_service.enforce', lambda *args, **kwargs: True)

    task_service = TaskService(build_request(admin_user))
    task = task_service.create_task(
        title='任务 A',
        description='',
        deadline=timezone.now() + timedelta(days=7),
        knowledge_ids=[knowledge.id],
        quiz_ids=[quiz.id],
        assignee_ids=[student_a.id, student_b.id],
    )
    assignment = task.assignments.get(assignee_id=student_a.id)
    StudentTaskService(build_request(student_a)).complete_knowledge_learning(
        assignment,
        task.task_knowledge.get().id,
    )

    with pytest.raises(BusinessError) as exc:
        task_service.update_task(task, assignee_ids=[student_a.id])

    assert exc.value.code == ErrorCodes.INVALID_OPERATION
    assert '无法移除已分配的学员' in str(exc.value.message)


@pytest.mark.django_db
def test_submission_reads_task_quiz_snapshot_even_after_current_quiz_changes(monkeypatch):
    admin_user = UserFactory()
    student = UserFactory()
    knowledge, quiz = create_resources(admin_user)
    monkeypatch.setattr('apps.tasks.task_service.enforce', lambda *args, **kwargs: True)

    task_service = TaskService(build_request(admin_user))
    task = task_service.create_task(
        title='任务 A',
        description='',
        deadline=timezone.now() + timedelta(days=7),
        knowledge_ids=[knowledge.id],
        quiz_ids=[quiz.id],
        assignee_ids=[student.id],
    )
    assignment = task.assignments.get()
    task_quiz = task.task_quizzes.get()
    snapshot_question = task_quiz.quiz.quiz_questions.get()

    submission_service = SubmissionService(build_request(student))
    _, validated_task_quiz, _ = submission_service.validate_assignment_for_quiz(assignment.id, task_quiz.id, student)
    submission = submission_service.start_quiz(assignment, validated_task_quiz, student, is_exam=False)
    answer = submission.answers.select_related('question').get()

    relation = quiz.quiz_questions.get()
    QuizService(build_request(admin_user)).update(
        quiz.id,
        {'title': '试卷 A'},
        questions=[
            build_choice_payload(
                content='题目 A1 已编辑',
                explanation='新解析',
                source_question_id=relation.question_id,
                relation_id=relation.id,
            )
        ],
    )
    new_revision = ensure_quiz_revision(quiz, actor=admin_user)
    answer.refresh_from_db()
    task_quiz.refresh_from_db()

    assert snapshot_question.content == '题目 A1'
    assert answer.question.content == '题目 A1'
    assert quiz.quiz_questions.get().content == '题目 A1 已编辑'
    assert new_revision.id != task_quiz.quiz_id


@pytest.mark.django_db
def test_task_detail_serializer_prefers_revision_title_when_source_deleted(monkeypatch):
    admin_user = UserFactory()
    student = UserFactory()
    knowledge, quiz = create_resources(admin_user)
    monkeypatch.setattr('apps.tasks.task_service.enforce', lambda *args, **kwargs: True)

    task = TaskService(build_request(admin_user)).create_task(
        title='任务 A',
        description='',
        deadline=timezone.now() + timedelta(days=7),
        knowledge_ids=[knowledge.id],
        quiz_ids=[quiz.id],
        assignee_ids=[student.id],
    )

    KnowledgeService(build_request(admin_user)).delete(knowledge.id)
    QuizService(build_request(admin_user)).delete(quiz.id)
    serializer = TaskDetailSerializer(task)
    knowledge_item = serializer.data['knowledge_items'][0]
    quiz_item = serializer.data['quizzes'][0]

    assert knowledge_item['source_title'] is None
    assert knowledge_item['knowledge_title'] == '知识 A'
    assert quiz_item['source_title'] is None
    assert quiz_item['quiz_title'] == '试卷 A'


@pytest.mark.django_db
def test_complete_knowledge_learning_serializer_accepts_snapshot_task_knowledge_id():
    task = TaskFactory()
    task_knowledge = TaskKnowledgeFactory(task=task)

    serializer = CompleteKnowledgeLearningSerializer(data={'task_knowledge_id': task_knowledge.id})

    assert serializer.is_valid(), serializer.errors
