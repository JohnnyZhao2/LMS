import pytest

from apps.tasks.serializers import CompleteKnowledgeLearningSerializer, TaskDetailSerializer
from apps.tasks.tests.factories import (
    KnowledgeFactory,
    KnowledgeLearningProgressFactory,
    TaskAssignmentFactory,
    TaskFactory,
    TaskKnowledgeFactory,
)


@pytest.mark.django_db
def test_task_serializer_includes_has_progress():
    """Test TaskDetailSerializer includes has_progress field"""
    task = TaskFactory()
    assignment = TaskAssignmentFactory(task=task)
    task_knowledge = TaskKnowledgeFactory(task=task)
    KnowledgeLearningProgressFactory(
        assignment=assignment,
        task_knowledge=task_knowledge,
        is_completed=True
    )

    serializer = TaskDetailSerializer(task)

    assert 'has_progress' in serializer.data
    assert serializer.data['has_progress'] is True


@pytest.mark.django_db
def test_task_serializer_has_progress_false_without_progress():
    """Test has_progress is False when no progress exists"""
    task = TaskFactory()
    TaskAssignmentFactory(task=task)

    serializer = TaskDetailSerializer(task)

    assert serializer.data['has_progress'] is False


@pytest.mark.django_db
def test_complete_knowledge_learning_serializer_accepts_locked_task_knowledge():
    """任务绑定历史版本时，完成学习仍应接受 task_knowledge_id。"""
    task = TaskFactory()
    knowledge = KnowledgeFactory(is_current=False)
    task_knowledge = TaskKnowledgeFactory(task=task, knowledge=knowledge)

    serializer = CompleteKnowledgeLearningSerializer(data={'task_knowledge_id': task_knowledge.id})

    assert serializer.is_valid(), serializer.errors


@pytest.mark.django_db
def test_complete_knowledge_learning_serializer_rejects_missing_task_knowledge():
    """不存在的任务知识节点应被拒绝。"""
    serializer = CompleteKnowledgeLearningSerializer(data={'task_knowledge_id': 999999})

    assert serializer.is_valid() is False
    assert 'task_knowledge_id' in serializer.errors
