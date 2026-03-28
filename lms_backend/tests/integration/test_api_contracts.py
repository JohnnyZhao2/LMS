from datetime import datetime

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.authorization.models import Permission, RolePermission
from apps.activity_logs.models import ContentLog, OperationLog, UserLog
from apps.knowledge.models import Knowledge, Tag
from apps.questions.models import Question
from apps.quizzes.models import Quiz
from apps.spot_checks.models import SpotCheck
from apps.submissions.models import Submission
from apps.tasks.models import Task, TaskAssignment, TaskQuiz
from apps.users.models import Department, Role, User, UserRole


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def department():
    return Department.objects.create(name='契约测试部门', code='CONTRACT_DEPT')


def _grant_role_permissions(role, permission_codes):
    permissions = Permission.objects.filter(code__in=permission_codes)
    for permission in permissions:
        RolePermission.objects.get_or_create(role=role, permission=permission)


@pytest.fixture
def mentor_role():
    role, _ = Role.objects.get_or_create(code='MENTOR', defaults={'name': '导师'})
    _grant_role_permissions(
        role,
        [
            'question.view',
            'question.create',
            'question.update',
            'question.delete',
            'quiz.view',
            'quiz.create',
            'quiz.update',
            'quiz.delete',
            'task.view',
            'task.create',
            'task.update',
            'task.delete',
            'task.assign',
            'task.analytics.view',
            'spot_check.view',
            'spot_check.create',
            'spot_check.update',
            'spot_check.delete',
            'grading.view',
            'grading.score',
            'knowledge.view',
        ],
    )
    return role


@pytest.fixture
def admin_role():
    role, _ = Role.objects.get_or_create(code='ADMIN', defaults={'name': '管理员'})
    _grant_role_permissions(
        role,
        [
            'knowledge.view',
            'knowledge.create',
            'knowledge.update',
            'knowledge.delete',
            'user.view',
            'activity_log.view',
        ],
    )
    return role


@pytest.fixture
def mentor_user(department, mentor_role):
    user = User.objects.create_user(
        employee_id='CONTRACT_MENTOR_001',
        username='契约测试导师',
        password='password123',
        department=department,
    )
    UserRole.objects.get_or_create(user=user, role=mentor_role)
    return user


@pytest.fixture
def admin_user(department, admin_role):
    user = User.objects.create_user(
        employee_id='CONTRACT_ADMIN_001',
        username='契约测试管理员',
        password='password123',
        department=department,
    )
    UserRole.objects.get_or_create(user=user, role=admin_role)
    return user


@pytest.fixture
def student_user(department, mentor_user):
    return User.objects.create_user(
        employee_id='CONTRACT_STUDENT_001',
        username='契约测试学员',
        password='password123',
        department=department,
        mentor=mentor_user,
    )


@pytest.fixture
def line_tag():
    return Tag.objects.create(
        name='契约测试条线',
        tag_type='LINE',
        sort_order=1,
        is_active=True,
    )


@pytest.fixture
def sample_question(mentor_user, line_tag):
    question = Question.objects.create(
        content='契约测试题目',
        question_type='SINGLE_CHOICE',
        options=[
            {'key': 'A', 'value': '选项A'},
            {'key': 'B', 'value': '选项B'},
        ],
        answer='A',
        score=1,
        created_by=mentor_user,
        updated_by=mentor_user,
        line_tag=line_tag,
    )
    return question


@pytest.fixture
def sample_quiz(mentor_user):
    return Quiz.objects.create(
        title='契约测试试卷',
        quiz_type='PRACTICE',
        created_by=mentor_user,
        updated_by=mentor_user,
    )


@pytest.fixture
def sample_exam_quiz(mentor_user):
    return Quiz.objects.create(
        title='契约测试考试',
        quiz_type='EXAM',
        created_by=mentor_user,
        updated_by=mentor_user,
    )


@pytest.fixture
def sample_knowledge(mentor_user, line_tag):
    return Knowledge.objects.create(
        title='契约测试知识',
        content='契约测试正文内容',
        created_by=mentor_user,
        updated_by=mentor_user,
        is_current=True,
        line_tag=line_tag,
    )


@pytest.fixture
def student_assignment(student_user, mentor_user):
    task = Task.objects.create(
        title='契约测试任务',
        description='用于任务列表契约测试',
        deadline=timezone.now() + timezone.timedelta(days=3),
        created_by=mentor_user,
        updated_by=mentor_user,
    )
    return TaskAssignment.objects.create(
        task=task,
        assignee=student_user,
        status='IN_PROGRESS',
    )


@pytest.fixture
def practice_task_quiz(student_assignment, sample_quiz):
    TaskQuiz.objects.get_or_create(
        task=student_assignment.task,
        quiz=sample_quiz,
        defaults={'order': 1},
    )
    return sample_quiz


