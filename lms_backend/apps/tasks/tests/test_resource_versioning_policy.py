from types import SimpleNamespace

import pytest

from apps.knowledge.models import Knowledge
from apps.knowledge.services import KnowledgeService
from apps.questions.models import Question, QuestionOption
from apps.questions.services import QuestionService
from apps.quizzes.models import Quiz, QuizQuestion
from apps.quizzes.services import QuizService
from apps.tags.models import Tag
from apps.tasks.models import TaskKnowledge, TaskQuiz
from apps.tasks.tests.factories import KnowledgeFactory, QuizFactory, TaskFactory, UserFactory
from core.exceptions import BusinessError, ErrorCodes


def _build_request(user):
    return SimpleNamespace(user=user, META={})


def _create_question(created_by, **overrides):
    data = {
        'created_by': created_by,
        'updated_by': created_by,
        'content': '原题干',
        'question_type': 'SINGLE_CHOICE',
        'explanation': '',
        'score': 1,
        'is_current': True,
        'version_number': 1,
    }
    data.update(overrides)
    option_defs = data.pop(
        'option_defs',
        [
            {'sort_order': 1, 'content': '选项A', 'is_correct': True},
            {'sort_order': 2, 'content': '选项B', 'is_correct': False},
        ],
    )
    question = Question.objects.create(**data)
    for option_def in option_defs:
        QuestionOption.objects.create(question=question, **option_def)
    return question


def _create_scope_tag(name: str, *, allow_knowledge: bool = False, allow_question: bool = False) -> Tag:
    return Tag.objects.create(
        name=name,
        tag_type='TAG',
        allow_knowledge=allow_knowledge,
        allow_question=allow_question,
    )


@pytest.mark.django_db
def test_knowledge_update_in_place_when_not_task_referenced():
    user = UserFactory()
    knowledge = KnowledgeFactory(created_by=user, updated_by=user, title='旧标题', version_number=1, is_current=True)
    service = KnowledgeService(_build_request(user))

    updated = service.update(knowledge.id, {'title': '新标题'})

    knowledge.refresh_from_db()
    assert updated.id == knowledge.id
    assert knowledge.title == '新标题'
    assert Knowledge.objects.filter(resource_uuid=knowledge.resource_uuid).count() == 1


@pytest.mark.django_db
def test_knowledge_update_creates_new_version_when_task_referenced():
    user = UserFactory()
    knowledge = KnowledgeFactory(created_by=user, updated_by=user, title='旧标题', version_number=1, is_current=True)
    task = TaskFactory(created_by=user)
    TaskKnowledge.objects.create(task=task, knowledge=knowledge, order=1)
    service = KnowledgeService(_build_request(user))

    updated = service.update(knowledge.id, {'title': '新标题'})

    knowledge.refresh_from_db()
    assert updated.id != knowledge.id
    assert updated.version_number == 2
    assert updated.is_current is True
    assert knowledge.is_current is False
    assert Knowledge.objects.filter(resource_uuid=knowledge.resource_uuid).count() == 2


@pytest.mark.django_db
def test_knowledge_tag_change_creates_new_version_when_task_referenced():
    user = UserFactory()
    knowledge = KnowledgeFactory(created_by=user, updated_by=user, version_number=1, is_current=True)
    old_tag = _create_scope_tag('旧知识标签', allow_knowledge=True)
    new_tag = _create_scope_tag('新知识标签', allow_knowledge=True)
    knowledge.tags.set([old_tag.id])
    task = TaskFactory(created_by=user)
    TaskKnowledge.objects.create(task=task, knowledge=knowledge, order=1)
    service = KnowledgeService(_build_request(user))

    updated = service.update(knowledge.id, {'tag_ids': [new_tag.id]})

    knowledge.refresh_from_db()
    assert updated.id != knowledge.id
    assert list(updated.tags.values_list('id', flat=True)) == [new_tag.id]
    assert list(knowledge.tags.values_list('id', flat=True)) == [old_tag.id]


