from types import SimpleNamespace

import pytest

from apps.knowledge.models import Knowledge, KnowledgeRevision
from apps.knowledge.services import KnowledgeService, ensure_knowledge_revision
from apps.questions.models import Question
from apps.quizzes.models import QuizQuestion, QuizRevision
from apps.quizzes.services import QuizService, ensure_quiz_revision
from apps.tasks.tests.factories import TaskFactory, TaskKnowledgeFactory, UserFactory
from apps.users.models import Role, UserRole


def build_request(user):
    role, _ = Role.objects.get_or_create(code='ADMIN', defaults={'name': '管理员'})
    UserRole.objects.get_or_create(user=user, role=role)
    user.__dict__.pop('role_codes', None)
    user.current_role = 'ADMIN'
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


@pytest.mark.django_db
def test_knowledge_save_updates_current_only_and_keeps_old_snapshot_frozen():
    user = UserFactory()
    service = KnowledgeService(build_request(user))
    knowledge = service.create({'title': '知识 A', 'content': '<p>旧内容</p>', 'tag_ids': []})
    revision = ensure_knowledge_revision(knowledge, actor=user)

    updated = service.update(knowledge.id, {'title': '知识 A 新版', 'content': '<p>新内容</p>'})

    revision.refresh_from_db()
    updated.refresh_from_db()

    assert updated.id == knowledge.id
    assert Knowledge.objects.count() == 1
    assert KnowledgeRevision.objects.count() == 1
    assert updated.title == '知识 A 新版'
    assert revision.title == '知识 A'
    assert revision.content == '<p>旧内容</p>'


@pytest.mark.django_db
def test_ensure_knowledge_revision_reuses_same_snapshot_until_content_changes():
    user = UserFactory()
    service = KnowledgeService(build_request(user))
    knowledge = service.create({'title': '知识 A', 'content': '<p>内容</p>', 'tag_ids': []})

    revision_1 = ensure_knowledge_revision(knowledge, actor=user)
    same_revision = ensure_knowledge_revision(knowledge, actor=user)
    updated = service.update(knowledge.id, {'content': '<p>内容已更新</p>'})
    revision_2 = ensure_knowledge_revision(updated, actor=user)

    assert same_revision.id == revision_1.id
    assert revision_2.id != revision_1.id
    assert revision_2.revision_number == 2
    assert revision_1.content == '<p>内容</p>'
    assert revision_2.content == '<p>内容已更新</p>'


@pytest.mark.django_db
def test_delete_knowledge_removes_unbound_snapshots():
    user = UserFactory()
    service = KnowledgeService(build_request(user))
    knowledge = service.create({'title': '知识 A', 'content': '<p>内容</p>', 'tag_ids': []})
    revision = ensure_knowledge_revision(knowledge, actor=user)

    service.delete(knowledge.id)

    assert not Knowledge.objects.filter(id=knowledge.id).exists()
    assert not KnowledgeRevision.objects.filter(id=revision.id).exists()


@pytest.mark.django_db
def test_delete_knowledge_keeps_task_bound_snapshot():
    user = UserFactory()
    service = KnowledgeService(build_request(user))
    knowledge = service.create({'title': '知识 A', 'content': '<p>内容</p>', 'tag_ids': []})
    revision = ensure_knowledge_revision(knowledge, actor=user)
    task = TaskFactory(created_by=user, updated_by=user)
    TaskKnowledgeFactory(task=task, knowledge=revision, source_knowledge=knowledge)

    service.delete(knowledge.id)

    revision.refresh_from_db()
    assert not Knowledge.objects.filter(id=knowledge.id).exists()
    assert revision.source_knowledge_id is None
    assert revision.title == '知识 A'


@pytest.mark.django_db
def test_quiz_save_inline_question_creates_bank_question_and_current_copy():
    user = UserFactory()
    service = QuizService(build_request(user))

    quiz = service.create(
        {'title': '试卷 A', 'quiz_type': 'PRACTICE'},
        questions=[build_choice_payload(content='试卷里新建的题目')],
    )

    relation = quiz.quiz_questions.select_related('question').get()
    bank_question = relation.question

    assert Question.objects.count() == 1
    assert QuizQuestion.objects.count() == 1
    assert bank_question is not None
    assert bank_question.created_from_quiz_id == quiz.id
    assert bank_question.content == '试卷里新建的题目'
    assert relation.content == '试卷里新建的题目'


@pytest.mark.django_db
def test_quiz_editing_bank_derived_copy_does_not_mutate_bank_question():
    user = UserFactory()
    quiz_service = QuizService(build_request(user))

    bank_question = Question.objects.create(
        content='题库原题',
        question_type='SINGLE_CHOICE',
        explanation='题库解析',
        score='2',
        created_by=user,
        updated_by=user,
    )
    bank_question.question_options.create(sort_order=1, content='选项A', is_correct=True)
    bank_question.question_options.create(sort_order=2, content='选项B', is_correct=False)

    quiz = quiz_service.create(
        {'title': '试卷 A', 'quiz_type': 'PRACTICE'},
        questions=[build_choice_payload(content='试卷副本题目', explanation='试卷解析', source_question_id=bank_question.id)],
    )

    relation = quiz.quiz_questions.get()
    bank_question.refresh_from_db()

    assert relation.question_id == bank_question.id
    assert relation.content == '试卷副本题目'
    assert relation.explanation == '试卷解析'
    assert bank_question.content == '题库原题'
    assert bank_question.explanation == '题库解析'


@pytest.mark.django_db
def test_ensure_quiz_revision_reuses_same_snapshot_and_increments_after_copy_change():
    user = UserFactory()
    service = QuizService(build_request(user))
    quiz = service.create(
        {'title': '试卷 A', 'quiz_type': 'PRACTICE'},
        questions=[build_choice_payload(content='题目 V1', explanation='解析 V1')],
    )
    relation = quiz.quiz_questions.get()

    revision_1 = ensure_quiz_revision(quiz, actor=user)
    same_revision = ensure_quiz_revision(quiz, actor=user)

    service.update(
        quiz.id,
        {'title': '试卷 A'},
        questions=[
            build_choice_payload(
                content='题目 V2',
                explanation='解析 V2',
                source_question_id=relation.question_id,
                relation_id=relation.id,
            )
        ],
    )
    quiz.refresh_from_db()
    revision_2 = ensure_quiz_revision(quiz, actor=user)

    assert same_revision.id == revision_1.id
    assert revision_2.id != revision_1.id
    assert revision_2.revision_number == 2
    assert revision_1.quiz_questions.get().content == '题目 V1'
    assert revision_2.quiz_questions.get().content == '题目 V2'


@pytest.mark.django_db
def test_delete_quiz_removes_inline_bank_question_when_no_execution_snapshot_is_used():
    user = UserFactory()
    service = QuizService(build_request(user))
    quiz = service.create(
        {'title': '试卷 A', 'quiz_type': 'PRACTICE'},
        questions=[build_choice_payload(content='只属于试卷的题目')],
    )
    created_question_id = quiz.quiz_questions.get().question_id
    ensure_quiz_revision(quiz, actor=user)

    service.delete(quiz.id)

    assert not Question.objects.filter(id=created_question_id).exists()
    assert not QuizRevision.objects.filter(source_quiz_id=quiz.id).exists()