@pytest.fixture
def exam_task_quiz(student_assignment, sample_exam_quiz):
    TaskQuiz.objects.get_or_create(
        task=student_assignment.task,
        quiz=sample_exam_quiz,
        defaults={'order': 2},
    )
    return sample_exam_quiz


@pytest.fixture
def in_progress_submission(student_assignment, practice_task_quiz):
    return Submission.objects.create(
        task_assignment=student_assignment,
        quiz=practice_task_quiz,
        user=student_assignment.assignee,
        status='IN_PROGRESS',
    )


@pytest.fixture
def submitted_practice_submission(student_assignment, practice_task_quiz):
    return Submission.objects.create(
        task_assignment=student_assignment,
        quiz=practice_task_quiz,
        user=student_assignment.assignee,
        status='GRADED',
        submitted_at=timezone.now(),
    )


@pytest.fixture
def submitted_exam_submission(student_assignment, exam_task_quiz):
    return Submission.objects.create(
        task_assignment=student_assignment,
        quiz=exam_task_quiz,
        user=student_assignment.assignee,
        status='GRADED',
        submitted_at=timezone.now(),
    )


@pytest.fixture
def sample_spot_check(student_user, mentor_user):
    return SpotCheck.objects.create(
        student=student_user,
        checker=mentor_user,
        content='契约测试抽查',
        score=88,
        comment='表现稳定',
        checked_at=timezone.now(),
    )


@pytest.mark.django_db
class TestQuestionApiContracts:
    def test_question_list_response_is_wrapped(self, api_client, mentor_user, sample_question):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/questions/?page=1&page_size=10')

        assert response.status_code == 200, response.data
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert 'data' in response.data
        assert 'results' in response.data['data']
        result_ids = [item['id'] for item in response.data['data']['results']]
        assert sample_question.id in result_ids

    def test_question_list_rejects_invalid_created_by(self, api_client, mentor_user):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/questions/?created_by=not-an-int')

        assert response.status_code == 400
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert 'created_by' in response.data['message']

    def test_question_list_rejects_invalid_line_tag_id(self, api_client, mentor_user):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/questions/?line_tag_id=0')

        assert response.status_code == 400
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert 'line_tag_id' in response.data['message']

    def test_question_create_allows_missing_line_tag(self, api_client, mentor_user):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.post(
            '/api/questions/',
            {
                'content': '无条线题目',
                'question_type': 'SINGLE_CHOICE',
                'options': [
                    {'key': 'A', 'value': '选项A'},
                    {'key': 'B', 'value': '选项B'},
                ],
                'answer': 'A',
                'score': '1',
            },
            format='json',
        )

        assert response.status_code == 201, response.data
        assert response.data['code'] == 'SUCCESS'
        assert response.data['data']['line_tag'] is None

    def test_question_patch_allows_clearing_line_tag(self, api_client, mentor_user, sample_question):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.patch(
            f'/api/questions/{sample_question.id}/',
            {'line_tag_id': None},
            format='json',
        )

        assert response.status_code == 200, response.data
        assert response.data['code'] == 'SUCCESS'
        assert response.data['data']['line_tag'] is None

        sample_question.refresh_from_db()
        assert sample_question.is_current is False

        current_question = Question.objects.get(
            resource_uuid=sample_question.resource_uuid,
            is_current=True,
        )
        assert current_question.line_tag_id is None


@pytest.mark.django_db
class TestAuthApiContracts:
    def test_login_response_is_wrapped(self, api_client, student_user):
        response = api_client.post(
            '/api/auth/login/',
            {
                'employee_id': student_user.employee_id,
                'password': 'password123',
            },
            format='json',
        )

        assert response.status_code == 200, response.data
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert 'data' in response.data
        assert 'access_token' in response.data['data']
        assert 'refresh_token' in response.data['data']

    def test_login_rejects_missing_employee_id(self, api_client):
        response = api_client.post(
            '/api/auth/login/',
            {'password': 'password123'},
            format='json',
        )

        assert response.status_code == 400
        assert response.data['code'] == 'ERROR'
        assert 'employee_id' in str(response.data['message'])

    def test_refresh_response_is_wrapped(self, api_client, student_user):
        login_response = api_client.post(
            '/api/auth/login/',
            {
                'employee_id': student_user.employee_id,
                'password': 'password123',
            },
            format='json',
        )
        refresh_token = login_response.data['data']['refresh_token']

        response = api_client.post(
            '/api/auth/refresh/',
            {'refresh_token': refresh_token},
            format='json',
        )

        assert response.status_code == 200, response.data
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert 'access_token' in response.data['data']
        assert 'refresh_token' in response.data['data']

    def test_me_response_is_wrapped(self, api_client, student_user):
        api_client.force_authenticate(user=student_user)
        response = api_client.get('/api/auth/me/')

        assert response.status_code == 200, response.data
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert response.data['data']['user']['id'] == student_user.id


