from types import SimpleNamespace
import pytest

from apps.tasks.models import Task
from apps.tasks.student_task_service import StudentTaskService
from apps.tasks.task_service import TaskService
from apps.tasks.tests.factories import (
    KnowledgeFactory,
    KnowledgeLearningProgressFactory,
    QuizFactory,
    SubmissionFactory,
    TaskAssignmentFactory,
    TaskFactory,
    TaskKnowledgeFactory,
    UserFactory,
)
from core.exceptions import BusinessError, ErrorCodes


def _build_request(user=None):
    return SimpleNamespace(user=user, META={})


@pytest.mark.django_db
def test_has_student_progress_no_progress():
    """Test has_student_progress returns False when no progress exists"""
    task = TaskFactory()
    TaskAssignmentFactory(task=task)

    service = TaskService(_build_request())
    result = task.has_student_progress

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

    service = TaskService(_build_request())
    result = task.has_student_progress

    assert result is True


@pytest.mark.django_db
def test_has_student_progress_with_quiz_submission():
    """Test has_student_progress returns True when quiz submission exists"""
    task = TaskFactory()
    assignment = TaskAssignmentFactory(task=task)
    SubmissionFactory(task_assignment=assignment)

    service = TaskService(_build_request())
    result = task.has_student_progress

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

    service = TaskService(_build_request())

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

    service = TaskService(_build_request())

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

    service = TaskService(_build_request())

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
    service = TaskService(_build_request())
    service._user = task.created_by

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

    service = TaskService(_build_request())
    service._user = task.created_by

    # Should succeed - editing basic fields
    result = service.update_task(
        task,
        updated_by=task.created_by,
        title="New Title",
        description="New Description"
    )

    assert result.title == "New Title"
    assert result.description == "New Description"


@pytest.mark.django_db
def test_get_task_queryset_for_mentor_filters_by_created_role(monkeypatch):
    """MENTOR 角色下只能看到自己以 MENTOR 角色创建的任务"""
    user = UserFactory()
    mentor_task = TaskFactory(created_by=user, created_role='MENTOR')
    TaskFactory(created_by=user, created_role='ADMIN')
    TaskFactory(created_role='MENTOR')

    service = TaskService(_build_request())
    service._user = user
    monkeypatch.setattr(service, 'get_current_role', lambda: 'MENTOR')

    task_ids = set(service.get_task_queryset_for_user().values_list('id', flat=True))
    assert mentor_task.id in task_ids
    assert len(task_ids) == 1


@pytest.mark.django_db
def test_check_task_read_permission_denies_cross_role_task(monkeypatch):
    """同一用户跨角色访问自己创建的任务应被拒绝"""
    user = UserFactory()
    admin_task = TaskFactory(created_by=user, created_role='ADMIN')
    service = TaskService(_build_request())
    service._user = user
    monkeypatch.setattr(service, 'get_current_role', lambda: 'MENTOR')

    with pytest.raises(BusinessError) as exc:
        service.check_task_read_permission(admin_task)

    assert exc.value.code == ErrorCodes.PERMISSION_DENIED


@pytest.mark.django_db
def test_admin_creator_side_filter_management(monkeypatch):
    """ADMIN 可按 creator_side=management 过滤管理端任务"""
    admin_user = UserFactory()
    management_task = TaskFactory(created_role='ADMIN')
    TaskFactory(created_role='MENTOR')
    non_management_task = TaskFactory(created_role='STUDENT')

    service = TaskService(_build_request())
    service._user = admin_user
    monkeypatch.setattr(service, 'get_current_role', lambda: 'ADMIN')

    queryset = service.get_task_queryset_for_user()
    filtered = service.filter_task_queryset_by_creator_side(queryset, 'management')
    filtered_ids = set(filtered.values_list('id', flat=True))

    assert management_task.id in filtered_ids
    assert non_management_task.id not in filtered_ids


@pytest.mark.django_db
def test_admin_creator_side_filter_non_management(monkeypatch):
    """ADMIN 可按 creator_side=non_management 过滤非管理端任务"""
    admin_user = UserFactory()
    management_task = TaskFactory(created_role='ADMIN')
    non_management_task = TaskFactory(created_role='STUDENT')

    service = TaskService(_build_request())
    service._user = admin_user
    monkeypatch.setattr(service, 'get_current_role', lambda: 'ADMIN')

    queryset = service.get_task_queryset_for_user()
    filtered = service.filter_task_queryset_by_creator_side(queryset, 'non_management')
    filtered_ids = set(filtered.values_list('id', flat=True))

    assert management_task.id not in filtered_ids
    assert non_management_task.id in filtered_ids


@pytest.mark.django_db
def test_admin_creator_side_filter_non_management_includes_mentor(monkeypatch):
    """非管理端应包含 MENTOR 角色创建的任务"""
    admin_user = UserFactory()
    mentor_task = TaskFactory(created_role='MENTOR')

    service = TaskService(_build_request())
    service._user = admin_user
    monkeypatch.setattr(service, 'get_current_role', lambda: 'ADMIN')

    queryset = service.get_task_queryset_for_user()
    filtered = service.filter_task_queryset_by_creator_side(queryset, 'non_management')
    filtered_ids = set(filtered.values_list('id', flat=True))

    assert mentor_task.id in filtered_ids


