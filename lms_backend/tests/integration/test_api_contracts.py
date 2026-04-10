from datetime import datetime

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.authorization.models import Permission, RolePermission
from apps.activity_logs.models import ContentLog, OperationLog, UserLog
from apps.knowledge.models import Knowledge
from apps.questions.models import Question
from apps.quizzes.models import Quiz
from apps.spot_checks.models import SpotCheck, SpotCheckItem
from apps.submissions.models import Submission
from apps.tasks.models import Task, TaskAssignment, TaskQuiz
from apps.tags.models import Tag
from apps.users.models import Department, Role, User, UserRole


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def department():
    return Department.objects.create(name='契约测试部门', code='CONTRACT_DEPT')


def _create_spot_check(student, checker, *, topic='契约测试抽查', content='', score='88.00', comment='表现稳定'):
    spot_check = SpotCheck.objects.create(student=student, checker=checker)
    SpotCheckItem.objects.create(
        spot_check=spot_check,
        topic=topic,
        content=content,
        score=score,
        comment=comment,
        order=0,
    )
    return spot_check


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
            'tag.view',
            'tag.create',
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
            'tag.view',
            'tag.create',
            'tag.update',
            'tag.delete',
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
def space_tag():
    return Tag.objects.create(
        name='契约测试space',
        tag_type='SPACE',
        allow_knowledge=True,
        allow_question=True,
        sort_order=1,
    )


@pytest.fixture
def knowledge_tag():
    return Tag.objects.create(
        name='知识标签',
        tag_type='TAG',
        allow_knowledge=True,
        allow_question=False,
        sort_order=2,
    )


@pytest.fixture
def question_tag():
    return Tag.objects.create(
        name='题目标签',
        tag_type='TAG',
        allow_knowledge=False,
        allow_question=True,
        sort_order=3,
    )