@pytest.mark.django_db
class TestQuizApiContracts:
    def test_quiz_list_response_is_wrapped(self, api_client, mentor_user, sample_quiz):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/quizzes/?page=1&page_size=10')

        assert response.status_code == 200, response.data
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert 'data' in response.data
        assert 'results' in response.data['data']
        result_ids = [item['id'] for item in response.data['data']['results']]
        assert sample_quiz.id in result_ids

    def test_quiz_list_rejects_invalid_created_by(self, api_client, mentor_user):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/quizzes/?created_by=invalid')

        assert response.status_code == 400
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert 'created_by' in response.data['message']


@pytest.mark.django_db
class TestTagApiContracts:
    def test_tag_list_response_is_wrapped(self, api_client, mentor_user, line_tag):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/knowledge/tags/?tag_type=LINE')

        assert response.status_code == 200, response.data
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert isinstance(response.data['data'], list)
        result_ids = [item['id'] for item in response.data['data']]
        assert line_tag.id in result_ids

    def test_tag_list_rejects_invalid_limit(self, api_client, mentor_user):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/knowledge/tags/?limit=bad')

        assert response.status_code == 400
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert 'limit' in response.data['message']

    def test_tag_list_rejects_invalid_active_only(self, api_client, mentor_user):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/knowledge/tags/?active_only=maybe')

        assert response.status_code == 400
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert 'active_only' in response.data['message']

    def test_tag_delete_detaches_linked_knowledge_and_question(
        self,
        api_client,
        admin_user,
        line_tag,
        sample_knowledge,
        sample_question,
    ):
        api_client.force_authenticate(user=admin_user)

        response = api_client.delete(f'/api/knowledge/tags/{line_tag.id}/')

        assert response.status_code == 200, response.data
        assert response.data['code'] == 'SUCCESS'
        assert not Tag.objects.filter(id=line_tag.id).exists()

        sample_knowledge.refresh_from_db()
        sample_question.refresh_from_db()
        assert sample_knowledge.line_tag_id is None
        assert sample_question.line_tag_id is None


