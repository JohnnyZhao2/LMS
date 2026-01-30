"""
Dashboard 模块集成测试
测试覆盖：
- 学员仪表盘 API
- 任务参与者进度 API
- 导师仪表盘 API
- Selectors 关键函数
"""
import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.knowledge.models import Knowledge
from apps.quizzes.models import Quiz
from apps.submissions.models import Submission
from apps.tasks.models import Task, TaskAssignment, TaskKnowledge, TaskQuiz
from apps.users.models import Department, Role, User, UserRole


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def department():
    return Department.objects.create(name='测试部门', code='TEST')


@pytest.fixture
def student_role():
    role, _ = Role.objects.get_or_create(code='STUDENT', defaults={'name': '学员'})
    return role


@pytest.fixture
def mentor_role():
    role, _ = Role.objects.get_or_create(code='MENTOR', defaults={'name': '导师'})
    return role


@pytest.fixture
def admin_role():
    role, _ = Role.objects.get_or_create(code='ADMIN', defaults={'name': '管理员'})
    return role


@pytest.fixture
def mentor(department, mentor_role, student_role):
    user = User.objects.create_user(
        employee_id='MENTOR001',
        username='测试导师',
        password='password123',
        department=department,
    )
    UserRole.objects.create(user=user, role=mentor_role)
    return user


@pytest.fixture
def student(department, mentor, student_role):
    user = User.objects.create_user(
        employee_id='STU001',
        username='测试学员',
        password='password123',
        department=department,
        mentor=mentor,
    )
    # student_role 会通过 signal 自动分配
    return user


@pytest.fixture
def student2(department, mentor, student_role):
    user = User.objects.create_user(
        employee_id='STU002',
        username='测试学员2',
        password='password123',
        department=department,
        mentor=mentor,
    )
    return user


@pytest.fixture
def admin(department, admin_role, student_role):
    user = User.objects.create_user(
        employee_id='ADMIN001',
        username='测试管理员',
        password='password123',
        department=department,
    )
    UserRole.objects.create(user=user, role=admin_role)
    return user


@pytest.fixture
def knowledge(mentor):
    return Knowledge.objects.create(
        title='测试知识',
        content='测试内容',
        created_by=mentor,
        updated_by=mentor,
        is_current=True,
    )


@pytest.fixture
def quiz(mentor):
    return Quiz.objects.create(
        title='测试测验',
        quiz_type='PRACTICE',
        duration=30,
        pass_score=60,
        created_by=mentor,
        updated_by=mentor,
    )


@pytest.fixture
def task(mentor):
    return Task.objects.create(
        title='测试任务',
        description='测试任务描述',
        deadline=timezone.now() + timezone.timedelta(days=7),
        created_by=mentor,
        updated_by=mentor,
    )


@pytest.fixture
def task_assignment(task, student):
    return TaskAssignment.objects.create(
        task=task,
        assignee=student,
        status='IN_PROGRESS',
    )


@pytest.fixture
def task_assignment2(task, student2):
    return TaskAssignment.objects.create(
        task=task,
        assignee=student2,
        status='IN_PROGRESS',
    )


# ============================================
# 学员仪表盘 API 测试
# ============================================

@pytest.mark.django_db
class TestStudentDashboardAPI:
    """学员仪表盘 API 测试"""

    def test_get_dashboard_success(self, api_client, student, knowledge, task_assignment):
        """测试学员获取仪表盘数据成功"""
        api_client.force_authenticate(user=student)
        response = api_client.get('/api/dashboard/student/')

        assert response.status_code == 200
        assert 'stats' in response.data
        assert 'tasks' in response.data
        assert 'latest_knowledge' in response.data

    def test_get_dashboard_stats_fields(self, api_client, student, task_assignment):
        """测试仪表盘统计字段完整性"""
        api_client.force_authenticate(user=student)
        response = api_client.get('/api/dashboard/student/')

        stats = response.data['stats']
        assert 'in_progress_count' in stats
        assert 'urgent_count' in stats
        assert 'completion_rate' in stats
        assert 'exam_avg_score' in stats

    def test_get_dashboard_unauthenticated(self, api_client):
        """测试未认证用户无法访问"""
        response = api_client.get('/api/dashboard/student/')
        assert response.status_code == 401

    def test_get_dashboard_with_limits(self, api_client, student, knowledge):
        """测试带参数的仪表盘请求"""
        api_client.force_authenticate(user=student)
        response = api_client.get('/api/dashboard/student/?task_limit=5&knowledge_limit=3')

        assert response.status_code == 200


# ============================================
# 任务参与者进度 API 测试
# ============================================

@pytest.mark.django_db
class TestTaskParticipantsAPI:
    """任务参与者进度 API 测试"""

    def test_get_participants_success(self, api_client, student, task, task_assignment, task_assignment2):
        """测试获取任务参与者进度成功"""
        api_client.force_authenticate(user=student)
        response = api_client.get(f'/api/dashboard/student/task/{task.id}/participants/')

        assert response.status_code == 200
        assert isinstance(response.data, list)

    def test_get_participants_includes_current_user(self, api_client, student, task, task_assignment, task_assignment2):
        """测试参与者列表包含当前用户标记"""
        api_client.force_authenticate(user=student)
        response = api_client.get(f'/api/dashboard/student/task/{task.id}/participants/')

        # 检查是否有 is_me 字段
        has_is_me = any(p.get('is_me', False) for p in response.data)
        assert has_is_me

    def test_get_participants_unauthenticated(self, api_client, task):
        """测试未认证用户无法访问"""
        response = api_client.get(f'/api/dashboard/student/task/{task.id}/participants/')
        assert response.status_code == 401

    def test_get_participants_nonexistent_task(self, api_client, student):
        """测试访问不存在的任务"""
        api_client.force_authenticate(user=student)
        response = api_client.get('/api/dashboard/student/task/99999/participants/')
        # 应该返回空列表而不是 404
        assert response.status_code == 200
        assert response.data == []