@pytest.mark.django_db
def test_knowledge_update_referenced_no_change_keeps_single_version():
    user = UserFactory()
    knowledge = KnowledgeFactory(created_by=user, updated_by=user, title='不变标题', version_number=1, is_current=True)
    task = TaskFactory(created_by=user)
    TaskKnowledge.objects.create(task=task, knowledge=knowledge, order=1)
    service = KnowledgeService(_build_request(user))

    updated = service.update(knowledge.id, {'title': '不变标题'})

    assert updated.id == knowledge.id
    assert Knowledge.objects.filter(resource_uuid=knowledge.resource_uuid).count() == 1


@pytest.mark.django_db
def test_knowledge_historical_version_update_blocked(monkeypatch):
    user = UserFactory()
    current = KnowledgeFactory(created_by=user, updated_by=user, title='当前标题', version_number=2, is_current=True)
    old = KnowledgeFactory(
        created_by=user,
        updated_by=user,
        title='历史标题',
        resource_uuid=current.resource_uuid,
        version_number=1,
        is_current=False,
    )
    service = KnowledgeService(_build_request(user))
    monkeypatch.setattr(service, 'check_published_resource_access', lambda *args, **kwargs: None)

    with pytest.raises(BusinessError) as exc:
        service.update(old.id, {'title': '非法修改'})

    old.refresh_from_db()
    assert exc.value.code == ErrorCodes.INVALID_OPERATION
    assert '历史版本不可修改' in str(exc.value.message)
    assert old.title == '历史标题'


@pytest.mark.django_db
def test_question_update_in_place_when_not_quiz_referenced(monkeypatch):
    user = UserFactory()
    question = _create_question(created_by=user, content='旧题干')
    service = QuestionService(_build_request(user))
    monkeypatch.setattr('apps.questions.services.enforce', lambda *args, **kwargs: True)

    updated = service.update(question.id, {'content': '新题干'})

    question.refresh_from_db()
    assert updated.id == question.id
    assert question.content == '新题干'
    assert Question.objects.filter(resource_uuid=question.resource_uuid).count() == 1


@pytest.mark.django_db
def test_question_historical_version_update_blocked(monkeypatch):
    user = UserFactory()
    current = _create_question(created_by=user, content='当前题干', version_number=2, is_current=True)
    old = _create_question(
        created_by=user,
        content='历史题干',
        resource_uuid=current.resource_uuid,
        version_number=1,
        is_current=False,
    )
    service = QuestionService(_build_request(user))
    monkeypatch.setattr('apps.questions.services.enforce', lambda *args, **kwargs: True)
    monkeypatch.setattr(service, 'check_published_resource_access', lambda *args, **kwargs: None)

    with pytest.raises(BusinessError) as exc:
        service.update(old.id, {'content': '非法修改'})

    old.refresh_from_db()
    assert exc.value.code == ErrorCodes.INVALID_OPERATION
    assert '历史版本不可修改' in str(exc.value.message)
    assert old.content == '历史题干'


@pytest.mark.django_db
def test_question_update_in_place_when_only_one_unfrozen_quiz_referenced(monkeypatch):
    user = UserFactory()
    question = _create_question(created_by=user, content='旧题干')
    quiz = QuizFactory(created_by=user, updated_by=user, is_current=True, version_number=1)
    QuizQuestion.objects.create(quiz=quiz, question=question, order=1)
    service = QuestionService(_build_request(user))
    monkeypatch.setattr('apps.questions.services.enforce', lambda *args, **kwargs: True)

    updated = service.update(question.id, {'content': '新题干'})

    question.refresh_from_db()
    assert updated.id == question.id
    assert updated.version_number == 1
    assert updated.is_current is True
    assert Question.objects.filter(resource_uuid=question.resource_uuid).count() == 1


@pytest.mark.django_db
def test_question_update_creates_new_version_when_shared_by_quizzes(monkeypatch):
    user = UserFactory()
    question = _create_question(created_by=user, content='旧题干')
    quiz_a = QuizFactory(created_by=user, updated_by=user, is_current=True, version_number=1)
    quiz_b = QuizFactory(created_by=user, updated_by=user, is_current=True, version_number=1)
    QuizQuestion.objects.create(quiz=quiz_a, question=question, order=1)
    QuizQuestion.objects.create(quiz=quiz_b, question=question, order=1)
    service = QuestionService(_build_request(user))
    monkeypatch.setattr('apps.questions.services.enforce', lambda *args, **kwargs: True)

    updated = service.update(question.id, {'content': '新题干'})

    question.refresh_from_db()
    assert updated.id != question.id
    assert updated.version_number == 2
    assert updated.is_current is True
    assert question.is_current is False
    assert Question.objects.filter(resource_uuid=question.resource_uuid).count() == 2