@pytest.mark.django_db
class TestKnowledgeApiContracts:
    def test_knowledge_list_response_is_wrapped(self, api_client, mentor_user, sample_knowledge):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/knowledge/?page=1&page_size=10')

        assert response.status_code == 200, response.data
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert 'data' in response.data
        assert 'results' in response.data['data']
        result_ids = [item['id'] for item in response.data['data']['results']]
        assert sample_knowledge.id in result_ids

    def test_knowledge_list_rejects_invalid_line_tag_id(self, api_client, mentor_user):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/knowledge/?line_tag_id=bad')

        assert response.status_code == 400
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert 'line_tag_id' in response.data['message']

    def test_knowledge_detail_response_is_wrapped(self, api_client, mentor_user, sample_knowledge):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.get(f'/api/knowledge/{sample_knowledge.id}/')

        assert response.status_code == 200, response.data
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert response.data['data']['id'] == sample_knowledge.id

    def test_knowledge_increment_view_count_response_is_wrapped(self, api_client, mentor_user, sample_knowledge):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.post(f'/api/knowledge/{sample_knowledge.id}/view/')

        assert response.status_code == 200
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert response.data['data']['view_count'] >= 1

    def test_knowledge_delete_hard_deletes_record(self, api_client, admin_user, sample_knowledge):
        api_client.force_authenticate(user=admin_user)
        response = api_client.delete(f'/api/knowledge/{sample_knowledge.id}/')

        assert response.status_code == 200
        assert response.data['code'] == 'SUCCESS'
        assert not Knowledge.objects.filter(id=sample_knowledge.id).exists()

    def test_knowledge_create_allows_missing_title(self, api_client, admin_user, line_tag):
        api_client.force_authenticate(user=admin_user)
        response = api_client.post(
            '/api/knowledge/',
            {
                'line_tag_id': line_tag.id,
                'content': '<p>无标题正文内容</p>',
            },
            format='json',
        )

        assert response.status_code == 201, response.data
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == '创建成功'
        assert response.data['data']['title'] == ''

    def test_knowledge_create_allows_missing_line_tag(self, api_client, admin_user):
        api_client.force_authenticate(user=admin_user)
        response = api_client.post(
            '/api/knowledge/',
            {
                'content': '<p>无条线正文内容</p>',
            },
            format='json',
        )

        assert response.status_code == 201, response.data
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == '创建成功'
        assert response.data['data']['line_tag'] is None

    def test_knowledge_create_rejects_empty_content(self, api_client, admin_user):
        api_client.force_authenticate(user=admin_user)
        response = api_client.post(
            '/api/knowledge/',
            {
                'title': '仅标题',
                'line_tag_id': None,
            },
            format='json',
        )

        assert response.status_code == 400, response.data
        assert response.data['code'] == 'ERROR'
        assert 'content' in response.data['message']

    def test_knowledge_patch_allows_blank_title(self, api_client, admin_user, sample_knowledge):
        api_client.force_authenticate(user=admin_user)
        response = api_client.patch(
            f'/api/knowledge/{sample_knowledge.id}/',
            {'title': ''},
            format='json',
        )

        assert response.status_code == 200, response.data
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert response.data['data']['title'] == ''

    def test_knowledge_patch_only_tags_inherits_unprovided_line_tag(
        self,
        api_client,
        admin_user,
        sample_knowledge,
    ):
        source_tag = Tag.objects.create(
            name='契约测试标签源',
            tag_type='TAG',
            sort_order=2,
            is_active=True,
        )
        target_tag = Tag.objects.create(
            name='契约测试标签新',
            tag_type='TAG',
            sort_order=1,
            is_active=True,
        )
        sample_knowledge.tags.set([source_tag.id])

        api_client.force_authenticate(user=admin_user)
        response = api_client.patch(
            f'/api/knowledge/{sample_knowledge.id}/',
            {'tag_ids': [target_tag.id]},
            format='json'
        )

        assert response.status_code == 200, response.data
        data = response.data['data']
        assert data['line_tag']['id'] == sample_knowledge.line_tag_id
        assert {item['id'] for item in data['tags']} == {target_tag.id}

        sample_knowledge.refresh_from_db()
        assert sample_knowledge.is_current is False
        assert Knowledge.objects.filter(
            resource_uuid=sample_knowledge.resource_uuid,
            is_current=True
        ).count() == 1

    def test_knowledge_patch_only_line_tag_inherits_unprovided_tags(
        self,
        api_client,
        admin_user,
        sample_knowledge,
        line_tag,
    ):
        source_tag = Tag.objects.create(
            name='契约测试标签保留',
            tag_type='TAG',
            sort_order=1,
            is_active=True,
        )
        target_line_tag = Tag.objects.create(
            name='契约测试条线新',
            tag_type='LINE',
            sort_order=3,
            is_active=True,
        )
        sample_knowledge.tags.set([source_tag.id])

        api_client.force_authenticate(user=admin_user)
        response = api_client.patch(
            f'/api/knowledge/{sample_knowledge.id}/',
            {'line_tag_id': target_line_tag.id},
            format='json'
        )

        assert response.status_code == 200, response.data
        data = response.data['data']
        assert data['line_tag']['id'] == target_line_tag.id
        assert {item['id'] for item in data['tags']} == {source_tag.id}

        sample_knowledge.refresh_from_db()
        assert sample_knowledge.is_current is False
        assert Knowledge.objects.filter(
            resource_uuid=sample_knowledge.resource_uuid,
            is_current=True
        ).count() == 1

    def test_knowledge_patch_only_related_links_inherits_existing_content(
        self,
        api_client,
        admin_user,
        sample_knowledge,
    ):
        api_client.force_authenticate(user=admin_user)
        response = api_client.patch(
            f'/api/knowledge/{sample_knowledge.id}/',
            {
                'related_links': [
                    {
                        'title': '知识补充资料',
                        'url': 'https://example.com/docs',
                    },
                ],
            },
            format='json'
        )

        assert response.status_code == 200, response.data
        data = response.data['data']
        assert data['content'] == sample_knowledge.content
        assert data['related_links'] == [
            {
                'title': '知识补充资料',
                'url': 'https://example.com/docs',
            },
        ]


@pytest.mark.django_db
class TestStudentTaskApiContracts:
    def test_student_assignment_list_response_is_wrapped(self, api_client, student_user, student_assignment):
        api_client.force_authenticate(user=student_user)
        response = api_client.get('/api/tasks/my-assignments/?page=1&page_size=10')

        assert response.status_code == 200
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert 'data' in response.data
        assert 'results' in response.data['data']
        assert 'count' in response.data['data']
        task_ids = [item['task_id'] for item in response.data['data']['results']]
        assert student_assignment.task_id in task_ids

    def test_student_assignment_list_rejects_invalid_page(self, api_client, student_user):
        api_client.force_authenticate(user=student_user)
        response = api_client.get('/api/tasks/my-assignments/?page=abc')

        assert response.status_code == 400
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert 'page' in response.data['message']

    def test_student_assignment_list_rejects_invalid_page_size(self, api_client, student_user):
        api_client.force_authenticate(user=student_user)
        response = api_client.get('/api/tasks/my-assignments/?page_size=999')

        assert response.status_code == 400
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert 'page_size' in response.data['message']