# ============================================
# 导师仪表盘 API 测试
# ============================================

@pytest.mark.django_db
class TestMentorDashboardAPI:
    """导师仪表盘 API 测试"""

    def test_get_dashboard_as_mentor(self, api_client, mentor, student, task_assignment):
        """测试导师获取仪表盘数据"""
        api_client.force_authenticate(user=mentor)
        response = api_client.get('/api/dashboard/mentor/')

        assert response.status_code == 200
        assert 'summary' in response.data
        assert 'students' in response.data

    def test_get_dashboard_as_admin(self, api_client, admin):
        """测试管理员获取仪表盘数据"""
        api_client.force_authenticate(user=admin)
        response = api_client.get('/api/dashboard/mentor/')

        assert response.status_code == 200

    def test_get_dashboard_as_student_forbidden(self, api_client, student):
        """测试学员无法访问导师仪表盘"""
        api_client.force_authenticate(user=student)
        response = api_client.get('/api/dashboard/mentor/')

        assert response.status_code == 400  # BusinessError

    def test_get_dashboard_unauthenticated(self, api_client):
        """测试未认证用户无法访问"""
        response = api_client.get('/api/dashboard/mentor/')
        assert response.status_code == 401

    def test_dashboard_summary_fields(self, api_client, mentor, student, task_assignment):
        """测试仪表盘摘要字段完整性"""
        api_client.force_authenticate(user=mentor)
        response = api_client.get('/api/dashboard/mentor/')

        summary = response.data['summary']
        assert 'total_students' in summary
        assert 'weekly_active_users' in summary
        assert 'monthly_tasks' in summary
        assert 'overall_completion_rate' in summary


# ============================================
# Selectors 单元测试
# ============================================

@pytest.mark.django_db
class TestDashboardSelectors:
    """Dashboard Selectors 测试"""

    def test_calculate_assignment_progress_empty_task(self, task, task_assignment):
        """测试空任务的进度计算"""
        from apps.dashboard.selectors import calculate_assignment_progress

        progress = calculate_assignment_progress(task_assignment)

        assert progress['total'] == 0
        assert progress['completed'] == 0
        assert progress['percentage'] == 0

    def test_calculate_assignment_progress_with_knowledge(self, task, task_assignment, knowledge):
        """测试包含知识点的任务进度计算"""
        from apps.dashboard.selectors import calculate_assignment_progress

        # 添加知识点到任务
        TaskKnowledge.objects.create(task=task, knowledge=knowledge, order=1)

        # 刷新 task_assignment 以获取最新的关联数据
        task_assignment.refresh_from_db()

        progress = calculate_assignment_progress(task_assignment)

        assert progress['knowledge_total'] == 1
        assert progress['knowledge_completed'] == 0
        assert progress['total'] == 1

    def test_calculate_assignment_progress_with_quiz(self, task, task_assignment, quiz, student):
        """测试包含测验的任务进度计算"""
        from apps.dashboard.selectors import calculate_assignment_progress

        # 添加测验到任务
        TaskQuiz.objects.create(task=task, quiz=quiz, order=1)

        # 创建提交记录
        Submission.objects.create(
            task_assignment=task_assignment,
            quiz=quiz,
            user=student,
            status='GRADED',
            obtained_score=80,
        )

        task_assignment.refresh_from_db()
        progress = calculate_assignment_progress(task_assignment)

        assert progress['quiz_total'] == 1
        assert progress['quiz_completed'] == 1

    def test_get_task_participants_progress_no_n_plus_one(self, task, task_assignment, task_assignment2, quiz, student, student2):
        """测试 get_task_participants_progress 没有 N+1 查询问题"""
        from django.test.utils import CaptureQueriesContext
        from django.db import connection
        from apps.dashboard.selectors import get_task_participants_progress

        # 添加测验到任务
        TaskQuiz.objects.create(task=task, quiz=quiz, order=1)

        # 创建提交记录
        Submission.objects.create(
            task_assignment=task_assignment,
            quiz=quiz,
            user=student,
            status='GRADED',
            obtained_score=80,
        )

        # 捕获查询数量
        with CaptureQueriesContext(connection) as context:
            result = get_task_participants_progress(task.id, student.id)

        # 验证结果
        assert len(result) > 0

        # 验证查询数量合理（不应该随参与者数量线性增长）
        # 主查询 + exists 检查 + 可能的预取查询，应该在 10 次以内
        assert len(context.captured_queries) < 10, f"查询次数过多: {len(context.captured_queries)}"

    def test_calculate_task_stats(self, student, task, mentor):
        """测试任务统计计算"""
        from apps.dashboard.selectors import calculate_task_stats, get_student_assignments

        # 创建多个任务分配
        task2 = Task.objects.create(
            title='已完成任务',
            deadline=timezone.now() + timezone.timedelta(days=7),
            created_by=mentor,
            updated_by=mentor,
        )
        TaskAssignment.objects.create(task=task, assignee=student, status='IN_PROGRESS')
        TaskAssignment.objects.create(task=task2, assignee=student, status='COMPLETED')

        assignments = get_student_assignments(user_id=student.id)
        stats = calculate_task_stats(assignments)

        assert stats['total_tasks'] == 2
        assert stats['completed_tasks'] == 1
        assert stats['in_progress_tasks'] == 1
        assert stats['completion_rate'] == 50.0
