import pytest
from unittest.mock import patch

from django.db.models.deletion import ProtectedError
from django.utils import timezone
from rest_framework.test import APIClient

from apps.authorization.models import Permission, RolePermission
from apps.knowledge.models import Knowledge, Tag
from apps.questions.models import Question
from apps.quizzes.models import Quiz, QuizQuestion
from apps.spot_checks.models import SpotCheck
from apps.submissions.models import Answer, Submission
from apps.tasks.models import Task, TaskAssignment, TaskKnowledge, TaskQuiz
from apps.users.models import Department, Role, User, UserRole


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def department():
    return Department.objects.create(name='测试部门', code='DEPT1')


@pytest.fixture
def admin_role():
    role, _ = Role.objects.get_or_create(code='ADMIN', defaults={'name': '管理员'})
    return role


@pytest.fixture
def admin_user(department, admin_role):
    user = User.objects.create_user(
        employee_id='ADMIN100',
        username='管理员A',
        password='password123',
        department=department,
    )
    UserRole.objects.create(user=user, role=admin_role)
    permission = Permission.objects.filter(code='user.delete').first()
    if permission:
        RolePermission.objects.get_or_create(role=admin_role, permission=permission)
    return user


@pytest.fixture
def inactive_user(department):
    return User.objects.create_user(
        employee_id='LEAVE100',
        username='离职用户',
        password='password123',
        department=department,
        is_active=False,
    )


@pytest.fixture
def active_user(department):
    return User.objects.create_user(
        employee_id='ACTIVE100',
        username='在职用户',
        password='password123',
        department=department,
        is_active=True,
    )


@pytest.mark.django_db
def test_delete_inactive_user_hard_deletes_related_data(api_client, admin_user, inactive_user, department):
    api_client.force_authenticate(user=admin_user)

    other_user = User.objects.create_user(
        employee_id='OTHER100',
        username='其他用户',
        password='password123',
        department=department,
    )

    line_tag = Tag.objects.create(name='条线A', tag_type='LINE', sort_order=1, is_active=True)

    knowledge = Knowledge.objects.create(
        title='离职用户知识',
        knowledge_type='OTHER',
        content='knowledge content',
        created_by=inactive_user,
        updated_by=inactive_user,
        line_tag=line_tag,
    )
    question = Question.objects.create(
        content='测试题目',
        question_type='SINGLE_CHOICE',
        options=[{'key': 'A', 'value': '选项A'}, {'key': 'B', 'value': '选项B'}],
        answer='A',
        created_by=inactive_user,
        updated_by=inactive_user,
        line_tag=line_tag,
    )
    quiz = Quiz.objects.create(
        title='离职用户试卷',
        quiz_type='PRACTICE',
        created_by=inactive_user,
        updated_by=inactive_user,
    )
    QuizQuestion.objects.create(quiz=quiz, question=question, order=1)

    shared_task = Task.objects.create(
        title='共享任务',
        description='由管理员创建',
        deadline=timezone.now() + timezone.timedelta(days=7),
        created_by=admin_user,
        updated_by=admin_user,
    )
    TaskKnowledge.objects.create(task=shared_task, knowledge=knowledge, order=1)
    TaskQuiz.objects.create(task=shared_task, quiz=quiz, order=1)

    shared_assignment = TaskAssignment.objects.create(
        task=shared_task,
        assignee=other_user,
        status='IN_PROGRESS',
    )
    submission = Submission.objects.create(
        task_assignment=shared_assignment,
        quiz=quiz,
        user=other_user,
        status='SUBMITTED',
    )
    answer = Answer.objects.create(
        submission=submission,
        question=question,
        user_answer='A',
        is_correct=True,
        obtained_score=1,
        graded_by=admin_user,
    )

    created_task = Task.objects.create(
        title='离职用户任务',
        description='由离职用户创建',
        deadline=timezone.now() + timezone.timedelta(days=3),
        created_by=inactive_user,
        updated_by=inactive_user,
    )
    own_assignment = TaskAssignment.objects.create(
        task=created_task,
        assignee=inactive_user,
        status='IN_PROGRESS',
    )

    spot_check_as_student = SpotCheck.objects.create(
        student=inactive_user,
        checker=admin_user,
        content='抽查A',
        score=90,
        checked_at=timezone.now(),
    )
    spot_check_as_checker = SpotCheck.objects.create(
        student=other_user,
        checker=inactive_user,
        content='抽查B',
        score=80,
        checked_at=timezone.now(),
    )

    response = api_client.delete(f'/api/users/{inactive_user.id}/')

    assert response.status_code == 204
    assert not User.objects.filter(id=inactive_user.id).exists()

    assert not Task.objects.filter(id=created_task.id).exists()
    assert not TaskAssignment.objects.filter(id=own_assignment.id).exists()

    assert not Knowledge.objects.filter(id=knowledge.id).exists()
    assert not Quiz.objects.filter(id=quiz.id).exists()
    assert not Question.objects.filter(id=question.id).exists()
    assert not Submission.objects.filter(id=submission.id).exists()
    assert not Answer.objects.filter(id=answer.id).exists()
    assert not SpotCheck.objects.filter(id=spot_check_as_student.id).exists()
    assert not SpotCheck.objects.filter(id=spot_check_as_checker.id).exists()

    assert not TaskKnowledge.objects.filter(task=shared_task).exists()
    assert not TaskQuiz.objects.filter(task=shared_task).exists()
    assert not QuizQuestion.objects.filter(quiz_id=quiz.id).exists()
    assert Task.objects.filter(id=shared_task.id).exists()
    assert TaskAssignment.objects.filter(id=shared_assignment.id).exists()


@pytest.mark.django_db
def test_delete_active_user_requires_deactivation_first(api_client, admin_user, active_user):
    api_client.force_authenticate(user=admin_user)

    response = api_client.delete(f'/api/users/{active_user.id}/')

    assert response.status_code == 400
    assert response.data['code'] == 'INVALID_OPERATION'
    assert '请先停用' in response.data['message']
    assert User.objects.filter(id=active_user.id).exists()


@pytest.mark.django_db
def test_delete_user_returns_business_error_when_unknown_protected_dependency_exists(
    api_client,
    admin_user,
    inactive_user,
):
    api_client.force_authenticate(user=admin_user)
    protected_task = Task.objects.create(
        title='受保护任务',
        description='用于模拟未知依赖',
        deadline=timezone.now() + timezone.timedelta(days=2),
        created_by=admin_user,
        updated_by=admin_user,
    )

    with patch.object(
        User,
        'delete',
        side_effect=ProtectedError('protected dependency', [protected_task]),
    ):
        response = api_client.delete(f'/api/users/{inactive_user.id}/')

    assert response.status_code == 400
    assert response.data['code'] == 'USER_HAS_DATA'
    assert '任务' in response.data['message']