@pytest.mark.django_db
class TestTaskListApiContracts:
    def test_task_list_response_is_wrapped(self, api_client, student_user, student_assignment):
        api_client.force_authenticate(user=student_user)
        response = api_client.get('/api/tasks/?status=open&page=1&page_size=10')

        assert response.status_code == 200
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert 'data' in response.data
        assert 'results' in response.data['data']
        task_ids = [item['id'] for item in response.data['data']['results']]
        assert student_assignment.task_id in task_ids

    def test_task_list_rejects_invalid_status(self, api_client, student_user):
        api_client.force_authenticate(user=student_user)
        response = api_client.get('/api/tasks/?status=unknown')

        assert response.status_code == 400
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert 'status' in response.data['message']

    def test_task_list_status_closed_filters_by_deadline(self, api_client, student_user, mentor_user, student_assignment):
        expired_task = Task.objects.create(
            title='已截止任务',
            description='用于验证按截止时间筛选',
            deadline=timezone.now() - timezone.timedelta(days=1),
            created_by=mentor_user,
            updated_by=mentor_user,
        )
        TaskAssignment.objects.create(
            task=expired_task,
            assignee=student_user,
            status='IN_PROGRESS',
        )

        api_client.force_authenticate(user=student_user)
        response = api_client.get('/api/tasks/?status=closed&page=1&page_size=10')

        assert response.status_code == 200
        result_ids = [item['id'] for item in response.data['data']['results']]
        assert expired_task.id in result_ids
        assert student_assignment.task_id not in result_ids


@pytest.mark.django_db
class TestUserManagementApiContracts:
    def test_user_list_response_is_wrapped(self, api_client, admin_user, student_user):
        api_client.force_authenticate(user=admin_user)
        response = api_client.get('/api/users/?is_active=true')

        assert response.status_code == 200
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert isinstance(response.data['data'], list)
        assert response.data['data'][0]['avatar_key'] == student_user.avatar_key
        user_ids = [item['id'] for item in response.data['data']]
        assert admin_user.id in user_ids
        assert student_user.id in user_ids

    def test_user_list_rejects_invalid_is_active(self, api_client, admin_user):
        api_client.force_authenticate(user=admin_user)
        response = api_client.get('/api/users/?is_active=maybe')

        assert response.status_code == 400
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert 'is_active' in response.data['message']

    def test_user_list_rejects_invalid_department_id(self, api_client, admin_user):
        api_client.force_authenticate(user=admin_user)
        response = api_client.get('/api/users/?department_id=oops')

        assert response.status_code == 400
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert 'department_id' in response.data['message']


@pytest.mark.django_db
class TestAssignableUserApiContracts:
    def test_assignable_user_list_response_is_wrapped(self, api_client, mentor_user, student_user):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/tasks/assignable-users/')

        assert response.status_code == 200
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert isinstance(response.data['data'], list)
        result_ids = [item['id'] for item in response.data['data']]
        assert student_user.id in result_ids

    def test_assignable_user_list_rejects_invalid_department_id(self, api_client, mentor_user):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/tasks/assignable-users/?department_id=bad')

        assert response.status_code == 400
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert 'department_id' in response.data['message']


@pytest.mark.django_db
class TestSpotCheckApiContracts:
    def test_spot_check_create_response_is_wrapped(self, api_client, mentor_user, student_user):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.post(
            '/api/spot-checks/',
            {
                'student': student_user.id,
                'content': '新建抽查',
                'score': '91.5',
                'comment': '创建成功',
                'checked_at': timezone.now().isoformat(),
            },
            format='json',
        )

        assert response.status_code == 201
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == '创建成功'
        assert 'data' in response.data
        assert response.data['data']['student'] == student_user.id

    def test_spot_check_list_response_is_wrapped(self, api_client, mentor_user, sample_spot_check):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/spot-checks/?page=1&page_size=10')

        assert response.status_code == 200
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert 'data' in response.data
        assert 'results' in response.data['data']
        result_ids = [item['id'] for item in response.data['data']['results']]
        assert sample_spot_check.id in result_ids
        result = next(item for item in response.data['data']['results'] if item['id'] == sample_spot_check.id)
        assert result['student_avatar_key'] == sample_spot_check.student.avatar_key
        assert result['checker_avatar_key'] == sample_spot_check.checker.avatar_key

    def test_spot_check_list_rejects_invalid_student_id(self, api_client, mentor_user):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/spot-checks/?student_id=bad')

        assert response.status_code == 400
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert 'student_id' in response.data['message']

    def test_spot_check_detail_response_is_wrapped(self, api_client, mentor_user, sample_spot_check):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.get(f'/api/spot-checks/{sample_spot_check.id}/')

        assert response.status_code == 200
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert response.data['data']['id'] == sample_spot_check.id
        assert response.data['data']['student_avatar_key'] == sample_spot_check.student.avatar_key
        assert response.data['data']['checker_avatar_key'] == sample_spot_check.checker.avatar_key

    def test_spot_check_patch_response_is_wrapped(self, api_client, mentor_user, sample_spot_check):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.patch(
            f'/api/spot-checks/{sample_spot_check.id}/',
            {'comment': '已更新评语'},
            format='json',
        )

        assert response.status_code == 200
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert response.data['data']['comment'] == '已更新评语'


