import pytest
from django.utils import timezone
from rest_framework.test import APIClient

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


@pytest.fixture
def mentor_role():
    role, _ = Role.objects.get_or_create(code='MENTOR', defaults={'name': '导师'})
    return role


@pytest.fixture
def admin_role():
    role, _ = Role.objects.get_or_create(code='ADMIN', defaults={'name': '管理员'})
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
        description='用于接口契约测试',
        quiz_type='PRACTICE',
        created_by=mentor_user,
        updated_by=mentor_user,
    )


@pytest.fixture
def sample_exam_quiz(mentor_user):
    return Quiz.objects.create(
        title='契约测试考试',
        description='用于考试接口契约测试',
        quiz_type='EXAM',
        created_by=mentor_user,
        updated_by=mentor_user,
    )


@pytest.fixture
def sample_knowledge(mentor_user, line_tag):
    return Knowledge.objects.create(
        title='契约测试知识',
        knowledge_type='OTHER',
        content='契约测试正文内容',
        summary='契约测试摘要',
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

    def test_knowledge_patch_only_system_tags_inherits_unprovided_tags(
        self,
        api_client,
        admin_user,
        sample_knowledge,
        line_tag
    ):
        source_system_tag = Tag.objects.create(
            name='契约测试系统标签源',
            tag_type='SYSTEM',
            parent=line_tag,
            sort_order=1,
            is_active=True,
        )
        target_system_tag = Tag.objects.create(
            name='契约测试系统标签新',
            tag_type='SYSTEM',
            parent=line_tag,
            sort_order=2,
            is_active=True,
        )
        source_operation_tag = Tag.objects.create(
            name='契约测试操作标签源',
            tag_type='OPERATION',
            sort_order=1,
            is_active=True,
        )
        sample_knowledge.system_tags.set([source_system_tag.id])
        sample_knowledge.operation_tags.set([source_operation_tag.id])

        api_client.force_authenticate(user=admin_user)
        response = api_client.patch(
            f'/api/knowledge/{sample_knowledge.id}/',
            {'system_tag_ids': [target_system_tag.id]},
            format='json'
        )

        assert response.status_code == 200, response.data
        data = response.data['data']
        assert data['line_tag']['id'] == sample_knowledge.line_tag_id
        assert {item['id'] for item in data['system_tags']} == {target_system_tag.id}
        assert {item['id'] for item in data['operation_tags']} == {source_operation_tag.id}

        sample_knowledge.refresh_from_db()
        assert sample_knowledge.is_current is False
        assert Knowledge.objects.filter(
            resource_uuid=sample_knowledge.resource_uuid,
            is_current=True
        ).count() == 1

    def test_knowledge_patch_only_operation_tags_inherits_unprovided_tags(
        self,
        api_client,
        admin_user,
        sample_knowledge,
        line_tag
    ):
        source_system_tag = Tag.objects.create(
            name='契约测试系统标签保留',
            tag_type='SYSTEM',
            parent=line_tag,
            sort_order=1,
            is_active=True,
        )
        source_operation_tag = Tag.objects.create(
            name='契约测试操作标签源2',
            tag_type='OPERATION',
            sort_order=1,
            is_active=True,
        )
        target_operation_tag = Tag.objects.create(
            name='契约测试操作标签新2',
            tag_type='OPERATION',
            sort_order=2,
            is_active=True,
        )
        sample_knowledge.system_tags.set([source_system_tag.id])
        sample_knowledge.operation_tags.set([source_operation_tag.id])

        api_client.force_authenticate(user=admin_user)
        response = api_client.patch(
            f'/api/knowledge/{sample_knowledge.id}/',
            {'operation_tag_ids': [target_operation_tag.id]},
            format='json'
        )

        assert response.status_code == 200, response.data
        data = response.data['data']
        assert data['line_tag']['id'] == sample_knowledge.line_tag_id
        assert {item['id'] for item in data['system_tags']} == {source_system_tag.id}
        assert {item['id'] for item in data['operation_tags']} == {target_operation_tag.id}

        sample_knowledge.refresh_from_db()
        assert sample_knowledge.is_current is False
        assert Knowledge.objects.filter(
            resource_uuid=sample_knowledge.resource_uuid,
            is_current=True
        ).count() == 1


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
    def test_user_log_list_response_is_wrapped(self, api_client, mentor_user, student_user):
        log = UserLog.objects.create(
            user=student_user,
            operator=mentor_user,
            action='login',
            description='测试登录',
            status='success',
        )
        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/logs/user/?page=1&page_size=10')

        assert response.status_code == 200
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert 'results' in response.data['data']
        result_ids = [item['id'] for item in response.data['data']['results']]
        assert log.id in result_ids

    def test_content_log_list_response_is_wrapped(self, api_client, mentor_user):
        log = ContentLog.objects.create(
            content_type='knowledge',
            content_id='K-1',
            content_title='知识A',
            operator=mentor_user,
            action='create',
            description='创建知识',
            status='success',
        )
        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/logs/content/?page=1&page_size=10')

        assert response.status_code == 200
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        result_ids = [item['id'] for item in response.data['data']['results']]
        assert log.id in result_ids

    def test_operation_log_list_response_is_wrapped(self, api_client, mentor_user):
        log = OperationLog.objects.create(
            operator=mentor_user,
            operation_type='grading',
            action='manual_grade',
            description='批阅试卷',
            status='success',
            duration=120,
        )
        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/logs/operation/?page=1&page_size=10')

        assert response.status_code == 200
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        result_ids = [item['id'] for item in response.data['data']['results']]
        assert log.id in result_ids