@pytest.fixture
def sample_question(mentor_user, space_tag):
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
        space_tag=space_tag,
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
def sample_knowledge(mentor_user, space_tag):
    return Knowledge.objects.create(
        title='契约测试知识',
        content='契约测试正文内容',
        created_by=mentor_user,
        updated_by=mentor_user,
        is_current=True,
        space_tag=space_tag,
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
    return _create_spot_check(student_user, mentor_user)


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

    def test_question_list_hides_history_versions(self, api_client, mentor_user, sample_question):
        historical_version = Question.objects.create(
            content='旧版本题目',
            question_type='SINGLE_CHOICE',
            options=[
                {'key': 'A', 'value': '选项A'},
                {'key': 'B', 'value': '选项B'},
            ],
            answer='A',
            score=1,
            created_by=mentor_user,
            updated_by=mentor_user,
            resource_uuid=sample_question.resource_uuid,
            version_number=2,
            is_current=False,
        )

        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/questions/?page=1&page_size=10')

        assert response.status_code == 200, response.data
        result_ids = [item['id'] for item in response.data['data']['results']]
        assert sample_question.id in result_ids
        assert historical_version.id not in result_ids

    def test_question_detail_blocks_historical_version_for_non_admin(self, api_client, mentor_user, space_tag):
        current = Question.objects.create(
            content='当前题目',
            question_type='SINGLE_CHOICE',
            options=[
                {'key': 'A', 'value': '选项A'},
                {'key': 'B', 'value': '选项B'},
            ],
            answer='A',
            score=1,
            created_by=mentor_user,
            updated_by=mentor_user,
            space_tag=space_tag,
            version_number=2,
            is_current=True,
        )
        historical_version = Question.objects.create(
            content='历史题目',
            question_type='SINGLE_CHOICE',
            options=[
                {'key': 'A', 'value': '选项A'},
                {'key': 'B', 'value': '选项B'},
            ],
            answer='A',
            score=1,
            created_by=mentor_user,
            updated_by=mentor_user,
            space_tag=space_tag,
            resource_uuid=current.resource_uuid,
            version_number=1,
            is_current=False,
        )

        api_client.force_authenticate(user=mentor_user)
        response = api_client.get(f'/api/questions/{historical_version.id}/')

        assert response.status_code == 403
        assert response.data['code'] == 'PERMISSION_DENIED'
        assert '无权访问该题目' in response.data['message']

    def test_question_list_rejects_invalid_created_by(self, api_client, mentor_user):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/questions/?created_by=not-an-int')

        assert response.status_code == 400
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert 'created_by' in response.data['message']

    def test_question_list_rejects_invalid_space_tag_id(self, api_client, mentor_user):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/questions/?space_tag_id=0')

        assert response.status_code == 400
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert 'space_tag_id' in response.data['message']

    def test_question_create_allows_missing_space_tag(self, api_client, mentor_user):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.post(
            '/api/questions/',
            {
                'content': '无space题目',
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
        assert response.data['data']['space_tag'] is None

    def test_question_create_accepts_question_tags(self, api_client, mentor_user, question_tag):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.post(
            '/api/questions/',
            {
                'content': '带标签题目',
                'question_type': 'SINGLE_CHOICE',
                'options': [
                    {'key': 'A', 'value': '选项A'},
                    {'key': 'B', 'value': '选项B'},
                ],
                'answer': 'A',
                'score': '1',
                'tag_ids': [question_tag.id],
            },
            format='json',
        )

        assert response.status_code == 201, response.data
        assert {item['id'] for item in response.data['data']['tags']} == {question_tag.id}

    def test_question_create_rejects_non_question_scope_tags(
        self,
        api_client,
        mentor_user,
        knowledge_tag,
    ):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.post(
            '/api/questions/',
            {
                'content': '错误标签题目',
                'question_type': 'SINGLE_CHOICE',
                'options': [
                    {'key': 'A', 'value': '选项A'},
                    {'key': 'B', 'value': '选项B'},
                ],
                'answer': 'A',
                'score': '1',
                'tag_ids': [knowledge_tag.id],
            },
            format='json',
        )

        assert response.status_code == 400, response.data
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert response.data['message'] == 'tag_ids 包含无效的题目标签ID'

    def test_question_patch_allows_clearing_space_tag(self, api_client, mentor_user, sample_question):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.patch(
            f'/api/questions/{sample_question.id}/',
            {'space_tag_id': None},
            format='json',
        )

        assert response.status_code == 200, response.data
        assert response.data['code'] == 'SUCCESS'
        assert response.data['data']['space_tag'] is None
        assert response.data['data']['id'] == sample_question.id

        sample_question.refresh_from_db()
        assert sample_question.is_current is True
        assert sample_question.space_tag_id is None
        assert Question.objects.filter(resource_uuid=sample_question.resource_uuid).count() == 1

    def test_question_patch_logs_tag_update_with_question_identity(
        self,
        api_client,
        mentor_user,
        sample_question,
        question_tag,
    ):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.patch(
            f'/api/questions/{sample_question.id}/',
            {'tag_ids': [question_tag.id]},
            format='json',
        )

        assert response.status_code == 200, response.data
        log = ContentLog.objects.filter(
            content_type='question',
            action='update',
            operator=mentor_user,
        ).latest('id')
        updated_question_id = response.data['data']['id']
        assert f'题目#{updated_question_id}' in log.description
        assert '更新了标签（1 个）' in log.description


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
        assert response.data['code'] == 'VALIDATION_ERROR'
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

    def test_quiz_list_hides_history_versions(self, api_client, mentor_user, sample_quiz):
        historical_version = Quiz.objects.create(
            title='旧版本试卷',
            quiz_type='PRACTICE',
            created_by=mentor_user,
            updated_by=mentor_user,
            resource_uuid=sample_quiz.resource_uuid,
            version_number=2,
            is_current=False,
        )

        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/quizzes/?page=1&page_size=10')

        assert response.status_code == 200, response.data
        result_ids = [item['id'] for item in response.data['data']['results']]
        assert sample_quiz.id in result_ids
        assert historical_version.id not in result_ids

    def test_quiz_list_rejects_invalid_created_by(self, api_client, mentor_user):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/quizzes/?created_by=invalid')

        assert response.status_code == 400
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert 'created_by' in response.data['message']


@pytest.mark.django_db
class TestTagApiContracts:
    def test_tag_list_response_is_wrapped(self, api_client, mentor_user, space_tag):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/tags/?tag_type=SPACE')

        assert response.status_code == 200, response.data
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert isinstance(response.data['data'], list)
        result_ids = [item['id'] for item in response.data['data']]
        assert space_tag.id in result_ids

    def test_student_can_list_space_tags_for_knowledge_filters(self, api_client, student_user, space_tag):
        api_client.force_authenticate(user=student_user)
        response = api_client.get('/api/tags/?tag_type=SPACE')

        assert response.status_code == 200, response.data
        result_ids = [item['id'] for item in response.data['data']]
        assert space_tag.id in result_ids

    def test_student_cannot_list_all_space_tags_without_tag_view(self, api_client, student_user):
        api_client.force_authenticate(user=student_user)
        response = api_client.get('/api/tags/?tag_type=TAG')

        assert response.status_code == 403
        assert response.data['code'] == 'PERMISSION_DENIED'

    def test_tag_list_rejects_invalid_limit(self, api_client, mentor_user):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/tags/?limit=bad')

        assert response.status_code == 400
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert 'limit' in response.data['message']

    def test_tag_list_supports_scope_filter(self, api_client, mentor_user, knowledge_tag, question_tag):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/tags/?tag_type=TAG&applicable_to=question')

        assert response.status_code == 200, response.data
        result_ids = {item['id'] for item in response.data['data']}
        assert question_tag.id in result_ids
        assert knowledge_tag.id not in result_ids

    def test_tag_create_rejects_name_duplicated_with_other_type(self, api_client, admin_user, space_tag):
        api_client.force_authenticate(user=admin_user)
        response = api_client.post(
            '/api/tags/',
            {
                'name': space_tag.name,
                'tag_type': 'TAG',
                'allow_knowledge': True,
                'allow_question': False,
            },
            format='json',
        )

        assert response.status_code == 400, response.data
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert response.data['message'] == '标签名称不能与其他类型重复'

    def test_tag_create_can_auto_extend_scope_and_reuse_existing_tag(
        self,
        api_client,
        admin_user,
        knowledge_tag,
    ):
        api_client.force_authenticate(user=admin_user)
        response = api_client.post(
            '/api/tags/',
            {
                'name': knowledge_tag.name,
                'tag_type': 'TAG',
                'current_module': 'question',
                'extend_scope': True,
            },
            format='json',
        )

        assert response.status_code == 201, response.data
        assert response.data['data']['id'] == knowledge_tag.id
        assert response.data['data']['allow_knowledge'] is True
        assert response.data['data']['allow_question'] is True

        knowledge_tag.refresh_from_db()
        assert knowledge_tag.allow_knowledge is True
        assert knowledge_tag.allow_question is True

    def test_tag_create_without_extend_scope_returns_reuse_hint(
        self,
        api_client,
        admin_user,
        knowledge_tag,
    ):
        api_client.force_authenticate(user=admin_user)
        response = api_client.post(
            '/api/tags/',
            {
                'name': knowledge_tag.name,
                'tag_type': 'TAG',
                'current_module': 'question',
                'extend_scope': False,
            },
            format='json',
        )

        assert response.status_code == 400, response.data
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert response.data['message'] == '已存在同名标签，可扩展适用范围后复用'
        assert response.data['details']['existing_tag_id'] == knowledge_tag.id
        assert response.data['details']['requires_scope_extension'] is True

        knowledge_tag.refresh_from_db()
        assert knowledge_tag.allow_question is False

    def test_tag_patch_rejects_name_duplicated_with_other_type(self, api_client, admin_user, space_tag, knowledge_tag):
        api_client.force_authenticate(user=admin_user)
        response = api_client.patch(
            f'/api/tags/{knowledge_tag.id}/',
            {'name': space_tag.name},
            format='json',
        )

        assert response.status_code == 400, response.data
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert response.data['message'] == '标签名称不能与其他类型重复'

    def test_tag_patch_can_convert_tag_to_space(
        self,
        api_client,
        admin_user,
        knowledge_tag,
        sample_knowledge,
        sample_question,
    ):
        sample_knowledge.space_tag = None
        sample_knowledge.save(update_fields=['space_tag'])
        sample_question.space_tag = None
        sample_question.save(update_fields=['space_tag'])
        sample_knowledge.tags.set([knowledge_tag.id])
        sample_question.tags.set([knowledge_tag.id])

        api_client.force_authenticate(user=admin_user)
        response = api_client.patch(
            f'/api/tags/{knowledge_tag.id}/',
            {
                'tag_type': 'SPACE',
                'color': '#123456',
                'sort_order': 9,
            },
            format='json',
        )

        assert response.status_code == 200, response.data
        assert response.data['data']['tag_type'] == 'SPACE'

        sample_knowledge.refresh_from_db()
        sample_question.refresh_from_db()
        knowledge_tag.refresh_from_db()
        assert sample_knowledge.space_tag_id == knowledge_tag.id
        assert sample_question.space_tag_id == knowledge_tag.id
        assert sample_knowledge.tags.count() == 0
        assert sample_question.tags.count() == 0

    def test_tag_patch_can_convert_space_to_tag(
        self,
        api_client,
        admin_user,
        space_tag,
        sample_knowledge,
        sample_question,
    ):
        api_client.force_authenticate(user=admin_user)
        response = api_client.patch(
            f'/api/tags/{space_tag.id}/',
            {
                'tag_type': 'TAG',
                'allow_knowledge': True,
                'allow_question': True,
            },
            format='json',
        )

        assert response.status_code == 200, response.data
        assert response.data['data']['tag_type'] == 'TAG'

        sample_knowledge.refresh_from_db()
        sample_question.refresh_from_db()
        space_tag.refresh_from_db()
        assert sample_knowledge.space_tag_id is None
        assert sample_question.space_tag_id is None
        assert sample_knowledge.tags.filter(id=space_tag.id).exists()
        assert sample_question.tags.filter(id=space_tag.id).exists()
        assert space_tag.allow_knowledge is True
        assert space_tag.allow_question is True

    def test_tag_merge_moves_relations_to_merged_tag(
        self,
        api_client,
        admin_user,
        knowledge_tag,
        sample_knowledge,
        sample_question,
    ):
        sibling_tag = Tag.objects.create(
            name='同义标签',
            tag_type='TAG',
            allow_knowledge=False,
            allow_question=True,
            sort_order=0,
        )
        sample_knowledge.tags.set([knowledge_tag.id])
        sample_question.tags.set([sibling_tag.id])

        api_client.force_authenticate(user=admin_user)
        response = api_client.post(
            '/api/tags/merge/',
            {
                'source_tag_ids': [knowledge_tag.id, sibling_tag.id],
                'merged_name': '统一标签',
            },
            format='json',
        )

        assert response.status_code == 200, response.data
        assert response.data['data']['name'] == '统一标签'

        sample_knowledge.refresh_from_db()
        sample_question.refresh_from_db()
        assert not Tag.objects.filter(id=sibling_tag.id).exists()

        merged_tag = Tag.objects.get(name='统一标签')
        assert merged_tag.id in {knowledge_tag.id, sibling_tag.id}
        assert sample_knowledge.tags.filter(id=merged_tag.id).exists()
        assert sample_question.tags.filter(id=merged_tag.id).exists()
        assert merged_tag.allow_knowledge is True
        assert merged_tag.allow_question is True

    def test_tag_merge_rejects_cross_type_tags(self, api_client, admin_user, knowledge_tag, space_tag):
        api_client.force_authenticate(user=admin_user)
        response = api_client.post(
            '/api/tags/merge/',
            {
                'source_tag_ids': [knowledge_tag.id, space_tag.id],
                'merged_name': '不能合并',
            },
            format='json',
        )

        assert response.status_code == 400, response.data
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert response.data['message'] == '仅支持同类型标签合并，请先改类型'

    def test_tag_delete_detaches_linked_knowledge_and_question(
        self,
        api_client,
        admin_user,
        space_tag,
        sample_knowledge,
        sample_question,
    ):
        api_client.force_authenticate(user=admin_user)

        response = api_client.delete(f'/api/tags/{space_tag.id}/')

        assert response.status_code == 200, response.data
        assert response.data['code'] == 'SUCCESS'
        assert not Tag.objects.filter(id=space_tag.id).exists()

        sample_knowledge.refresh_from_db()
        sample_question.refresh_from_db()
        assert sample_knowledge.space_tag_id is None
        assert sample_question.space_tag_id is None


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

    def test_knowledge_list_hides_history_versions(self, api_client, mentor_user, sample_knowledge):
        historical_version = Knowledge.objects.create(
            title='旧版本知识',
            content='旧版本正文',
            created_by=mentor_user,
            updated_by=mentor_user,
            space_tag=sample_knowledge.space_tag,
            resource_uuid=sample_knowledge.resource_uuid,
            version_number=2,
            is_current=False,
        )

        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/knowledge/?page=1&page_size=10')

        assert response.status_code == 200, response.data
        result_ids = [item['id'] for item in response.data['data']['results']]
        assert sample_knowledge.id in result_ids
        assert historical_version.id not in result_ids

    def test_knowledge_list_rejects_invalid_space_tag_id(self, api_client, mentor_user):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/knowledge/?space_tag_id=bad')

        assert response.status_code == 400
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert 'space_tag_id' in response.data['message']

    def test_knowledge_detail_response_is_wrapped(self, api_client, mentor_user, sample_knowledge):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.get(f'/api/knowledge/{sample_knowledge.id}/')

        assert response.status_code == 200, response.data
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert response.data['data']['id'] == sample_knowledge.id

    def test_knowledge_detail_blocks_historical_version_for_non_admin(self, api_client, mentor_user, space_tag):
        current = Knowledge.objects.create(
            title='当前知识',
            content='当前正文',
            created_by=mentor_user,
            updated_by=mentor_user,
            space_tag=space_tag,
            version_number=2,
            is_current=True,
        )
        historical_version = Knowledge.objects.create(
            title='历史知识',
            content='历史正文',
            created_by=mentor_user,
            updated_by=mentor_user,
            space_tag=space_tag,
            resource_uuid=current.resource_uuid,
            version_number=1,
            is_current=False,
        )

        api_client.force_authenticate(user=mentor_user)
        response = api_client.get(f'/api/knowledge/{historical_version.id}/')

        assert response.status_code == 403
        assert response.data['code'] == 'PERMISSION_DENIED'
        assert '无权访问该知识文档' in response.data['message']

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

    def test_knowledge_create_allows_missing_title(self, api_client, admin_user, space_tag):
        api_client.force_authenticate(user=admin_user)
        response = api_client.post(
            '/api/knowledge/',
            {
                'space_tag_id': space_tag.id,
                'content': '<p>无标题正文内容</p>',
            },
            format='json',
        )

        assert response.status_code == 201, response.data
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == '创建成功'
        assert response.data['data']['title'] == ''

    def test_knowledge_create_allows_missing_space_tag(self, api_client, admin_user):
        api_client.force_authenticate(user=admin_user)
        response = api_client.post(
            '/api/knowledge/',
            {
                'content': '<p>无space正文内容</p>',
            },
            format='json',
        )

        assert response.status_code == 201, response.data
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == '创建成功'
        assert response.data['data']['space_tag'] is None

    def test_knowledge_create_rejects_empty_content(self, api_client, admin_user):
        api_client.force_authenticate(user=admin_user)
        response = api_client.post(
            '/api/knowledge/',
            {
                'title': '仅标题',
                'space_tag_id': None,
            },
            format='json',
        )

        assert response.status_code == 400, response.data
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert response.data['message'] == '知识文档必须填写正文内容'

    def test_knowledge_create_rejects_non_knowledge_scope_tags(
        self,
        api_client,
        admin_user,
        question_tag,
    ):
        api_client.force_authenticate(user=admin_user)
        response = api_client.post(
            '/api/knowledge/',
            {
                'title': '错误标签知识',
                'content': '<p>正文</p>',
                'tag_ids': [question_tag.id],
            },
            format='json',
        )

        assert response.status_code == 400, response.data
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert response.data['message'] == 'tag_ids 包含无效的知识标签ID'

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

    def test_knowledge_patch_only_tags_inherits_unprovided_space_tag(
        self,
        api_client,
        admin_user,
        sample_knowledge,
    ):
        source_tag = Tag.objects.create(
            name='契约测试标签源',
            tag_type='TAG',
            allow_knowledge=True,
            allow_question=False,
            sort_order=2,
        )
        target_tag = Tag.objects.create(
            name='契约测试标签新',
            tag_type='TAG',
            allow_knowledge=True,
            allow_question=False,
            sort_order=1,
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
        assert data['space_tag']['id'] == sample_knowledge.space_tag_id
        assert {item['id'] for item in data['tags']} == {target_tag.id}
        assert data['id'] == sample_knowledge.id

        sample_knowledge.refresh_from_db()
        assert sample_knowledge.is_current is True
        assert Knowledge.objects.filter(
            resource_uuid=sample_knowledge.resource_uuid,
            is_current=True
        ).count() == 1
        assert Knowledge.objects.filter(resource_uuid=sample_knowledge.resource_uuid).count() == 1

    def test_knowledge_patch_only_space_tag_inherits_unprovided_tags(
        self,
        api_client,
        admin_user,
        sample_knowledge,
        space_tag,
    ):
        source_tag = Tag.objects.create(
            name='契约测试标签保留',
            tag_type='TAG',
            allow_knowledge=True,
            allow_question=False,
            sort_order=1,
        )
        target_space_tag = Tag.objects.create(
            name='契约测试space新',
            tag_type='SPACE',
            allow_knowledge=True,
            allow_question=True,
            sort_order=3,
        )
        sample_knowledge.tags.set([source_tag.id])

        api_client.force_authenticate(user=admin_user)
        response = api_client.patch(
            f'/api/knowledge/{sample_knowledge.id}/',
            {'space_tag_id': target_space_tag.id},
            format='json'
        )

        assert response.status_code == 200, response.data
        data = response.data['data']
        assert data['space_tag']['id'] == target_space_tag.id
        assert {item['id'] for item in data['tags']} == {source_tag.id}
        assert data['id'] == sample_knowledge.id

        sample_knowledge.refresh_from_db()
        assert sample_knowledge.is_current is True
        assert Knowledge.objects.filter(
            resource_uuid=sample_knowledge.resource_uuid,
            is_current=True
        ).count() == 1
        assert Knowledge.objects.filter(resource_uuid=sample_knowledge.resource_uuid).count() == 1

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
class TestTaskResourceOptionApiContracts:
    def test_task_resource_options_response_is_wrapped(self, api_client, mentor_user, sample_knowledge, sample_quiz):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/tasks/resource-options/?resource_type=ALL&page=1&page_size=10')

        assert response.status_code == 200, response.data
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert 'results' in response.data['data']
        result_ids = {(item['resource_type'], item['id']) for item in response.data['data']['results']}
        assert ('DOCUMENT', sample_knowledge.id) in result_ids
        assert ('QUIZ', sample_quiz.id) in result_ids

    def test_task_resource_options_hide_historical_versions(self, api_client, mentor_user, sample_knowledge, sample_quiz):
        historical_knowledge = Knowledge.objects.create(
            title='历史知识版本',
            content='历史知识正文',
            created_by=mentor_user,
            updated_by=mentor_user,
            resource_uuid=sample_knowledge.resource_uuid,
            version_number=2,
            is_current=False,
            space_tag=sample_knowledge.space_tag,
        )
        historical_quiz = Quiz.objects.create(
            title='历史试卷版本',
            quiz_type='PRACTICE',
            created_by=mentor_user,
            updated_by=mentor_user,
            resource_uuid=sample_quiz.resource_uuid,
            version_number=2,
            is_current=False,
        )

        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/tasks/resource-options/?resource_type=ALL&page=1&page_size=10')

        assert response.status_code == 200, response.data
        result_ids = {(item['resource_type'], item['id']) for item in response.data['data']['results']}
        assert ('DOCUMENT', sample_knowledge.id) in result_ids
        assert ('QUIZ', sample_quiz.id) in result_ids
        assert ('DOCUMENT', historical_knowledge.id) not in result_ids
        assert ('QUIZ', historical_quiz.id) not in result_ids


@pytest.mark.django_db
class TestSpotCheckApiContracts:
    def test_spot_check_create_response_is_wrapped(self, api_client, mentor_user, student_user):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.post(
            '/api/spot-checks/',
            {
                'student': student_user.id,
                'items': [
                    {
                        'topic': '新建抽查',
                        'content': '闭包和事件循环',
                        'score': '91.5',
                        'comment': '创建成功',
                    }
                ],
            },
            format='json',
        )

        assert response.status_code == 201
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == '创建成功'
        assert 'data' in response.data
        assert response.data['data']['student'] == student_user.id
        assert response.data['data']['topic_count'] == 1

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
        assert result['topic_summary'] == sample_spot_check.topic_summary

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
        assert response.data['data']['items'][0]['topic'] == '契约测试抽查'

    def test_spot_check_patch_response_is_wrapped(self, api_client, mentor_user, sample_spot_check):
        api_client.force_authenticate(user=mentor_user)
        response = api_client.patch(
            f'/api/spot-checks/{sample_spot_check.id}/',
            {
                'items': [
                    {
                        'topic': '契约测试抽查',
                        'content': '补充追问',
                        'score': '88.0',
                        'comment': '已更新评语',
                    }
                ]
            },
            format='json',
        )

        assert response.status_code == 200
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert response.data['data']['items'][0]['comment'] == '已更新评语'

    def test_spot_check_student_list_includes_students_without_records(
        self,
        api_client,
        mentor_user,
        student_user,
        department,
    ):
        student_without_record = User.objects.create_user(
            employee_id='CONTRACT_STUDENT_002',
            username='契约测试学员2',
            password='password123',
            department=department,
            mentor=mentor_user,
        )
        _create_spot_check(student_user, mentor_user)

        api_client.force_authenticate(user=mentor_user)
        response = api_client.get('/api/spot-checks/students/')

        assert response.status_code == 200
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert isinstance(response.data['data'], list)
        result_ids = [item['id'] for item in response.data['data']]
        assert student_user.id in result_ids
        assert student_without_record.id in result_ids


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
        assert response.data['code'] == 'VALIDATION_ERROR'
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
    def test_activity_log_user_pool_response_includes_users_without_logs(
        self,
        api_client,
        admin_user,
        department,
    ):
        user_without_logs = User.objects.create_user(
            employee_id='CONTRACT_NO_LOG_001',
            username='无日志用户',
            password='password123',
            department=department,
        )
        api_client.force_authenticate(user=admin_user)
        response = api_client.get('/api/logs/users/')

        assert response.status_code == 200
        assert response.data['code'] == 'SUCCESS'
        assert response.data['message'] == 'success'
        assert isinstance(response.data['data'], list)
        result_ids = {item['id'] for item in response.data['data']}
        assert admin_user.id in result_ids
        assert user_without_logs.id in result_ids
        target = next(item for item in response.data['data'] if item['id'] == user_without_logs.id)
        assert target['department_name'] == department.name

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