@pytest.mark.django_db
def test_question_tag_change_creates_new_version_when_quiz_is_task_bound(monkeypatch):
    user = UserFactory()
    question = _create_question(created_by=user, content='旧题干')
    old_tag = _create_scope_tag('旧题目标签', allow_question=True)
    new_tag = _create_scope_tag('新题目标签', allow_question=True)
    question.tags.set([old_tag.id])
    quiz = QuizFactory(created_by=user, updated_by=user, is_current=True, version_number=1)
    task = TaskFactory(created_by=user)
    QuizQuestion.objects.create(quiz=quiz, question=question, order=1)
    TaskQuiz.objects.create(task=task, quiz=quiz, order=1)
    service = QuestionService(_build_request(user))
    monkeypatch.setattr('apps.questions.services.enforce', lambda *args, **kwargs: True)

    updated = service.update(question.id, {'tag_ids': [new_tag.id]})

    question.refresh_from_db()
    assert updated.id != question.id
    assert list(updated.tags.values_list('id', flat=True)) == [new_tag.id]
    assert list(question.tags.values_list('id', flat=True)) == [old_tag.id]


@pytest.mark.django_db
def test_question_update_creates_new_version_when_task_bound_quiz_referenced(monkeypatch):
    user = UserFactory()
    question = _create_question(created_by=user, content='旧题干')
    quiz = QuizFactory(created_by=user, updated_by=user, is_current=True, version_number=1)
    task = TaskFactory(created_by=user)
    QuizQuestion.objects.create(quiz=quiz, question=question, order=1)
    TaskQuiz.objects.create(task=task, quiz=quiz, order=1)
    service = QuestionService(_build_request(user))
    monkeypatch.setattr('apps.questions.services.enforce', lambda *args, **kwargs: True)

    updated = service.update(question.id, {'content': '新题干'})

    question.refresh_from_db()
    assert updated.id != question.id
    assert updated.version_number == 2
    assert updated.is_current is True
    assert question.is_current is False
    assert Question.objects.filter(resource_uuid=question.resource_uuid).count() == 2


@pytest.mark.django_db
def test_question_update_without_sync_to_bank_keeps_current_version(monkeypatch):
    user = UserFactory()
    question = _create_question(created_by=user, content='旧题干')
    service = QuestionService(_build_request(user))
    monkeypatch.setattr('apps.questions.services.enforce', lambda *args, **kwargs: True)

    updated = service.update(question.id, {'content': '试卷内修改', 'sync_to_bank': False})

    question.refresh_from_db()
    assert updated.id != question.id
    assert updated.is_current is False
    assert question.is_current is True
    assert Question.objects.filter(resource_uuid=question.resource_uuid).count() == 2


@pytest.mark.django_db
def test_question_create_from_source_without_sync_to_bank_keeps_bank_current():
    user = UserFactory()
    question = _create_question(created_by=user, content='题库原题')
    service = QuestionService(_build_request(user))

    created = service.create({
        'source_question_id': question.id,
        'content': '试卷内改题',
        'sync_to_bank': False,
    })

    question.refresh_from_db()
    assert created.id != question.id
    assert created.resource_uuid == question.resource_uuid
    assert created.version_number == 2
    assert created.is_current is False
    assert question.is_current is True


@pytest.mark.django_db
def test_question_create_from_source_with_sync_to_bank_promotes_new_current():
    user = UserFactory()
    question = _create_question(created_by=user, content='题库原题')
    service = QuestionService(_build_request(user))

    created = service.create({
        'source_question_id': question.id,
        'content': '题库新题',
        'sync_to_bank': True,
    })

    question.refresh_from_db()
    assert created.id != question.id
    assert created.resource_uuid == question.resource_uuid
    assert created.version_number == 2
    assert created.is_current is True
    assert question.is_current is False


