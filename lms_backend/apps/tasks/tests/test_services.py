import pytest
from apps.tasks.services import TaskService
from apps.tasks.tests.factories import (
    TaskFactory,
    TaskAssignmentFactory,
    TaskKnowledgeFactory,
    KnowledgeLearningProgressFactory,
    SubmissionFactory,
)


@pytest.mark.django_db
def test_has_student_progress_no_progress():
    """Test has_student_progress returns False when no progress exists"""
    task = TaskFactory()
    TaskAssignmentFactory(task=task)

    service = TaskService()
    result = service.has_student_progress(task)

    assert result is False


@pytest.mark.django_db
def test_has_student_progress_with_knowledge_progress():
    """Test has_student_progress returns True when knowledge progress exists"""
    task = TaskFactory()
    assignment = TaskAssignmentFactory(task=task)
    task_knowledge = TaskKnowledgeFactory(task=task)
    KnowledgeLearningProgressFactory(
        assignment=assignment,
        task_knowledge=task_knowledge,
        is_completed=True
    )

    service = TaskService()
    result = service.has_student_progress(task)

    assert result is True


@pytest.mark.django_db
def test_has_student_progress_with_quiz_submission():
    """Test has_student_progress returns True when quiz submission exists"""
    task = TaskFactory()
    assignment = TaskAssignmentFactory(task=task)
    SubmissionFactory(task_assignment=assignment)

    service = TaskService()
    result = service.has_student_progress(task)

    assert result is True
