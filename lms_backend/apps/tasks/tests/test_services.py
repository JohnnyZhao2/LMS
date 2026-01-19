import pytest
from apps.tasks.services import TaskService
from apps.tasks.tests.factories import (
    TaskFactory,
    TaskAssignmentFactory,
    TaskKnowledgeFactory,
    KnowledgeLearningProgressFactory,
    SubmissionFactory,
    UserFactory,
)
from core.exceptions import BusinessError, ErrorCodes


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


@pytest.mark.django_db
def test_update_task_blocks_resource_edit_with_progress():
    """Test update_task raises error when editing resources with progress"""
    task = TaskFactory()
    assignment = TaskAssignmentFactory(task=task)
    task_knowledge = TaskKnowledgeFactory(task=task)
    KnowledgeLearningProgressFactory(
        assignment=assignment,
        task_knowledge=task_knowledge,
        is_completed=True
    )

    service = TaskService()

    with pytest.raises(BusinessError) as exc:
        service.update_task(task, updated_by=task.created_by, knowledge_ids=[999])

    assert exc.value.code == ErrorCodes.INVALID_OPERATION
    assert '无法修改知识文档' in str(exc.value.message)


@pytest.mark.django_db
def test_update_task_blocks_quiz_edit_with_progress():
    """Test update_task raises error when editing quizzes with progress"""
    task = TaskFactory()
    assignment = TaskAssignmentFactory(task=task)
    task_knowledge = TaskKnowledgeFactory(task=task)
    KnowledgeLearningProgressFactory(
        assignment=assignment,
        task_knowledge=task_knowledge,
        is_completed=True
    )

    service = TaskService()

    with pytest.raises(BusinessError) as exc:
        service.update_task(task, updated_by=task.created_by, quiz_ids=[999])

    assert exc.value.code == ErrorCodes.INVALID_OPERATION
    assert '无法修改试卷' in str(exc.value.message)


@pytest.mark.django_db
def test_update_task_blocks_assignee_removal_with_progress():
    """Test update_task raises error when removing assignees with progress"""
    task = TaskFactory()
    assignment1 = TaskAssignmentFactory(task=task)
    assignment2 = TaskAssignmentFactory(task=task)
    task_knowledge = TaskKnowledgeFactory(task=task)
    KnowledgeLearningProgressFactory(
        assignment=assignment1,
        task_knowledge=task_knowledge,
        is_completed=True
    )

    service = TaskService()

    # Try to remove assignment2
    with pytest.raises(BusinessError) as exc:
        service.update_task(task, updated_by=task.created_by, assignee_ids=[assignment1.assignee_id])

    assert exc.value.code == ErrorCodes.INVALID_OPERATION
    assert '无法移除已分配的学员' in str(exc.value.message)


@pytest.mark.django_db
def test_update_task_allows_assignee_addition_with_progress():
    """Test update_task allows adding assignees even with progress"""
    task = TaskFactory()
    assignment = TaskAssignmentFactory(task=task)
    task_knowledge = TaskKnowledgeFactory(task=task)
    KnowledgeLearningProgressFactory(
        assignment=assignment,
        task_knowledge=task_knowledge,
        is_completed=True
    )

    new_user = UserFactory()
    service = TaskService()

    # Should succeed - adding new assignee
    result = service.update_task(
        task,
        updated_by=task.created_by,
        assignee_ids=[assignment.assignee_id, new_user.id]
    )

    assert result.assignments.count() == 2


@pytest.mark.django_db
def test_update_task_allows_basic_fields_with_progress():
    """Test update_task allows editing basic fields with progress"""
    task = TaskFactory()
    assignment = TaskAssignmentFactory(task=task)
    task_knowledge = TaskKnowledgeFactory(task=task)
    KnowledgeLearningProgressFactory(
        assignment=assignment,
        task_knowledge=task_knowledge,
        is_completed=True
    )

    service = TaskService()

    # Should succeed - editing basic fields
    result = service.update_task(
        task,
        updated_by=task.created_by,
        title="New Title",
        description="New Description"
    )

    assert result.title == "New Title"
    assert result.description == "New Description"