@pytest.mark.django_db
def test_quiz_update_in_place_when_not_task_referenced():
    user = UserFactory()
    quiz = QuizFactory(created_by=user, updated_by=user, title='旧试卷', is_current=True, version_number=1)
    service = QuizService(_build_request(user))

    updated = service.update(quiz.id, {'title': '新试卷'})

    quiz.refresh_from_db()
    assert updated.id == quiz.id
    assert quiz.title == '新试卷'
    assert Quiz.objects.filter(resource_uuid=quiz.resource_uuid).count() == 1


@pytest.mark.django_db
def test_quiz_historical_version_update_blocked():
    user = UserFactory()
    current = QuizFactory(
        created_by=user,
        updated_by=user,
        title='当前试卷',
        version_number=2,
        is_current=True,
    )
    old = QuizFactory(
        created_by=user,
        updated_by=user,
        title='历史试卷',
        resource_uuid=current.resource_uuid,
        version_number=1,
        is_current=False,
    )
    service = QuizService(_build_request(user))

    with pytest.raises(BusinessError) as exc:
        service.update(old.id, {'title': '非法修改'})

    old.refresh_from_db()
    assert exc.value.code == ErrorCodes.INVALID_OPERATION
    assert '历史版本不可修改' in str(exc.value.message)
    assert old.title == '历史试卷'


@pytest.mark.django_db
def test_quiz_update_creates_new_version_when_task_referenced():
    user = UserFactory()
    quiz = QuizFactory(created_by=user, updated_by=user, title='旧试卷', is_current=True, version_number=1)
    task = TaskFactory(created_by=user)
    TaskQuiz.objects.create(task=task, quiz=quiz, order=1)
    service = QuizService(_build_request(user))

    updated = service.update(quiz.id, {'title': '新试卷'})

    quiz.refresh_from_db()
    assert updated.id != quiz.id
    assert updated.version_number == 2
    assert updated.is_current is True
    assert quiz.is_current is False
    assert Quiz.objects.filter(resource_uuid=quiz.resource_uuid).count() == 2


@pytest.mark.django_db
def test_quiz_update_question_bindings_create_new_version_when_task_referenced():
    user = UserFactory()
    quiz = QuizFactory(created_by=user, updated_by=user, title='旧试卷', is_current=True, version_number=1)
    question_a = _create_question(created_by=user, content='题目A')
    question_b = _create_question(created_by=user, content='题目B')
    TaskQuiz.objects.create(task=TaskFactory(created_by=user), quiz=quiz, order=1)
    QuizQuestion.objects.create(quiz=quiz, question=question_a, order=1, score=2)
    service = QuizService(_build_request(user))

    updated = service.update(
        quiz.id,
        {},
        question_versions=[
            {'question_id': question_a.id, 'score': 5},
            {'question_id': question_b.id, 'score': 3},
        ],
    )

    quiz.refresh_from_db()
    assert updated.id != quiz.id
    assert updated.resource_uuid == quiz.resource_uuid
    assert updated.version_number == 2
    assert updated.is_current is True
    assert quiz.is_current is False
    assert list(
        QuizQuestion.objects.filter(quiz_id=quiz.id)
        .order_by('order')
        .values_list('question_id', 'score')
    ) == [(question_a.id, 2)]
    assert list(
        QuizQuestion.objects.filter(quiz_id=updated.id)
        .order_by('order')
        .values_list('question_id', 'score')
    ) == [(question_a.id, 5), (question_b.id, 3)]


@pytest.mark.django_db
def test_quiz_update_referenced_no_change_keeps_single_version():
    user = UserFactory()
    quiz = QuizFactory(created_by=user, updated_by=user, title='不变试卷', is_current=True, version_number=1)
    task = TaskFactory(created_by=user)
    TaskQuiz.objects.create(task=task, quiz=quiz, order=1)
    service = QuizService(_build_request(user))

    updated = service.update(quiz.id, {})

    assert updated.id == quiz.id
    assert Quiz.objects.filter(resource_uuid=quiz.resource_uuid).count() == 1


@pytest.mark.django_db
def test_quiz_delete_hard_deletes_record():
    user = UserFactory()
    quiz = QuizFactory(created_by=user, updated_by=user, is_current=True, version_number=1)
    service = QuizService(_build_request(user))
    quiz_id = quiz.id

    deleted = service.delete(quiz.id)

    assert deleted.pk is None
    assert Quiz.objects.filter(id=quiz_id).exists() is False