@pytest.mark.django_db
class TestSubmissionApiContracts:
    def test_start_quiz_response_is_wrapped(
        self,
        api_client,
        student_user,
        student_assignment,
        practice_task_quiz,
    ):
        api_client.force_authenticate(user=student_user)
        response = api_client.post(
            '/api/submissions/start/',
            {
                'assignment_id': student_assignment.id,
                'quiz_id': practice_task_quiz.id,
            },
            format='json',
        )

        assert response.status_code == 201
        assert response.data['code'] == 'SUCCESS'
        assert 'data' in response.data
        assert response.data['data']['task_title'] == student_assignment.task.title

    def test_submit_response_is_wrapped(self, api_client, student_user, in_progress_submission):
        api_client.force_authenticate(user=student_user)
        response = api_client.post(f'/api/submissions/{in_progress_submission.id}/submit/')

        assert response.status_code == 200
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert response.data['data']['id'] == in_progress_submission.id

    def test_save_answer_rejects_invalid_question_id(self, api_client, student_user, in_progress_submission):
        api_client.force_authenticate(user=student_user)
        response = api_client.post(
            f'/api/submissions/{in_progress_submission.id}/save-answer/',
            {'question_id': 999999, 'user_answer': 'A'},
            format='json',
        )

        assert response.status_code == 400
        assert response.data['code'] == 'ERROR'
        assert 'question_id' in str(response.data['message'])

    def test_practice_result_response_is_wrapped(self, api_client, student_user, submitted_practice_submission):
        api_client.force_authenticate(user=student_user)
        response = api_client.get(f'/api/submissions/{submitted_practice_submission.id}/result/')

        assert response.status_code == 200
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert response.data['data']['id'] == submitted_practice_submission.id

    def test_exam_result_response_is_wrapped(self, api_client, student_user, submitted_exam_submission):
        api_client.force_authenticate(user=student_user)
        response = api_client.get(f'/api/submissions/exam/{submitted_exam_submission.id}/result/')

        assert response.status_code == 200
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert response.data['data']['id'] == submitted_exam_submission.id

    def test_practice_result_rejects_in_progress_submission(self, api_client, student_user, in_progress_submission):
        api_client.force_authenticate(user=student_user)
        response = api_client.get(f'/api/submissions/{in_progress_submission.id}/result/')

        assert response.status_code == 400
        assert response.data['code'] == 'INVALID_OPERATION'
        assert '尚未提交' in response.data['message']


@pytest.mark.django_db
class TestTaskAnalyticsApiContracts:
    def _create_mentor_task(self, mentor_user, student_user):
        task = Task.objects.create(
            title='任务分析契约测试',
            description='用于任务分析接口契约测试',
            deadline=timezone.now() + timezone.timedelta(days=3),
            created_role='MENTOR',
            created_by=mentor_user,
            updated_by=mentor_user,
        )
        TaskAssignment.objects.create(
            task=task,
            assignee=student_user,
            status='IN_PROGRESS',
        )
        return task

    def test_task_analytics_response_is_wrapped(self, api_client, mentor_user, student_user):
        task = self._create_mentor_task(mentor_user, student_user)
        mentor = User.objects.get(pk=mentor_user.pk)
        mentor.current_role = 'MENTOR'
        api_client.force_authenticate(user=mentor)
        response = api_client.get(
            f'/api/tasks/{task.id}/analytics/',
            HTTP_X_CURRENT_ROLE='MENTOR',
        )

        assert response.status_code == 200
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert 'completion' in response.data['data']
        assert 'accuracy' in response.data['data']
        assert 'time_distribution' in response.data['data']

    def test_student_executions_response_is_wrapped(self, api_client, mentor_user, student_user):
        task = self._create_mentor_task(mentor_user, student_user)
        mentor = User.objects.get(pk=mentor_user.pk)
        mentor.current_role = 'MENTOR'
        api_client.force_authenticate(user=mentor)
        response = api_client.get(
            f'/api/tasks/{task.id}/student-executions/',
            HTTP_X_CURRENT_ROLE='MENTOR',
        )

        assert response.status_code == 200
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert isinstance(response.data['data'], list)


@pytest.mark.django_db
class TestGradingApiContracts:
    def _create_mentor_task(self, mentor_user, student_user):
        task = Task.objects.create(
            title='阅卷契约测试任务',
            description='用于阅卷接口契约测试',
            deadline=timezone.now() + timezone.timedelta(days=3),
            created_role='MENTOR',
            created_by=mentor_user,
            updated_by=mentor_user,
        )
        TaskAssignment.objects.create(
            task=task,
            assignee=student_user,
            status='IN_PROGRESS',
        )
        return task

    def test_grading_questions_rejects_missing_quiz_id(self, api_client, mentor_user, student_user):
        task = self._create_mentor_task(mentor_user, student_user)
        mentor = User.objects.get(pk=mentor_user.pk)
        mentor.current_role = 'MENTOR'
        api_client.force_authenticate(user=mentor)
        response = api_client.get(
            f'/api/grading/tasks/{task.id}/questions/',
            HTTP_X_CURRENT_ROLE='MENTOR',
        )

        assert response.status_code == 400
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert 'quiz_id' in response.data['message']

    def test_grading_answers_rejects_invalid_question_id(self, api_client, mentor_user, student_user):
        task = self._create_mentor_task(mentor_user, student_user)
        mentor = User.objects.get(pk=mentor_user.pk)
        mentor.current_role = 'MENTOR'
        api_client.force_authenticate(user=mentor)
        response = api_client.get(
            f'/api/grading/tasks/{task.id}/answers/?quiz_id=1&question_id=bad',
            HTTP_X_CURRENT_ROLE='MENTOR',
        )

        assert response.status_code == 400
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert 'question_id' in response.data['message']


