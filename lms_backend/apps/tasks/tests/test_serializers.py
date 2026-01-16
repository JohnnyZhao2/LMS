import pytest
from apps.tasks.serializers import TaskDetailSerializer
from apps.tasks.tests.factories import (
    TaskFactory,
    TaskAssignmentFactory,
    TaskKnowledgeFactory,
    KnowledgeLearningProgressFactory,
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