@pytest.mark.django_db
def test_admin_creator_side_filter_invalid_value_raises(monkeypatch):
    """ADMIN 传非法 creator_side 参数时抛 INVALID_INPUT"""
    admin_user = UserFactory()
    service = TaskService(_build_request())
    service._user = admin_user
    monkeypatch.setattr(service, 'get_current_role', lambda: 'ADMIN')

    with pytest.raises(BusinessError) as exc:
        service.filter_task_queryset_by_creator_side(Task.objects.all(), 'invalid')

    assert exc.value.code == ErrorCodes.INVALID_INPUT


@pytest.mark.django_db
def test_validate_assignee_ids_rejects_non_student_identity():
    """分配目标必须具备学员身份（STUDENT 角色）"""
    student_user = UserFactory()
    super_admin_user = UserFactory(is_superuser=True, is_staff=True)

    is_valid, invalid_ids = TaskService.validate_assignee_ids(
        [student_user.id, super_admin_user.id]
    )

    assert not is_valid
    assert super_admin_user.id in invalid_ids
    assert student_user.id not in invalid_ids


@pytest.mark.django_db
def test_validate_knowledge_ids_accepts_current_version():
    """当前知识版本应允许绑定任务。"""
    current = KnowledgeFactory(is_current=True)

    is_valid, invalid_ids = TaskService.validate_knowledge_ids([current.id])

    assert is_valid is True
    assert invalid_ids == []


@pytest.mark.django_db
def test_validate_knowledge_ids_rejects_historical_version():
    """任务只允许绑定知识当前版本。"""
    current = KnowledgeFactory(version_number=2, is_current=True)
    historical = KnowledgeFactory(
        resource_uuid=current.resource_uuid,
        version_number=1,
        is_current=False,
    )

    is_valid, invalid_ids = TaskService.validate_knowledge_ids([historical.id, current.id])

    assert is_valid is False
    assert historical.id in invalid_ids
    assert current.id not in invalid_ids


@pytest.mark.django_db
def test_validate_quiz_ids_rejects_historical_version():
    """任务只允许绑定试卷当前版本。"""
    user = UserFactory()
    current = QuizFactory(created_by=user, updated_by=user, version_number=2, is_current=True)
    historical = QuizFactory(
        created_by=user,
        updated_by=user,
        resource_uuid=current.resource_uuid,
        version_number=1,
        is_current=False,
    )

    is_valid, invalid_ids = TaskService.validate_quiz_ids([historical.id, current.id])

    assert is_valid is False
    assert historical.id in invalid_ids
    assert current.id not in invalid_ids


@pytest.mark.django_db
def test_create_knowledge_associations_binds_only_current_version_once():
    """任务知识绑定按 resource_uuid 去重，且忽略历史版本。"""
    task = TaskFactory()
    current = KnowledgeFactory(version_number=2, is_current=True)
    historical = KnowledgeFactory(
        resource_uuid=current.resource_uuid,
        version_number=1,
        is_current=False,
    )
    service = TaskService(_build_request())

    service._create_knowledge_associations(task, [historical.id, current.id, historical.id, current.id])

    task.refresh_from_db()
    bound_ids = list(task.task_knowledge.order_by('order').values_list('knowledge_id', flat=True))
    assert bound_ids == [current.id]


@pytest.mark.django_db
def test_create_quiz_associations_binds_only_current_version_once():
    """任务试卷绑定按 resource_uuid 去重，且忽略历史版本。"""
    user = UserFactory()
    task = TaskFactory()
    current = QuizFactory(created_by=user, updated_by=user, version_number=2, is_current=True)
    historical = QuizFactory(
        created_by=user,
        updated_by=user,
        resource_uuid=current.resource_uuid,
        version_number=1,
        is_current=False,
    )
    service = TaskService(_build_request())

    service._create_quiz_associations(task, [historical.id, current.id, historical.id, current.id])

    task.refresh_from_db()
    bound_ids = list(task.task_quizzes.order_by('order').values_list('quiz_id', flat=True))
    assert bound_ids == [current.id]


@pytest.mark.django_db
def test_complete_knowledge_learning_accepts_locked_task_knowledge_version():
    """学生完成学习应基于 task_knowledge_id，而不是当前知识版本。"""
    assignee = UserFactory()
    task = TaskFactory()
    assignment = TaskAssignmentFactory(task=task, assignee=assignee, status='IN_PROGRESS')
    locked_knowledge = KnowledgeFactory(is_current=False)
    task_knowledge = TaskKnowledgeFactory(task=task, knowledge=locked_knowledge)

    service = StudentTaskService(_build_request(user=assignee))
    progress = service.complete_knowledge_learning(assignment, task_knowledge.id)

    assert progress.task_knowledge_id == task_knowledge.id
    assert progress.is_completed is True