@pytest.mark.django_db
class TestActivityLogApiContracts:
    def test_activity_log_list_response_is_wrapped(self, api_client, admin_user, student_user):
        log = UserLog.objects.create(
            user=student_user,
            operator=admin_user,
            action='role_assigned',
            description=f'被操作账号：{student_user.username}（{student_user.employee_id}）；新增角色：学员',
            status='success',
        )
        api_client.force_authenticate(user=admin_user)
        response = api_client.get('/api/logs/?type=user&page=1&page_size=10')

        assert response.status_code == 200
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert response.data['data']['count'] == 1
        assert response.data['data']['page'] == 1
        assert response.data['data']['page_size'] == 10
        assert len(response.data['data']['members']) == 1
        assert response.data['data']['members'][0]['user']['id'] == admin_user.id
        assert response.data['data']['members'][0]['user']['avatar_key'] == admin_user.avatar_key
        assert response.data['data']['members'][0]['activity_count'] == 1
        assert response.data['data']['results'][0]['id'] == f'user-{log.id}'
        assert response.data['data']['results'][0]['category'] == 'user'
        assert response.data['data']['results'][0]['actor']['id'] == admin_user.id
        assert response.data['data']['results'][0]['actor']['avatar_key'] == admin_user.avatar_key
        assert admin_user.username in response.data['data']['results'][0]['summary']
        assert student_user.username in response.data['data']['results'][0]['description']

    def test_activity_log_filters_member_ids_by_active_actor(self, api_client, admin_user, mentor_user):
        ContentLog.objects.create(
            content_type='knowledge',
            content_id='K-1',
            content_title='知识A',
            operator=admin_user,
            action='create',
            description='管理员创建知识',
            status='success',
        )
        mentor_log = ContentLog.objects.create(
            content_type='quiz',
            content_id='Q-1',
            content_title='导师试卷',
            operator=mentor_user,
            action='update',
            description='导师更新试卷',
            status='success',
        )

        api_client.force_authenticate(user=admin_user)
        response = api_client.get(f'/api/logs/?type=content&member_ids={mentor_user.id}&page=1&page_size=10')

        assert response.status_code == 200
        assert response.data['data']['count'] == 1
        assert {member['user']['id'] for member in response.data['data']['members']} == {
            admin_user.id,
            mentor_user.id,
        }
        assert response.data['data']['results'][0]['id'] == f'content-{mentor_log.id}'
        assert response.data['data']['results'][0]['actor']['id'] == mentor_user.id
        assert '导师试卷' in response.data['data']['results'][0]['summary']

    def test_activity_log_member_sidebar_keeps_full_member_pool_when_member_filter_is_active(
        self,
        api_client,
        admin_user,
        mentor_user,
    ):
        ContentLog.objects.create(
            content_type='knowledge',
            content_id='K-1',
            content_title='管理员知识',
            operator=admin_user,
            action='create',
            description='管理员创建知识',
            status='success',
        )
        mentor_log = ContentLog.objects.create(
            content_type='quiz',
            content_id='Q-1',
            content_title='导师试卷',
            operator=mentor_user,
            action='update',
            description='导师更新试卷',
            status='success',
        )

        api_client.force_authenticate(user=admin_user)
        response = api_client.get(f'/api/logs/?type=content&member_ids={mentor_user.id}&page=1&page_size=10')

        assert response.status_code == 200
        assert response.data['data']['count'] == 1
        assert response.data['data']['results'][0]['id'] == f'content-{mentor_log.id}'
        assert {member['user']['id'] for member in response.data['data']['members']} == {
            admin_user.id,
            mentor_user.id,
        }

    def test_activity_log_filters_search_date_and_status(self, api_client, admin_user):
        old_log = OperationLog.objects.create(
            operator=admin_user,
            operation_type='grading',
            action='manual_grade',
            description='旧的批阅记录',
            status='failed',
            duration=10,
        )
        matched_log = OperationLog.objects.create(
            operator=admin_user,
            operation_type='submission',
            action='submit',
            description='提交答卷成功',
            status='success',
            duration=25,
        )
        OperationLog.objects.filter(pk=old_log.pk).update(
            created_at=timezone.make_aware(datetime(2026, 3, 10, 9, 0, 0))
        )
        OperationLog.objects.filter(pk=matched_log.pk).update(
            created_at=timezone.make_aware(datetime(2026, 3, 25, 15, 30, 0))
        )

        api_client.force_authenticate(user=admin_user)
        response = api_client.get(
            '/api/logs/?type=operation&search=答卷&status=success'
            '&date_from=2026-03-20&date_to=2026-03-26&page=1&page_size=10'
        )

        assert response.status_code == 200
        assert response.data['data']['count'] == 1
        assert response.data['data']['results'][0]['id'] == f'operation-{matched_log.id}'
        assert 'summary' in response.data['data']['results'][0]

    def test_activity_log_members_are_aggregated_from_full_filtered_set(
        self,
        api_client,
        admin_user,
        mentor_user,
    ):
        OperationLog.objects.create(
            operator=admin_user,
            operation_type='task_management',
            action='create_and_assign',
            description='创建任务 1',
            status='success',
            duration=100,
        )
        OperationLog.objects.create(
            operator=admin_user,
            operation_type='task_management',
            action='update_task',
            description='更新任务 2',
            status='success',
            duration=80,
        )
        OperationLog.objects.create(
            operator=mentor_user,
            operation_type='spot_check',
            action='create',
            description='创建抽查',
            status='success',
            duration=50,
        )

        api_client.force_authenticate(user=admin_user)
        response = api_client.get('/api/logs/?type=operation&page=1&page_size=1')

        assert response.status_code == 200
        assert response.data['data']['count'] == 3
        assert len(response.data['data']['results']) == 1
        assert len(response.data['data']['members']) == 2
        assert response.data['data']['members'][0]['user']['id'] == admin_user.id
        assert response.data['data']['members'][0]['activity_count'] == 2
        assert response.data['data']['members'][1]['user']['id'] == mentor_user.id
        assert response.data['data']['members'][1]['activity_count'] == 1

    def test_activity_log_requires_permission(self, api_client, student_user):
        api_client.force_authenticate(user=student_user)
        response = api_client.get('/api/logs/?type=user&page=1&page_size=10')

        assert response.status_code == 403
        assert response.data['code'] == 'PERMISSION_DENIED'

    def test_activity_log_delete_endpoint_removes_selected_log(self, api_client, admin_user):
        log = OperationLog.objects.create(
            operator=admin_user,
            operation_type='submission',
            action='submit',
            description='用于删除测试',
            status='success',
            duration=15,
        )

        api_client.force_authenticate(user=admin_user)
        response = api_client.delete(f'/api/logs/items/operation-{log.id}/')

        assert response.status_code == 200
        assert response.data['code'] == 'SUCCESS'
        assert not OperationLog.objects.filter(pk=log.id).exists()

    def test_activity_log_delete_requires_view_permission(
        self,
        api_client,
        admin_user,
        student_user,
    ):
        log = UserLog.objects.create(
            user=student_user,
            operator=admin_user,
            action='login',
            description='用于权限校验',
            status='success',
        )

        api_client.force_authenticate(user=student_user)
        response = api_client.delete(f'/api/logs/items/user-{log.id}/')

        assert response.status_code == 403
        assert response.data['code'] == 'PERMISSION_DENIED'

    def test_activity_log_bulk_delete_endpoint_removes_selected_logs(self, api_client, admin_user):
        first_log = OperationLog.objects.create(
            operator=admin_user,
            operation_type='submission',
            action='submit',
            description='用于批量删除测试1',
            status='success',
            duration=12,
        )
        second_log = OperationLog.objects.create(
            operator=admin_user,
            operation_type='grading',
            action='manual_grade',
            description='用于批量删除测试2',
            status='success',
            duration=18,
        )

        api_client.force_authenticate(user=admin_user)
        response = api_client.post(
            '/api/logs/items/bulk-delete/',
            {
                'item_ids': [
                    f'operation-{first_log.id}',
                    f'operation-{second_log.id}',
                ]
            },
            format='json',
        )

        assert response.status_code == 200
        assert response.data['data']['deleted_count'] == 2
        assert not OperationLog.objects.filter(pk=first_log.id).exists()
        assert not OperationLog.objects.filter(pk=second_log.id).exists()

    def test_activity_log_bulk_delete_requires_view_permission(
        self,
        api_client,
        admin_user,
        student_user,
    ):
        log = UserLog.objects.create(
            user=student_user,
            operator=admin_user,
            action='login',
            description='用于批量删除权限校验',
            status='success',
        )

        api_client.force_authenticate(user=student_user)
        response = api_client.post(
            '/api/logs/items/bulk-delete/',
            {'item_ids': [f'user-{log.id}']},
            format='json',
        )

        assert response.status_code == 403
        assert response.data['code'] == 'PERMISSION_DENIED'
