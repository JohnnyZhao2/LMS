from datetime import datetime
from typing import Optional

import pytest
from django.utils import timezone

from apps.activity_logs.models import ActivityLog
from apps.authorization.models import UserScopeGroupOverride
from apps.knowledge.models import Knowledge
from apps.knowledge.services import ensure_knowledge_revision
from apps.questions.models import Question, QuestionOption
from apps.quizzes.models import Quiz, QuizQuestion
from apps.quizzes.services import ensure_quiz_revision
from apps.submissions.models import Answer, Submission
from apps.tasks.models import KnowledgeLearningProgress, Task, TaskAssignment, TaskKnowledge, TaskQuiz
from apps.tags.models import Tag
from apps.users.models import Department, Role, User, UserRole


@pytest.fixture
def department():
    return Department.objects.create(name='契约测试部门', code='CONTRACT_DEPT')


@pytest.fixture
def mentor_role(grant_role_permissions):
    role, _ = Role.objects.get_or_create(code='MENTOR', defaults={'name': '导师'})
    grant_role_permissions(
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
def admin_role(grant_role_permissions):
    role, _ = Role.objects.get_or_create(code='ADMIN', defaults={'name': '管理员'})
    grant_role_permissions(
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
    user.current_role = 'MENTOR'
    return user


@pytest.fixture
def other_mentor_user(department, mentor_role):
    user = User.objects.create_user(
        employee_id='CONTRACT_MENTOR_002',
        username='契约测试导师B',
        password='password123',
        department=department,
    )
    UserRole.objects.get_or_create(user=user, role=mentor_role)
    user.current_role = 'MENTOR'
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
    user.current_role = 'ADMIN'
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


def create_single_choice_question(*, created_by, content: str, space_tag=None, **overrides):
    option_defs = overrides.pop(
        'option_defs',
        [
            {'sort_order': 1, 'content': '选项A', 'is_correct': True},
            {'sort_order': 2, 'content': '选项B', 'is_correct': False},
        ],
    )
    question = Question.objects.create(
        content=content,
        question_type='SINGLE_CHOICE',
        score=1,
        created_by=created_by,
        updated_by=created_by,
        space_tag=space_tag,
        **overrides,
    )
    for option_def in option_defs:
        QuestionOption.objects.create(question=question, **option_def)
    return question


@pytest.fixture
def sample_question(mentor_user, space_tag):
    question = create_single_choice_question(
        created_by=mentor_user,
        content='契约测试题目',
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


def _ensure_task_quiz(task, quiz, *, actor, order: int) -> TaskQuiz:
    if not quiz.quiz_questions.exists():
        question = create_single_choice_question(
            created_by=actor,
            content=f'{quiz.title} 题目',
        )
        QuizQuestion.objects.create(
            quiz=quiz,
            question=question,
            content=question.content,
            question_type=question.question_type,
            reference_answer=question.reference_answer,
            explanation=question.explanation,
            score=question.score,
            order=1,
        )
    quiz_revision = ensure_quiz_revision(quiz, actor=actor)
    task_quiz, _ = TaskQuiz.objects.get_or_create(
        task=task,
        quiz=quiz_revision,
        defaults={'source_quiz': quiz, 'order': order},
    )
    return task_quiz


def _create_submission_answers(submission: Submission) -> None:
    for revision_question in submission.quiz.quiz_questions.order_by('order', 'id'):
        Answer.objects.get_or_create(
            submission=submission,
            question=revision_question,
        )


@pytest.fixture
def practice_task_quiz(student_assignment, sample_quiz, mentor_user):
    return _ensure_task_quiz(
        task=student_assignment.task,
        quiz=sample_quiz,
        actor=mentor_user,
        order=1,
    )


def create_activity_log(
    *,
    category: str,
    actor: Optional[User],
    action: str,
    summary: str,
    description: str,
    status: str = 'success',
    target_type: str = '',
    target_id: str = '',
    target_title: str = '',
    duration: int = 0,
) -> ActivityLog:
    return ActivityLog.objects.create(
        category=category,
        actor=actor,
        action=action,
        summary=summary,
        description=description,
        status=status,
        target_type=target_type,
        target_id=target_id,
        target_title=target_title,
        duration=duration,
    )


def auth(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


def as_role(user: User, role_code: str) -> User:
    user = User.objects.get(pk=user.pk)
    user.current_role = role_code
    return user


def assert_status(response, status_code: int) -> None:
    assert response.status_code == status_code, response.data


def assert_success(response, *, status_code: int = 200, message: str = 'success') -> None:
    assert_status(response, status_code)
    assert response.data['code'] == 'SUCCESS'
    assert response.data['message'] == message


def assert_error_code(response, *, status_code: int, code: str) -> None:
    assert_status(response, status_code)
    assert response.data['code'] == code


def assert_validation_error(response, field: str, *, message: Optional[str] = None) -> None:
    assert_error_code(response, status_code=400, code='VALIDATION_ERROR')
    if message is None:
        assert field in str(response.data['message'])
        return
    assert response.data['message'] == message


def assert_permission_denied(response) -> None:
    assert_error_code(response, status_code=403, code='PERMISSION_DENIED')


@pytest.fixture
def exam_task_quiz(student_assignment, sample_exam_quiz):
    return _ensure_task_quiz(
        task=student_assignment.task,
        quiz=sample_exam_quiz,
        actor=student_assignment.task.created_by,
        order=2,
    )


@pytest.fixture
def in_progress_submission(student_assignment, practice_task_quiz):
    submission = Submission.objects.create(
        task_assignment=student_assignment,
        task_quiz=practice_task_quiz,
        quiz=practice_task_quiz.quiz,
        user=student_assignment.assignee,
        status='IN_PROGRESS',
    )
    _create_submission_answers(submission)
    return submission


@pytest.fixture
def submitted_practice_submission(student_assignment, practice_task_quiz):
    return Submission.objects.create(
        task_assignment=student_assignment,
        task_quiz=practice_task_quiz,
        quiz=practice_task_quiz.quiz,
        user=student_assignment.assignee,
        status='GRADED',
        submitted_at=timezone.now(),
    )


@pytest.fixture
def submitted_exam_submission(student_assignment, exam_task_quiz):
    return Submission.objects.create(
        task_assignment=student_assignment,
        task_quiz=exam_task_quiz,
        quiz=exam_task_quiz.quiz,
        user=student_assignment.assignee,
        status='GRADED',
        submitted_at=timezone.now(),
    )


@pytest.fixture
def sample_spot_check(student_user, mentor_user, create_spot_check):
    return create_spot_check(student_user, mentor_user)


@pytest.mark.django_db
class TestQuestionApiContracts:
    def test_question_list_response_is_wrapped(self, api_client, mentor_user, sample_question):
        response = auth(api_client, mentor_user).get('/api/questions/?page=1&page_size=10')

        assert_success(response)
        assert 'data' in response.data
        assert 'results' in response.data['data']
        result_ids = [item['id'] for item in response.data['data']['results']]
        assert sample_question.id in result_ids

    def test_question_list_only_returns_own_questions(
        self,
        api_client,
        mentor_user,
        other_mentor_user,
        sample_question,
    ):
        other_question = create_single_choice_question(
            created_by=other_mentor_user,
            content='其他导师题目',
        )

        response = auth(api_client, mentor_user).get('/api/questions/?page=1&page_size=10')

        assert_status(response, 200)
        result_ids = {item['id'] for item in response.data['data']['results']}
        assert sample_question.id in result_ids
        assert other_question.id not in result_ids

    def test_question_detail_hides_other_mentor_question(
        self,
        api_client,
        mentor_user,
        other_mentor_user,
    ):
        other_question = create_single_choice_question(
            created_by=other_mentor_user,
            content='不可见题目',
        )

        response = auth(api_client, mentor_user).get(f'/api/questions/{other_question.id}/')

        assert_error_code(response, status_code=404, code='RESOURCE_NOT_FOUND')

    def test_admin_can_view_all_questions(
        self,
        api_client,
        admin_user,
        admin_role,
        grant_role_permissions,
        mentor_user,
        other_mentor_user,
    ):
        grant_role_permissions(admin_role, ['question.view'])
        mentor_question = create_single_choice_question(
            created_by=mentor_user,
            content='导师题目',
        )
        other_question = create_single_choice_question(
            created_by=other_mentor_user,
            content='其他导师题目',
        )

        response = auth(api_client, admin_user).get('/api/questions/?page=1&page_size=10')

        assert_status(response, 200)
        result_ids = {item['id'] for item in response.data['data']['results']}
        assert mentor_question.id in result_ids
        assert other_question.id in result_ids

    def test_question_resource_scope_ignores_explicit_creator_override(
        self,
        api_client,
        mentor_user,
        other_mentor_user,
    ):
        other_question = create_single_choice_question(
            created_by=other_mentor_user,
            content='范围覆盖可见题目',
        )
        UserScopeGroupOverride.objects.create(
            user=mentor_user,
            scope_group_key='question_resource_scope',
            effect='ALLOW',
            applies_to_role='MENTOR',
            scope_type='EXPLICIT_USERS',
            scope_user_ids=[other_mentor_user.id],
            granted_by=mentor_user,
        )

        response = auth(api_client, mentor_user).get('/api/questions/?page=1&page_size=10')

        assert_status(response, 200)
        result_ids = {item['id'] for item in response.data['data']['results']}
        assert other_question.id not in result_ids

    def test_question_list_hides_history_versions(self, api_client, mentor_user, sample_question):
        quiz = Quiz.objects.create(
            title='题目快照容器',
            quiz_type='PRACTICE',
            created_by=mentor_user,
            updated_by=mentor_user,
        )
        QuizQuestion.objects.create(
            quiz=quiz,
            question=sample_question,
            content=sample_question.content,
            question_type=sample_question.question_type,
            reference_answer=sample_question.reference_answer,
            explanation=sample_question.explanation,
            score=sample_question.score,
            order=1,
        )
        ensure_quiz_revision(quiz, actor=mentor_user)

        response = auth(api_client, mentor_user).get('/api/questions/?page=1&page_size=10')

        assert_status(response, 200)
        result_ids = [item['id'] for item in response.data['data']['results']]
        assert result_ids == [sample_question.id]

    def test_question_list_includes_usage_stats(self, api_client, mentor_user, sample_question, sample_quiz):
        QuizQuestion.objects.create(
            quiz=sample_quiz,
            question=sample_question,
            order=1,
            score=sample_question.score,
        )

        response = auth(api_client, mentor_user).get('/api/questions/?page=1&page_size=10')

        assert_status(response, 200)
        result = next(item for item in response.data['data']['results'] if item['id'] == sample_question.id)
        assert result['usage_count'] == 1
        assert result['is_referenced'] is True

    def test_question_detail_returns_current_question(self, api_client, mentor_user, sample_question):
        response = auth(api_client, mentor_user).get(f'/api/questions/{sample_question.id}/')

        assert_status(response, 200)
        assert response.data['data']['id'] == sample_question.id

    @pytest.mark.parametrize(
        ('path', 'field'),
        [
            ('/api/questions/?created_by=not-an-int', 'created_by'),
            ('/api/questions/?space_tag_id=0', 'space_tag_id'),
        ],
    )
    def test_question_list_rejects_invalid_filters(self, api_client, mentor_user, path, field):
        response = auth(api_client, mentor_user).get(path)

        assert_validation_error(response, field)

    def test_question_create_allows_missing_space_tag(self, api_client, mentor_user):
        response = auth(api_client, mentor_user).post(
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

        assert_status(response, 201)
        assert response.data['code'] == 'SUCCESS'
        assert response.data['data']['space_tag'] is None

    def test_question_create_accepts_question_tags(self, api_client, mentor_user, question_tag):
        response = auth(api_client, mentor_user).post(
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

        assert_status(response, 201)
        assert {item['id'] for item in response.data['data']['tags']} == {question_tag.id}

    def test_question_create_rejects_non_question_scope_tags(
        self,
        api_client,
        mentor_user,
        knowledge_tag,
    ):
        response = auth(api_client, mentor_user).post(
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

        assert_status(response, 400)
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert response.data['message'] == 'tag_ids 包含无效的题目标签ID'

    def test_question_patch_allows_clearing_space_tag(self, api_client, mentor_user, sample_question):
        response = auth(api_client, mentor_user).patch(
            f'/api/questions/{sample_question.id}/',
            {'space_tag_id': None},
            format='json',
        )

        assert_status(response, 200)
        assert response.data['code'] == 'SUCCESS'
        assert response.data['data']['space_tag'] is None
        assert response.data['data']['id'] == sample_question.id

        sample_question.refresh_from_db()
        assert sample_question.space_tag_id is None

    def test_question_patch_logs_tag_update_with_question_identity(
        self,
        api_client,
        mentor_user,
        sample_question,
        question_tag,
    ):
        response = auth(api_client, mentor_user).patch(
            f'/api/questions/{sample_question.id}/',
            {'tag_ids': [question_tag.id]},
            format='json',
        )

        assert_status(response, 200)
        log = ActivityLog.objects.filter(
            category='content',
            target_type='question',
            action='update',
            actor=mentor_user,
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

        assert_success(response)
        assert 'data' in response.data
        assert 'access_token' in response.data['data']
        assert 'refresh_token' in response.data['data']

    def test_login_rejects_missing_employee_id(self, api_client):
        response = api_client.post(
            '/api/auth/login/',
            {'password': 'password123'},
            format='json',
        )

        assert_validation_error(response, 'employee_id')

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

        assert_success(response)
        assert 'access_token' in response.data['data']
        assert 'refresh_token' in response.data['data']

    def test_me_response_is_wrapped(self, api_client, student_user):
        response = auth(api_client, student_user).get('/api/auth/me/')

        assert_success(response)
        assert response.data['data']['user']['id'] == student_user.id


@pytest.mark.django_db
class TestQuizApiContracts:
    def test_quiz_list_response_is_wrapped(self, api_client, mentor_user, sample_quiz):
        response = auth(api_client, mentor_user).get('/api/quizzes/?page=1&page_size=10')

        assert_success(response)
        assert 'data' in response.data
        assert 'results' in response.data['data']
        result_ids = [item['id'] for item in response.data['data']['results']]
        assert sample_quiz.id in result_ids

    def test_quiz_list_only_returns_own_quizzes(
        self,
        api_client,
        mentor_user,
        other_mentor_user,
        sample_quiz,
    ):
        other_quiz = Quiz.objects.create(
            title='其他导师试卷',
            quiz_type='PRACTICE',
            created_by=other_mentor_user,
            updated_by=other_mentor_user,
        )

        response = auth(api_client, mentor_user).get('/api/quizzes/?page=1&page_size=10')

        assert_status(response, 200)
        result_ids = {item['id'] for item in response.data['data']['results']}
        assert sample_quiz.id in result_ids
        assert other_quiz.id not in result_ids

    def test_quiz_detail_hides_other_mentor_quiz(
        self,
        api_client,
        mentor_user,
        other_mentor_user,
    ):
        other_quiz = Quiz.objects.create(
            title='不可见试卷',
            quiz_type='PRACTICE',
            created_by=other_mentor_user,
            updated_by=other_mentor_user,
        )

        response = auth(api_client, mentor_user).get(f'/api/quizzes/{other_quiz.id}/')

        assert_error_code(response, status_code=404, code='RESOURCE_NOT_FOUND')

    def test_admin_can_view_all_quizzes(
        self,
        api_client,
        admin_user,
        admin_role,
        grant_role_permissions,
        mentor_user,
        other_mentor_user,
    ):
        grant_role_permissions(admin_role, ['quiz.view'])
        mentor_quiz = Quiz.objects.create(
            title='导师试卷',
            quiz_type='PRACTICE',
            created_by=mentor_user,
            updated_by=mentor_user,
        )
        other_quiz = Quiz.objects.create(
            title='其他导师试卷',
            quiz_type='PRACTICE',
            created_by=other_mentor_user,
            updated_by=other_mentor_user,
        )

        response = auth(api_client, admin_user).get('/api/quizzes/?page=1&page_size=10')

        assert_status(response, 200)
        result_ids = {item['id'] for item in response.data['data']['results']}
        assert mentor_quiz.id in result_ids
        assert other_quiz.id in result_ids

    def test_quiz_create_rejects_other_mentor_source_question(
        self,
        api_client,
        mentor_user,
        other_mentor_user,
    ):
        other_question = create_single_choice_question(
            created_by=other_mentor_user,
            content='不可引用题目',
        )

        response = auth(api_client, mentor_user).post(
            '/api/quizzes/',
            {
                'title': '跨导师引用试卷',
                'quiz_type': 'PRACTICE',
                'questions': [
                    {
                        'source_question_id': other_question.id,
                        'content': '跨导师引用题目',
                        'question_type': 'SINGLE_CHOICE',
                        'options': [
                            {'key': 'A', 'value': '选项A'},
                            {'key': 'B', 'value': '选项B'},
                        ],
                        'answer': 'A',
                        'score': '1',
                    }
                ],
            },
            format='json',
        )

        assert_error_code(response, status_code=404, code='RESOURCE_NOT_FOUND')

    def test_task_resource_options_hide_other_mentor_quizzes(
        self,
        api_client,
        mentor_user,
        other_mentor_user,
        sample_quiz,
    ):
        other_quiz = Quiz.objects.create(
            title='任务资源库不可见试卷',
            quiz_type='PRACTICE',
            created_by=other_mentor_user,
            updated_by=other_mentor_user,
        )

        response = auth(api_client, mentor_user).get('/api/tasks/resource-options/?resource_type=QUIZ')

        assert_status(response, 200)
        result_ids = {item['id'] for item in response.data['data']['results']}
        assert sample_quiz.id in result_ids
        assert other_quiz.id not in result_ids

    def test_quiz_list_hides_history_versions(self, api_client, mentor_user, sample_quiz):
        ensure_quiz_revision(sample_quiz, actor=mentor_user)

        response = auth(api_client, mentor_user).get('/api/quizzes/?page=1&page_size=10')

        assert_status(response, 200)
        result_ids = [item['id'] for item in response.data['data']['results']]
        assert result_ids == [sample_quiz.id]

    def test_quiz_list_rejects_invalid_created_by(self, api_client, mentor_user):
        response = auth(api_client, mentor_user).get('/api/quizzes/?created_by=invalid')

        assert_validation_error(response, 'created_by')


@pytest.mark.django_db
class TestTagApiContracts:
    def test_tag_list_response_is_wrapped(self, api_client, mentor_user, space_tag):
        response = auth(api_client, mentor_user).get('/api/tags/?tag_type=SPACE')

        assert_success(response)
        assert isinstance(response.data['data'], list)
        result_ids = [item['id'] for item in response.data['data']]
        assert space_tag.id in result_ids

    def test_student_can_list_space_tags_for_knowledge_filters(self, api_client, student_user, space_tag):
        response = auth(api_client, student_user).get('/api/tags/?tag_type=SPACE')

        assert_status(response, 200)
        result_ids = [item['id'] for item in response.data['data']]
        assert space_tag.id in result_ids

    @pytest.mark.parametrize(
        ('user_fixture', 'path', 'status_code', 'code', 'field'),
        [
            ('student_user', '/api/tags/?tag_type=TAG', 403, 'PERMISSION_DENIED', None),
            ('mentor_user', '/api/tags/?limit=bad', 400, 'VALIDATION_ERROR', 'limit'),
        ],
    )
    def test_tag_list_rejects_invalid_requests(
        self,
        request,
        api_client,
        user_fixture,
        path,
        status_code,
        code,
        field,
    ):
        response = auth(api_client, request.getfixturevalue(user_fixture)).get(path)

        if code == 'PERMISSION_DENIED':
            assert_permission_denied(response)
            return
        assert_error_code(response, status_code=status_code, code=code)
        assert field in response.data['message']

    def test_tag_list_supports_scope_filter(self, api_client, mentor_user, knowledge_tag, question_tag):
        response = auth(api_client, mentor_user).get('/api/tags/?tag_type=TAG&applicable_to=question')

        assert_status(response, 200)
        result_ids = {item['id'] for item in response.data['data']}
        assert question_tag.id in result_ids
        assert knowledge_tag.id not in result_ids

    def test_tag_create_rejects_name_duplicated_with_other_type(self, api_client, admin_user, space_tag):
        response = auth(api_client, admin_user).post(
            '/api/tags/',
            {
                'name': space_tag.name,
                'tag_type': 'TAG',
                'allow_knowledge': True,
                'allow_question': False,
            },
            format='json',
        )

        assert_status(response, 400)
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert response.data['message'] == '标签名称不能与其他类型重复'

    def test_tag_create_can_auto_extend_scope_and_reuse_existing_tag(
        self,
        api_client,
        admin_user,
        knowledge_tag,
    ):
        response = auth(api_client, admin_user).post(
            '/api/tags/',
            {
                'name': knowledge_tag.name,
                'tag_type': 'TAG',
                'current_module': 'question',
                'extend_scope': True,
            },
            format='json',
        )

        assert_status(response, 201)
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
        response = auth(api_client, admin_user).post(
            '/api/tags/',
            {
                'name': knowledge_tag.name,
                'tag_type': 'TAG',
                'current_module': 'question',
                'extend_scope': False,
            },
            format='json',
        )

        assert_status(response, 400)
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert response.data['message'] == '已存在同名标签，可扩展适用范围后复用'
        assert response.data['details']['existing_tag_id'] == knowledge_tag.id
        assert response.data['details']['requires_scope_extension'] is True

        knowledge_tag.refresh_from_db()
        assert knowledge_tag.allow_question is False

    def test_tag_patch_rejects_name_duplicated_with_other_type(self, api_client, admin_user, space_tag, knowledge_tag):
        response = auth(api_client, admin_user).patch(
            f'/api/tags/{knowledge_tag.id}/',
            {'name': space_tag.name},
            format='json',
        )

        assert_status(response, 400)
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

        response = auth(api_client, admin_user).patch(
            f'/api/tags/{knowledge_tag.id}/',
            {
                'tag_type': 'SPACE',
                'color': '#123456',
                'sort_order': 9,
            },
            format='json',
        )

        assert_status(response, 200)
        assert response.data['data']['tag_type'] == 'SPACE'

        sample_knowledge.refresh_from_db()
        sample_question.refresh_from_db()
        knowledge_tag.refresh_from_db()
        assert sample_knowledge.space_tag_id == knowledge_tag.id
        assert sample_question.space_tag_id == knowledge_tag.id
        assert sample_knowledge.tags.count() == 0
        assert sample_question.tags.count() == 0

    def test_space_tag_create_appends_to_end_by_default(self, api_client, admin_user, space_tag):
        Tag.objects.create(
            name='第二个空间',
            tag_type='SPACE',
            allow_knowledge=True,
            allow_question=True,
            sort_order=2,
        )

        response = auth(api_client, admin_user).post(
            '/api/tags/',
            {
                'name': '第三个空间',
                'tag_type': 'SPACE',
                'color': '#123456',
            },
            format='json',
        )

        assert_status(response, 201)
        assert response.data['data']['sort_order'] == 3

    def test_space_tag_reorder_updates_sort_order(self, api_client, admin_user, space_tag):
        second_space_tag = Tag.objects.create(
            name='第二个空间',
            tag_type='SPACE',
            allow_knowledge=True,
            allow_question=True,
            sort_order=2,
        )
        third_space_tag = Tag.objects.create(
            name='第三个空间',
            tag_type='SPACE',
            allow_knowledge=True,
            allow_question=True,
            sort_order=3,
        )

        response = auth(api_client, admin_user).post(
            '/api/tags/reorder/',
            {
                'ordered_tag_ids': [third_space_tag.id, space_tag.id, second_space_tag.id],
            },
            format='json',
        )

        assert_status(response, 200)

        space_tag.refresh_from_db()
        second_space_tag.refresh_from_db()
        third_space_tag.refresh_from_db()
        assert third_space_tag.sort_order == 1
        assert space_tag.sort_order == 2
        assert second_space_tag.sort_order == 3

    def test_tag_patch_can_convert_space_to_tag(
        self,
        api_client,
        admin_user,
        space_tag,
        sample_knowledge,
        sample_question,
    ):
        response = auth(api_client, admin_user).patch(
            f'/api/tags/{space_tag.id}/',
            {
                'tag_type': 'TAG',
                'allow_knowledge': True,
                'allow_question': True,
            },
            format='json',
        )

        assert_status(response, 200)
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

        response = auth(api_client, admin_user).post(
            '/api/tags/merge/',
            {
                'source_tag_ids': [knowledge_tag.id, sibling_tag.id],
                'merged_name': '统一标签',
            },
            format='json',
        )

        assert_status(response, 200)
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
        response = auth(api_client, admin_user).post(
            '/api/tags/merge/',
            {
                'source_tag_ids': [knowledge_tag.id, space_tag.id],
                'merged_name': '不能合并',
            },
            format='json',
        )

        assert_status(response, 400)
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
        
        response = auth(api_client, admin_user).delete(f'/api/tags/{space_tag.id}/')

        assert_status(response, 200)
        assert response.data['code'] == 'SUCCESS'
        assert not Tag.objects.filter(id=space_tag.id).exists()

        sample_knowledge.refresh_from_db()
        sample_question.refresh_from_db()
        assert sample_knowledge.space_tag_id is None
        assert sample_question.space_tag_id is None


@pytest.mark.django_db
class TestKnowledgeApiContracts:
    def test_knowledge_list_response_is_wrapped(self, api_client, mentor_user, sample_knowledge):
        response = auth(api_client, mentor_user).get('/api/knowledge/?page=1&page_size=10')

        assert_success(response)
        assert 'data' in response.data
        assert 'results' in response.data['data']
        result_ids = [item['id'] for item in response.data['data']['results']]
        assert sample_knowledge.id in result_ids

    def test_knowledge_list_hides_history_versions(self, api_client, mentor_user, sample_knowledge):
        ensure_knowledge_revision(sample_knowledge, actor=mentor_user)

        response = auth(api_client, mentor_user).get('/api/knowledge/?page=1&page_size=10')

        assert_status(response, 200)
        result_ids = [item['id'] for item in response.data['data']['results']]
        assert result_ids == [sample_knowledge.id]

    def test_knowledge_list_rejects_invalid_space_tag_id(self, api_client, mentor_user):
        response = auth(api_client, mentor_user).get('/api/knowledge/?space_tag_id=bad')

        assert_validation_error(response, 'space_tag_id')

    def test_knowledge_detail_response_is_wrapped(self, api_client, mentor_user, sample_knowledge):
        response = auth(api_client, mentor_user).get(f'/api/knowledge/{sample_knowledge.id}/')

        assert_success(response)
        assert response.data['data']['id'] == sample_knowledge.id

    def test_knowledge_detail_returns_current_document(self, api_client, mentor_user, sample_knowledge):
        response = auth(api_client, mentor_user).get(f'/api/knowledge/{sample_knowledge.id}/')

        assert_status(response, 200)
        assert response.data['data']['id'] == sample_knowledge.id

    def test_knowledge_increment_view_count_response_is_wrapped(self, api_client, mentor_user, sample_knowledge):
        response = auth(api_client, mentor_user).post(f'/api/knowledge/{sample_knowledge.id}/view/')

        assert_success(response)
        assert response.data['data']['view_count'] >= 1

    def test_knowledge_delete_hard_deletes_record(self, api_client, admin_user, sample_knowledge):
        response = auth(api_client, admin_user).delete(f'/api/knowledge/{sample_knowledge.id}/')

        assert_status(response, 200)
        assert response.data['code'] == 'SUCCESS'
        assert not Knowledge.objects.filter(id=sample_knowledge.id).exists()

    def test_knowledge_create_allows_missing_title(self, api_client, admin_user, space_tag):
        response = auth(api_client, admin_user).post(
            '/api/knowledge/',
            {
                'space_tag_id': space_tag.id,
                'content': '<p>无标题正文内容</p>',
            },
            format='json',
        )

        assert_success(response, status_code=201, message='创建成功')
        assert response.data['data']['title'] == ''

    def test_knowledge_create_allows_missing_space_tag(self, api_client, admin_user):
        response = auth(api_client, admin_user).post(
            '/api/knowledge/',
            {
                'content': '<p>无space正文内容</p>',
            },
            format='json',
        )

        assert_success(response, status_code=201, message='创建成功')
        assert response.data['data']['space_tag'] is None

    def test_knowledge_create_rejects_empty_content(self, api_client, admin_user):
        response = auth(api_client, admin_user).post(
            '/api/knowledge/',
            {
                'title': '仅标题',
                'space_tag_id': None,
            },
            format='json',
        )

        assert_status(response, 400)
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert response.data['message'] == '知识文档必须填写正文内容'

    def test_knowledge_create_rejects_non_knowledge_scope_tags(
        self,
        api_client,
        admin_user,
        question_tag,
    ):
        response = auth(api_client, admin_user).post(
            '/api/knowledge/',
            {
                'title': '错误标签知识',
                'content': '<p>正文</p>',
                'tag_ids': [question_tag.id],
            },
            format='json',
        )

        assert_status(response, 400)
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert response.data['message'] == 'tag_ids 包含无效的知识标签ID'

    def test_knowledge_patch_allows_blank_title(self, api_client, admin_user, sample_knowledge):
        response = auth(api_client, admin_user).patch(
            f'/api/knowledge/{sample_knowledge.id}/',
            {'title': ''},
            format='json',
        )

        assert_success(response)
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

        response = auth(api_client, admin_user).patch(
            f'/api/knowledge/{sample_knowledge.id}/',
            {'tag_ids': [target_tag.id]},
            format='json'
        )

        assert_status(response, 200)
        data = response.data['data']
        assert data['space_tag']['id'] == sample_knowledge.space_tag_id
        assert {item['id'] for item in data['tags']} == {target_tag.id}
        assert data['id'] == sample_knowledge.id

        sample_knowledge.refresh_from_db()
        assert sample_knowledge.space_tag_id is not None
        assert set(sample_knowledge.tags.values_list('id', flat=True)) == {target_tag.id}

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

        response = auth(api_client, admin_user).patch(
            f'/api/knowledge/{sample_knowledge.id}/',
            {'space_tag_id': target_space_tag.id},
            format='json'
        )

        assert_status(response, 200)
        data = response.data['data']
        assert data['space_tag']['id'] == target_space_tag.id
        assert {item['id'] for item in data['tags']} == {source_tag.id}
        assert data['id'] == sample_knowledge.id

        sample_knowledge.refresh_from_db()
        assert sample_knowledge.space_tag_id == target_space_tag.id
        assert set(sample_knowledge.tags.values_list('id', flat=True)) == {source_tag.id}

    def test_knowledge_patch_only_related_links_inherits_existing_content(
        self,
        api_client,
        admin_user,
        sample_knowledge,
    ):
        response = auth(api_client, admin_user).patch(
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

        assert_status(response, 200)
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
        response = auth(api_client, student_user).get('/api/tasks/my-assignments/?page=1&page_size=10')

        assert_success(response)
        assert 'data' in response.data
        assert 'results' in response.data['data']
        assert 'count' in response.data['data']
        task_ids = [item['task_id'] for item in response.data['data']['results']]
        assert student_assignment.task_id in task_ids

    def test_student_assignment_list_rejects_invalid_page(self, api_client, student_user):
        response = auth(api_client, student_user).get('/api/tasks/my-assignments/?page=abc')

        assert_status(response, 404)
        assert response.data['code'] == 'RESOURCE_NOT_FOUND'
        assert response.data['message'] == '无效页面。'

    def test_student_assignment_list_caps_oversized_page_size(self, api_client, student_user):
        response = auth(api_client, student_user).get('/api/tasks/my-assignments/?page_size=999')

        assert_status(response, 200)
        assert response.data['code'] == 'SUCCESS'
        assert response.data['data']['page_size'] == 100

    def test_complete_knowledge_syncs_assignment_completion(
        self,
        api_client,
        student_user,
        mentor_user,
        sample_knowledge,
    ):
        task = Task.objects.create(
            title='知识完成任务',
            description='用于验证完成状态同步',
            deadline=timezone.now() + timezone.timedelta(days=3),
            created_by=mentor_user,
            updated_by=mentor_user,
        )
        assignment = TaskAssignment.objects.create(
            task=task,
            assignee=student_user,
            status='IN_PROGRESS',
        )
        knowledge_revision = ensure_knowledge_revision(sample_knowledge, actor=mentor_user)
        task_knowledge = TaskKnowledge.objects.create(
            task=task,
            knowledge=knowledge_revision,
            source_knowledge=sample_knowledge,
            order=1,
        )

        response = auth(api_client, student_user).post(
            f'/api/tasks/{task.id}/complete-knowledge/',
            {'task_knowledge_id': task_knowledge.id},
            format='json',
        )

        assert_success(response)
        assignment.refresh_from_db()
        assert response.data['data']['task_completed'] is True
        assert assignment.status == 'COMPLETED'
        assert assignment.completed_at is not None

    def test_student_assignment_status_distinguishes_not_started_and_pending_grading(
        self,
        api_client,
        student_user,
        mentor_user,
        sample_quiz,
    ):
        not_started_task = Task.objects.create(
            title='未开始任务',
            description='',
            deadline=timezone.now() + timezone.timedelta(days=3),
            created_by=mentor_user,
            updated_by=mentor_user,
        )
        not_started_assignment = TaskAssignment.objects.create(
            task=not_started_task,
            assignee=student_user,
            status='IN_PROGRESS',
        )

        pending_task = Task.objects.create(
            title='待批改任务',
            description='',
            deadline=timezone.now() + timezone.timedelta(days=3),
            created_by=mentor_user,
            updated_by=mentor_user,
        )
        pending_assignment = TaskAssignment.objects.create(
            task=pending_task,
            assignee=student_user,
            status='IN_PROGRESS',
        )
        task_quiz = _ensure_task_quiz(task=pending_task, quiz=sample_quiz, actor=mentor_user, order=1)
        Submission.objects.create(
            task_assignment=pending_assignment,
            task_quiz=task_quiz,
            quiz=task_quiz.quiz,
            user=student_user,
            status='GRADING',
            submitted_at=timezone.now(),
        )

        response = auth(api_client, student_user).get('/api/tasks/my-assignments/?page=1&page_size=20')

        assert_success(response)
        status_by_task_id = {
            item['task_id']: (item['status'], item['status_display'])
            for item in response.data['data']['results']
        }
        assert status_by_task_id[not_started_assignment.task_id] == ('NOT_STARTED', '未开始')
        assert status_by_task_id[pending_assignment.task_id] == ('PENDING_GRADING', '待批改')

        not_started_response = auth(api_client, student_user).get('/api/tasks/my-assignments/?status=NOT_STARTED&page=1&page_size=20')
        pending_response = auth(api_client, student_user).get('/api/tasks/my-assignments/?status=PENDING_GRADING&page=1&page_size=20')

        assert_success(not_started_response)
        assert [item['task_id'] for item in not_started_response.data['data']['results']] == [not_started_task.id]
        assert_success(pending_response)
        assert [item['task_id'] for item in pending_response.data['data']['results']] == [pending_task.id]


@pytest.mark.django_db
class TestTaskListApiContracts:
    def test_task_list_response_is_wrapped(self, api_client, student_user, student_assignment):
        response = auth(api_client, student_user).get('/api/tasks/?status=open&page=1&page_size=10')

        assert_success(response)
        assert 'data' in response.data
        assert 'results' in response.data['data']
        task_ids = [item['id'] for item in response.data['data']['results']]
        assert student_assignment.task_id in task_ids

    def test_task_list_rejects_invalid_status(self, api_client, student_user):
        response = auth(api_client, student_user).get('/api/tasks/?status=unknown')

        assert_validation_error(response, 'status')

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

        response = auth(api_client, student_user).get('/api/tasks/?status=closed&page=1&page_size=10')

        assert_status(response, 200)
        result_ids = [item['id'] for item in response.data['data']['results']]
        assert expired_task.id in result_ids
        assert student_assignment.task_id not in result_ids

    def test_task_list_supports_search_by_title(self, api_client, student_user, mentor_user):
        matched_task = Task.objects.create(
            title='搜索命中任务',
            description='用于验证任务标题搜索',
            deadline=timezone.now() + timezone.timedelta(days=3),
            created_by=mentor_user,
            updated_by=mentor_user,
        )
        TaskAssignment.objects.create(
            task=matched_task,
            assignee=student_user,
            status='IN_PROGRESS',
        )

        unmatched_task = Task.objects.create(
            title='另一条任务',
            description='用于验证任务标题搜索',
            deadline=timezone.now() + timezone.timedelta(days=3),
            created_by=mentor_user,
            updated_by=mentor_user,
        )
        TaskAssignment.objects.create(
            task=unmatched_task,
            assignee=student_user,
            status='IN_PROGRESS',
        )

        response = auth(api_client, student_user).get('/api/tasks/?search=命中&page=1&page_size=10')

        assert_status(response, 200)
        result_ids = [item['id'] for item in response.data['data']['results']]
        assert matched_task.id in result_ids
        assert len(result_ids) == 1

    def test_task_list_includes_risk_counters(self, api_client, student_user, mentor_user, sample_quiz):
        task = Task.objects.create(
            title='风险计数任务',
            description='用于验证任务列表风险字段',
            deadline=timezone.now() + timezone.timedelta(days=2),
            created_by=mentor_user,
            updated_by=mentor_user,
        )
        assignment = TaskAssignment.objects.create(
            task=task,
            assignee=student_user,
            status='COMPLETED',
            completed_at=timezone.now(),
        )
        quiz_revision = ensure_quiz_revision(sample_quiz, actor=mentor_user)
        task_quiz = TaskQuiz.objects.create(
            task=task,
            quiz=quiz_revision,
            source_quiz=sample_quiz,
            order=1,
        )
        submission = Submission.objects.create(
            task_assignment=assignment,
            task_quiz=task_quiz,
            quiz=quiz_revision,
            user=student_user,
            status='GRADING',
        )
        submission.started_at = timezone.now() - timezone.timedelta(minutes=3)
        submission.submitted_at = timezone.now()
        submission.save(update_fields=['started_at', 'submitted_at'])

        response = auth(api_client, student_user).get('/api/tasks/?search=风险计数&page=1&page_size=10')

        assert_status(response, 200)
        result = response.data['data']['results'][0]
        assert result['pending_grading_count'] == 1
        assert result['abnormal_count'] == 1


@pytest.mark.django_db
class TestUserManagementApiContracts:
    def test_user_list_response_is_wrapped(self, api_client, admin_user, student_user):
        response = auth(api_client, admin_user).get('/api/users/?is_active=true')

        assert_success(response)
        assert isinstance(response.data['data'], list)
        assert response.data['data'][0]['avatar_key'] == student_user.avatar_key
        user_ids = [item['id'] for item in response.data['data']]
        assert admin_user.id in user_ids
        assert student_user.id in user_ids

    @pytest.mark.parametrize(
        ('path', 'field'),
        [
            ('/api/users/?is_active=maybe', 'is_active'),
            ('/api/users/?department_id=oops', 'department_id'),
        ],
    )
    def test_user_list_rejects_invalid_filters(self, api_client, admin_user, path, field):
        response = auth(api_client, admin_user).get(path)

        assert_validation_error(response, field)


@pytest.mark.django_db
class TestAssignableUserApiContracts:
    def test_assignable_user_list_response_is_wrapped(self, api_client, mentor_user, student_user):
        response = auth(api_client, mentor_user).get('/api/tasks/assignable-users/')

        assert_success(response)
        assert isinstance(response.data['data'], list)
        result_ids = [item['id'] for item in response.data['data']]
        assert student_user.id in result_ids

    def test_assignable_user_list_rejects_invalid_department_id(self, api_client, mentor_user):
        response = auth(api_client, mentor_user).get('/api/tasks/assignable-users/?department_id=bad')

        assert_validation_error(response, 'department_id')


@pytest.mark.django_db
class TestTaskResourceOptionApiContracts:
    def test_task_resource_options_response_is_wrapped(self, api_client, mentor_user, sample_knowledge, sample_quiz):
        response = auth(api_client, mentor_user).get('/api/tasks/resource-options/?resource_type=ALL&page=1&page_size=10')

        assert_success(response)
        assert 'results' in response.data['data']
        result_ids = {(item['resource_type'], item['id']) for item in response.data['data']['results']}
        assert ('DOCUMENT', sample_knowledge.id) in result_ids
        assert ('QUIZ', sample_quiz.id) in result_ids

    def test_task_resource_options_hide_historical_versions(self, api_client, mentor_user, sample_knowledge, sample_quiz):
        ensure_knowledge_revision(sample_knowledge, actor=mentor_user)
        ensure_quiz_revision(sample_quiz, actor=mentor_user)

        response = auth(api_client, mentor_user).get('/api/tasks/resource-options/?resource_type=ALL&page=1&page_size=10')

        assert_status(response, 200)
        result_ids = {(item['resource_type'], item['id']) for item in response.data['data']['results']}
        assert ('DOCUMENT', sample_knowledge.id) in result_ids
        assert ('QUIZ', sample_quiz.id) in result_ids
        assert len(result_ids) == 2

    def test_task_resource_options_support_excluding_selected_resources(self, api_client, mentor_user, sample_knowledge, sample_quiz):
        response = auth(api_client, mentor_user).get(
            f'/api/tasks/resource-options/?resource_type=ALL&page=1&page_size=10'
            f'&exclude_document_ids={sample_knowledge.id}&exclude_quiz_ids={sample_quiz.id}'
        )

        assert_status(response, 200)
        result_ids = {(item['resource_type'], item['id']) for item in response.data['data']['results']}
        assert ('DOCUMENT', sample_knowledge.id) not in result_ids
        assert ('QUIZ', sample_quiz.id) not in result_ids

    def test_task_create_rejects_other_mentor_quiz(
        self,
        api_client,
        mentor_user,
        other_mentor_user,
        student_user,
    ):
        other_quiz = Quiz.objects.create(
            title='任务不可引用试卷',
            quiz_type='PRACTICE',
            created_by=other_mentor_user,
            updated_by=other_mentor_user,
        )

        response = auth(api_client, mentor_user).post(
            '/api/tasks/create/',
            {
                'title': '跨导师试卷任务',
                'description': '',
                'deadline': (timezone.now() + timezone.timedelta(days=1)).isoformat(),
                'quiz_ids': [other_quiz.id],
                'assignee_ids': [student_user.id],
            },
            format='json',
        )

        assert_error_code(response, status_code=404, code='RESOURCE_NOT_FOUND')


@pytest.mark.django_db
class TestSpotCheckApiContracts:
    def test_spot_check_create_response_is_wrapped(self, api_client, mentor_user, student_user):
        response = auth(api_client, mentor_user).post(
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

        assert_success(response, status_code=201, message='创建成功')
        assert 'data' in response.data
        assert response.data['data']['student'] == student_user.id
        assert response.data['data']['topic_count'] == 1

    def test_spot_check_list_response_is_wrapped(self, api_client, mentor_user, sample_spot_check):
        response = auth(api_client, mentor_user).get('/api/spot-checks/?page=1&page_size=10')

        assert_success(response)
        assert 'data' in response.data
        assert 'results' in response.data['data']
        result_ids = [item['id'] for item in response.data['data']['results']]
        assert sample_spot_check.id in result_ids
        result = next(item for item in response.data['data']['results'] if item['id'] == sample_spot_check.id)
        assert result['student_avatar_key'] == sample_spot_check.student.avatar_key
        assert result['checker_avatar_key'] == sample_spot_check.checker.avatar_key
        assert result['topic_summary'] == sample_spot_check.topic_summary

    def test_spot_check_list_rejects_invalid_student_id(self, api_client, mentor_user):
        response = auth(api_client, mentor_user).get('/api/spot-checks/?student_id=bad')

        assert_validation_error(response, 'student_id')

    def test_spot_check_detail_response_is_wrapped(self, api_client, mentor_user, sample_spot_check):
        response = auth(api_client, mentor_user).get(f'/api/spot-checks/{sample_spot_check.id}/')

        assert_success(response)
        assert response.data['data']['id'] == sample_spot_check.id
        assert response.data['data']['student_avatar_key'] == sample_spot_check.student.avatar_key
        assert response.data['data']['checker_avatar_key'] == sample_spot_check.checker.avatar_key
        assert response.data['data']['items'][0]['topic'] == '契约测试抽查'

    def test_spot_check_patch_response_is_wrapped(self, api_client, mentor_user, sample_spot_check):
        response = auth(api_client, mentor_user).patch(
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

        assert_success(response)
        assert response.data['data']['items'][0]['comment'] == '已更新评语'

    def test_spot_check_student_list_includes_students_without_records(
        self,
        api_client,
        create_spot_check,
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
        create_spot_check(student_user, mentor_user)

        response = auth(api_client, mentor_user).get('/api/spot-checks/students/')

        assert_success(response)
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
        response = auth(api_client, student_user).post(
            '/api/submissions/start/',
            {
                'assignment_id': student_assignment.id,
                'quiz_id': practice_task_quiz.id,
            },
            format='json',
        )

        assert_status(response, 201)
        assert response.data['code'] == 'SUCCESS'
        assert 'data' in response.data
        assert response.data['data']['task_title'] == student_assignment.task.title

    def test_submit_response_is_wrapped(self, api_client, student_user, in_progress_submission):
        response = auth(api_client, student_user).post(f'/api/submissions/{in_progress_submission.id}/submit/')

        assert_success(response)
        assert response.data['data']['id'] == in_progress_submission.id

    def test_save_answer_rejects_invalid_question_id(self, api_client, student_user, in_progress_submission):
        response = auth(api_client, student_user).post(
            f'/api/submissions/{in_progress_submission.id}/save-answer/',
            {'question_id': 999999, 'user_answer': 'A'},
            format='json',
        )

        assert_error_code(response, status_code=404, code='RESOURCE_NOT_FOUND')
        assert response.data['message'] == '题目不在此答卷中'

    def test_save_answer_supports_marking_question(
        self,
        api_client,
        student_user,
        in_progress_submission,
    ):
        target_answer = in_progress_submission.answers.order_by('id').first()
        assert target_answer is not None

        response = auth(api_client, student_user).post(
            f'/api/submissions/{in_progress_submission.id}/save-answer/',
            {'question_id': target_answer.question_id, 'is_marked': True},
            format='json',
        )

        target_answer.refresh_from_db()

        assert_status(response, 200)
        assert response.data['code'] == 'SUCCESS'
        assert response.data['data']['question_id'] == target_answer.question_id
        assert response.data['data']['is_marked'] is True
        assert target_answer.is_marked is True

    def test_practice_result_response_is_wrapped(self, api_client, student_user, submitted_practice_submission):
        response = auth(api_client, student_user).get(f'/api/submissions/{submitted_practice_submission.id}/result/')

        assert_success(response)
        assert response.data['data']['id'] == submitted_practice_submission.id

    def test_exam_result_response_is_wrapped(self, api_client, student_user, submitted_exam_submission):
        response = auth(api_client, student_user).get(f'/api/submissions/{submitted_exam_submission.id}/result/')

        assert_success(response)
        assert response.data['data']['id'] == submitted_exam_submission.id

    def test_practice_result_rejects_in_progress_submission(self, api_client, student_user, in_progress_submission):
        response = auth(api_client, student_user).get(f'/api/submissions/{in_progress_submission.id}/result/')

        assert_status(response, 400)
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
        mentor = as_role(mentor_user, 'MENTOR')
        response = auth(api_client, mentor).get(
            f'/api/tasks/{task.id}/analytics/',
        )

        assert_success(response)
        assert 'completion' in response.data['data']
        assert 'accuracy' in response.data['data']
        assert 'time_distribution' in response.data['data']

    def test_student_executions_response_is_wrapped(self, api_client, mentor_user, student_user):
        task = self._create_mentor_task(mentor_user, student_user)
        mentor = as_role(mentor_user, 'MENTOR')
        response = auth(api_client, mentor).get(
            f'/api/tasks/{task.id}/student-executions/',
        )

        assert_success(response)
        assert isinstance(response.data['data'], list)
        assert response.data['data'][0]['status'] == 'NOT_STARTED'

    def test_student_executions_marks_pending_grading(
        self,
        api_client,
        mentor_user,
        student_user,
        sample_quiz,
    ):
        task = self._create_mentor_task(mentor_user, student_user)
        assignment = TaskAssignment.objects.get(task=task, assignee=student_user)
        task_quiz = _ensure_task_quiz(task=task, quiz=sample_quiz, actor=mentor_user, order=1)
        Submission.objects.create(
            task_assignment=assignment,
            task_quiz=task_quiz,
            quiz=task_quiz.quiz,
            user=student_user,
            status='GRADING',
            submitted_at=timezone.now(),
        )

        mentor = as_role(mentor_user, 'MENTOR')
        response = auth(api_client, mentor).get(f'/api/tasks/{task.id}/student-executions/')

        assert_success(response)
        assert response.data['data'][0]['status'] == 'PENDING_GRADING'

    def test_task_time_uses_learning_and_submission_duration(
        self,
        api_client,
        mentor_user,
        student_user,
        sample_knowledge,
        sample_quiz,
    ):
        task = self._create_mentor_task(mentor_user, student_user)
        assignment = TaskAssignment.objects.get(task=task, assignee=student_user)
        now = timezone.now()
        TaskAssignment.objects.filter(pk=assignment.pk).update(
            status='COMPLETED',
            created_at=now - timezone.timedelta(minutes=305),
            completed_at=now,
        )
        assignment.refresh_from_db()

        knowledge_revision = ensure_knowledge_revision(sample_knowledge, actor=mentor_user)
        task_knowledge = TaskKnowledge.objects.create(
            task=task,
            knowledge=knowledge_revision,
            source_knowledge=sample_knowledge,
            order=1,
        )
        KnowledgeLearningProgress.objects.create(
            assignment=assignment,
            task_knowledge=task_knowledge,
            is_completed=True,
            started_at=now - timezone.timedelta(minutes=40),
            completed_at=now,
        )

        task_quiz = _ensure_task_quiz(task=task, quiz=sample_quiz, actor=mentor_user, order=1)
        submission = Submission.objects.create(
            task_assignment=assignment,
            task_quiz=task_quiz,
            quiz=task_quiz.quiz,
            user=student_user,
            status='GRADED',
            submitted_at=now,
        )
        Submission.objects.filter(pk=submission.pk).update(
            started_at=now - timezone.timedelta(minutes=25)
        )

        mentor = as_role(mentor_user, 'MENTOR')
        analytics_response = auth(api_client, mentor).get(f'/api/tasks/{task.id}/analytics/')
        executions_response = auth(api_client, mentor).get(f'/api/tasks/{task.id}/student-executions/')

        assert_success(analytics_response)
        assert analytics_response.data['data']['average_time'] == 65.0
        assert analytics_response.data['data']['time_distribution'][-1] == {
            'range': '60+',
            'count': 1,
        }
        assert_success(executions_response)
        assert executions_response.data['data'][0]['time_spent'] == 65


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

    @pytest.mark.parametrize(
        ('path_template', 'field'),
        [
            ('/api/grading/tasks/{task_id}/questions/', 'quiz_id'),
            ('/api/grading/tasks/{task_id}/answers/?quiz_id=1&question_id=bad', 'question_id'),
        ],
    )
    def test_grading_rejects_invalid_queries(
        self,
        api_client,
        mentor_user,
        student_user,
        path_template,
        field,
    ):
        task = self._create_mentor_task(mentor_user, student_user)
        response = auth(api_client, as_role(mentor_user, 'MENTOR')).get(
            path_template.format(task_id=task.id),
        )

        assert_validation_error(response, field)


@pytest.mark.django_db
class TestActivityLogApiContracts:
    def test_activity_log_list_only_returns_members_with_logs(
        self,
        api_client,
        admin_user,
        mentor_user,
        department,
    ):
        User.objects.create_user(
            employee_id='CONTRACT_NO_LOG_001',
            username='无日志用户',
            password='password123',
            department=department,
        )
        create_activity_log(
            category='user',
            actor=admin_user,
            action='login',
            summary=f'{admin_user.username} 登录成功',
            description=f'账号：{admin_user.username}（{admin_user.employee_id}）',
            target_type='user',
            target_id=str(admin_user.id),
            target_title=admin_user.username,
        )
        create_activity_log(
            category='user',
            actor=mentor_user,
            action='login',
            summary=f'{mentor_user.username} 登录成功',
            description=f'账号：{mentor_user.username}（{mentor_user.employee_id}）',
            target_type='user',
            target_id=str(mentor_user.id),
            target_title=mentor_user.username,
        )

        response = auth(api_client, admin_user).get('/api/logs/?type=user&page=1&page_size=10')

        assert_success(response)
        result_ids = {item['user']['id'] for item in response.data['data']['members']}
        assert admin_user.id in result_ids
        assert mentor_user.id in result_ids
        assert len(result_ids) == 2

    def test_activity_log_list_response_is_wrapped(self, api_client, admin_user, student_user):
        log = create_activity_log(
            category='user',
            actor=admin_user,
            action='role_assigned',
            summary=f'{admin_user.username} 更新了用户角色',
            description=f'被操作账号：{student_user.username}（{student_user.employee_id}）；新增角色：学员',
            status='success',
            target_type='user',
            target_id=str(student_user.id),
            target_title=student_user.username,
        )
        response = auth(api_client, admin_user).get('/api/logs/?type=user&page=1&page_size=10')

        assert_success(response)
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
        create_activity_log(
            category='content',
            actor=admin_user,
            action='create',
            summary=f'{admin_user.username} 创建了知识文档《知识A》',
            description='管理员创建知识',
            status='success',
            target_type='knowledge',
            target_id='K-1',
            target_title='知识A',
        )
        mentor_log = create_activity_log(
            category='content',
            actor=mentor_user,
            action='update',
            summary=f'{mentor_user.username} 更新了试卷《导师试卷》',
            description='导师更新试卷',
            status='success',
            target_type='quiz',
            target_id='Q-1',
            target_title='导师试卷',
        )

        response = auth(api_client, admin_user).get(f'/api/logs/?type=content&member_ids={mentor_user.id}&page=1&page_size=10')

        assert_status(response, 200)
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
        create_activity_log(
            category='content',
            actor=admin_user,
            action='create',
            summary=f'{admin_user.username} 创建了知识文档《管理员知识》',
            description='管理员创建知识',
            status='success',
            target_type='knowledge',
            target_id='K-1',
            target_title='管理员知识',
        )
        mentor_log = create_activity_log(
            category='content',
            actor=mentor_user,
            action='update',
            summary=f'{mentor_user.username} 更新了试卷《导师试卷》',
            description='导师更新试卷',
            status='success',
            target_type='quiz',
            target_id='Q-1',
            target_title='导师试卷',
        )

        response = auth(api_client, admin_user).get(f'/api/logs/?type=content&member_ids={mentor_user.id}&page=1&page_size=10')

        assert_status(response, 200)
        assert response.data['data']['count'] == 1
        assert response.data['data']['results'][0]['id'] == f'content-{mentor_log.id}'
        assert {member['user']['id'] for member in response.data['data']['members']} == {
            admin_user.id,
            mentor_user.id,
        }

    def test_activity_log_filters_search_date_and_status(self, api_client, admin_user):
        old_log = create_activity_log(
            category='operation',
            actor=admin_user,
            action='manual_grade',
            summary=f'{admin_user.username} 批改了答卷',
            description='旧的批阅记录',
            status='failed',
            duration=10,
        )
        matched_log = create_activity_log(
            category='operation',
            actor=admin_user,
            action='submit',
            summary=f'{admin_user.username} 提交了《答卷》',
            description='提交答卷成功',
            status='success',
            duration=25,
            target_type='submission',
            target_id='S-1',
            target_title='答卷',
        )
        ActivityLog.objects.filter(pk=old_log.pk).update(
            created_at=timezone.make_aware(datetime(2026, 3, 10, 9, 0, 0))
        )
        ActivityLog.objects.filter(pk=matched_log.pk).update(
            created_at=timezone.make_aware(datetime(2026, 3, 25, 15, 30, 0))
        )

        response = auth(api_client, admin_user).get(
            '/api/logs/?type=operation&search=答卷&status=success'
            '&date_from=2026-03-20&date_to=2026-03-26&page=1&page_size=10'
        )

        assert_status(response, 200)
        assert response.data['data']['count'] == 1
        assert response.data['data']['results'][0]['id'] == f'operation-{matched_log.id}'
        assert 'summary' in response.data['data']['results'][0]

    def test_activity_log_members_are_aggregated_from_full_filtered_set(
        self,
        api_client,
        admin_user,
        mentor_user,
    ):
        create_activity_log(
            category='operation',
            actor=admin_user,
            action='create_and_assign',
            summary=f'{admin_user.username} 创建了任务《任务 1》',
            description='创建任务 1',
            status='success',
            duration=100,
        )
        create_activity_log(
            category='operation',
            actor=admin_user,
            action='update_task',
            summary=f'{admin_user.username} 更新了任务《任务 2》',
            description='更新任务 2',
            status='success',
            duration=80,
        )
        create_activity_log(
            category='operation',
            actor=mentor_user,
            action='create',
            summary=f'{mentor_user.username} 创建抽查',
            description='创建抽查',
            status='success',
            duration=50,
        )

        response = auth(api_client, admin_user).get('/api/logs/?type=operation&page=1&page_size=1')

        assert_status(response, 200)
        assert response.data['data']['count'] == 3
        assert len(response.data['data']['results']) == 1
        assert len(response.data['data']['members']) == 2
        assert response.data['data']['members'][0]['user']['id'] == admin_user.id
        assert response.data['data']['members'][0]['activity_count'] == 2
        assert response.data['data']['members'][1]['user']['id'] == mentor_user.id
        assert response.data['data']['members'][1]['activity_count'] == 1

    def test_activity_log_requires_permission(self, api_client, student_user):
        response = auth(api_client, student_user).get('/api/logs/?type=user&page=1&page_size=10')

        assert_permission_denied(response)

    def test_activity_log_delete_endpoint_removes_selected_log(self, api_client, admin_user):
        log = create_activity_log(
            category='operation',
            actor=admin_user,
            action='submit',
            summary=f'{admin_user.username} 提交了《删除测试》',
            description='用于删除测试',
            status='success',
            duration=15,
            target_type='submission',
            target_id='DELETE-1',
            target_title='删除测试',
        )

        response = auth(api_client, admin_user).delete(f'/api/logs/items/operation-{log.id}/')

        assert_status(response, 200)
        assert response.data['code'] == 'SUCCESS'
        assert not ActivityLog.objects.filter(pk=log.id).exists()

    def test_activity_log_delete_requires_view_permission(
        self,
        api_client,
        admin_user,
        student_user,
    ):
        log = create_activity_log(
            category='user',
            actor=admin_user,
            action='login',
            summary=f'{admin_user.username} 登录成功',
            description='用于权限校验',
            status='success',
            target_type='user',
            target_id=str(student_user.id),
            target_title=student_user.username,
        )

        response = auth(api_client, student_user).delete(f'/api/logs/items/user-{log.id}/')

        assert_permission_denied(response)

    def test_activity_log_bulk_delete_endpoint_removes_selected_logs(self, api_client, admin_user):
        first_log = create_activity_log(
            category='operation',
            actor=admin_user,
            action='submit',
            summary=f'{admin_user.username} 提交了《批量删除测试1》',
            description='用于批量删除测试1',
            status='success',
            duration=12,
            target_type='submission',
            target_id='BULK-1',
            target_title='批量删除测试1',
        )
        second_log = create_activity_log(
            category='operation',
            actor=admin_user,
            action='manual_grade',
            summary=f'{admin_user.username} 批改了答卷',
            description='用于批量删除测试2',
            status='success',
            duration=18,
        )

        response = auth(api_client, admin_user).post(
            '/api/logs/items/bulk-delete/',
            {
                'item_ids': [
                    f'operation-{first_log.id}',
                    f'operation-{second_log.id}',
                ]
            },
            format='json',
        )

        assert_status(response, 200)
        assert response.data['data']['deleted_count'] == 2
        assert not ActivityLog.objects.filter(pk=first_log.id).exists()
        assert not ActivityLog.objects.filter(pk=second_log.id).exists()

    def test_activity_log_bulk_delete_requires_view_permission(
        self,
        api_client,
        admin_user,
        student_user,
    ):
        log = create_activity_log(
            category='user',
            actor=admin_user,
            action='login',
            summary=f'{admin_user.username} 登录成功',
            description='用于批量删除权限校验',
            status='success',
            target_type='user',
            target_id=str(student_user.id),
            target_title=student_user.username,
        )

        response = auth(api_client, student_user).post(
            '/api/logs/items/bulk-delete/',
            {'item_ids': [f'user-{log.id}']},
            format='json',
        )

        assert_permission_denied(response)
