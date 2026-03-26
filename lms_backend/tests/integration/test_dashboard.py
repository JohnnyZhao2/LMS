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

from apps.authorization.models import Permission, UserPermissionOverride
from apps.knowledge.models import Knowledge
from apps.quizzes.models import Quiz
from apps.submissions.models import Submission
from apps.tasks.models import Task, TaskAssignment, TaskKnowledge, TaskQuiz
from apps.users.models import Department, Role, User, UserRole


def unwrap_response_data(response):
    payload = response.data
    if isinstance(payload, dict) and 'code' in payload and 'data' in payload:
        return payload['data']
    return payload


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
def team_manager_role():
    role, _ = Role.objects.get_or_create(code='TEAM_MANAGER', defaults={'name': '团队经理'})
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
def team_manager(department, team_manager_role):
    user = User.objects.create_user(
        employee_id='TM001',
        username='测试团队经理',
        password='password123',
        department=department,
    )
    UserRole.objects.create(user=user, role=team_manager_role)
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
        data = unwrap_response_data(response)

        assert response.status_code == 200
        assert response.data['code'] == 'SUCCESS'
        assert 'stats' in data
        assert 'tasks' in data
        assert 'latest_knowledge' in data

    def test_get_dashboard_stats_fields(self, api_client, student, task_assignment):
        """测试仪表盘统计字段完整性"""
        api_client.force_authenticate(user=student)
        response = api_client.get('/api/dashboard/student/')
        data = unwrap_response_data(response)

        stats = data['stats']
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

    def test_get_dashboard_with_invalid_limit_returns_validation_error(self, api_client, student):
        """测试 task_limit 非整数时返回统一校验错误"""
        api_client.force_authenticate(user=student)
        response = api_client.get('/api/dashboard/student/?task_limit=abc')

        assert response.status_code == 400
        assert response.data['code'] == 'VALIDATION_ERROR'

    def test_get_dashboard_with_negative_limit_returns_validation_error(self, api_client, student):
        """测试 knowledge_limit 非法边界时返回统一校验错误"""
        api_client.force_authenticate(user=student)
        response = api_client.get('/api/dashboard/student/?knowledge_limit=-1')

        assert response.status_code == 400
        assert response.data['code'] == 'VALIDATION_ERROR'


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
        data = unwrap_response_data(response)

        assert response.status_code == 200
        assert isinstance(data, list)

    def test_get_participants_includes_current_user(self, api_client, student, task, task_assignment, task_assignment2):
        """测试参与者列表包含当前用户标记"""
        api_client.force_authenticate(user=student)
        response = api_client.get(f'/api/dashboard/student/task/{task.id}/participants/')
        data = unwrap_response_data(response)

        # 检查是否有 is_me 字段
        has_is_me = any(p.get('is_me', False) for p in data)
        assert has_is_me

    def test_get_participants_unauthenticated(self, api_client, task):
        """测试未认证用户无法访问"""
        response = api_client.get(f'/api/dashboard/student/task/{task.id}/participants/')
        assert response.status_code == 401

    def test_get_participants_nonexistent_task(self, api_client, student):
        """测试访问不存在的任务"""
        api_client.force_authenticate(user=student)
        response = api_client.get('/api/dashboard/student/task/99999/participants/')
        data = unwrap_response_data(response)
        # 应该返回空列表而不是 404
        assert response.status_code == 200
        assert data == []


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
        data = unwrap_response_data(response)

        assert response.status_code == 200
        assert 'summary' in data
        assert 'students' in data
        assert 'overdue_warning' not in data

    def test_get_dashboard_as_admin(self, api_client, admin):
        """测试管理员获取仪表盘数据"""
        api_client.force_authenticate(user=admin)
        response = api_client.get('/api/dashboard/mentor/')

        assert response.status_code == 200

    def test_get_dashboard_as_student_forbidden(self, api_client, student):
        """测试学员无法访问导师仪表盘"""
        api_client.force_authenticate(user=student)
        response = api_client.get('/api/dashboard/mentor/')

        assert response.status_code == 403

    def test_get_dashboard_unauthenticated(self, api_client):
        """测试未认证用户无法访问"""
        response = api_client.get('/api/dashboard/mentor/')
        assert response.status_code == 401

    def test_dashboard_summary_fields(self, api_client, mentor, student, task_assignment):
        """测试仪表盘摘要字段完整性"""
        api_client.force_authenticate(user=mentor)
        response = api_client.get('/api/dashboard/mentor/')
        data = unwrap_response_data(response)

        summary = data['summary']
        assert 'total_students' in summary
        assert 'weekly_active_users' in summary
        assert 'monthly_tasks' in summary
        assert 'overall_completion_rate' in summary

    def test_dashboard_student_stats_query_count_is_bounded(self, api_client, mentor, department, task):
        """测试导师看板的学员统计查询次数不会随学员数量线性爆炸"""
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        for index in range(8):
            student = User.objects.create_user(
                employee_id=f'MENTOR_SCOPE_STU_{index:03d}',
                username=f'导师范围学员{index}',
                password='password123',
                department=department,
                mentor=mentor,
            )
            TaskAssignment.objects.create(
                task=task,
                assignee=student,
                status='COMPLETED' if index % 2 == 0 else 'IN_PROGRESS',
            )

        api_client.force_authenticate(user=mentor)
        with CaptureQueriesContext(connection) as context:
            response = api_client.get('/api/dashboard/mentor/')
            data = unwrap_response_data(response)

        assert response.status_code == 200
        assert len(data['students']) >= 8
        assert len(context.captured_queries) < 25, f"查询次数过多: {len(context.captured_queries)}"

    def test_dashboard_scope_follows_permission_overrides(self, api_client, mentor, student, student2, department):
        """导师看板学员范围应遵循 task.analytics.view 的 ALLOW/DENY 覆盖"""
        extra_student = User.objects.create_user(
            employee_id='MENTOR_DASH_EXTRA_001',
            username='导师额外学员',
            password='password123',
            department=department,
        )
        permission = Permission.objects.get(code='task.analytics.view')

        api_client.force_authenticate(user=mentor)
        response = api_client.get('/api/dashboard/mentor/')
        data = unwrap_response_data(response)

        assert response.status_code == 200
        student_ids = {item['id'] for item in data['students']}
        assert student.id in student_ids
        assert student2.id in student_ids
        assert extra_student.id not in student_ids

        UserPermissionOverride.objects.create(
            user=mentor,
            permission=permission,
            effect='ALLOW',
            applies_to_role='MENTOR',
            scope_type='EXPLICIT_USERS',
            scope_user_ids=[extra_student.id],
            granted_by=mentor,
        )
        UserPermissionOverride.objects.create(
            user=mentor,
            permission=permission,
            effect='DENY',
            applies_to_role='MENTOR',
            scope_type='EXPLICIT_USERS',
            scope_user_ids=[student.id],
            granted_by=mentor,
        )

        response = api_client.get('/api/dashboard/mentor/')
        data = unwrap_response_data(response)

        assert response.status_code == 200
        student_ids = {item['id'] for item in data['students']}
        assert student.id not in student_ids
        assert student2.id in student_ids
        assert extra_student.id in student_ids

@pytest.mark.django_db
class TestTeamManagerDashboardAPI:
    """团队经理仪表盘 API 测试"""

    def test_get_dashboard_as_team_manager(self, api_client, team_manager, mentor, student, task_assignment, knowledge):
        """测试团队经理获取仪表盘数据"""
        api_client.force_authenticate(user=team_manager)
        response = api_client.get('/api/dashboard/team-manager/', HTTP_X_CURRENT_ROLE='TEAM_MANAGER')
        data = unwrap_response_data(response)

        assert response.status_code == 200
        assert 'summary' in data
        assert 'department_comparison' in data
        assert 'department_student_view' in data
        # 团队经理口径：包含 STUDENT 角色成员，排除超级管理员、室经理和团队经理
        assert data['summary']['total_students'] == 2
        assert data['summary']['total_mentors'] == 1
        assert data['summary']['total_knowledge'] == 1

    def test_get_dashboard_as_mentor_forbidden(self, api_client, mentor):
        """测试非团队经理角色无法访问团队经理仪表盘"""
        api_client.force_authenticate(user=mentor)
        response = api_client.get('/api/dashboard/team-manager/', HTTP_X_CURRENT_ROLE='MENTOR')

        assert response.status_code == 403

    def test_get_dashboard_unauthenticated(self, api_client):
        """测试未认证用户无法访问团队经理仪表盘"""
        response = api_client.get('/api/dashboard/team-manager/')
        assert response.status_code == 401

    def test_dashboard_zero_score_and_null_submitted_at(self, api_client, team_manager, student, task_assignment, quiz):
        """
        测试团队经理统计：
        1. 0 分不会被误判为 null
        2. submitted_at 为空时仍可计入平均分统计
        """
        Submission.objects.create(
            task_assignment=task_assignment,
            quiz=quiz,
            user=student,
            status='GRADED',
            obtained_score=0,
            total_score=100,
            submitted_at=None,
        )

        api_client.force_authenticate(user=team_manager)
        response = api_client.get('/api/dashboard/team-manager/', HTTP_X_CURRENT_ROLE='TEAM_MANAGER')
        data = unwrap_response_data(response)

        assert response.status_code == 200
        department_comparison = data['department_comparison']
        avg_scores = [
            department_comparison['left_department']['avg_score'],
            department_comparison['right_department']['avg_score'],
        ]
        assert 0.0 in avg_scores

    def test_dashboard_avg_completion_rate_uses_member_average(
        self,
        api_client,
        team_manager,
        mentor,
        student,
        task,
    ):
        """
        完成率口径：先算每个成员完成率，再求平均。
        场景：
        - 导师成员无任务 => 0%
        - 学员成员 2 个任务完成 1 个 => 50%
        - 团队均值应为 (0 + 50) / 2 = 25.0%
        """
        TaskAssignment.objects.create(task=task, assignee=student, status='IN_PROGRESS')
        task_completed = Task.objects.create(
            title='已完成任务',
            deadline=timezone.now() + timezone.timedelta(days=7),
            created_by=mentor,
            updated_by=mentor,
        )
        TaskAssignment.objects.create(task=task_completed, assignee=student, status='COMPLETED')

        api_client.force_authenticate(user=team_manager)
        response = api_client.get('/api/dashboard/team-manager/', HTTP_X_CURRENT_ROLE='TEAM_MANAGER')
        data = unwrap_response_data(response)

        assert response.status_code == 200
        department_comparison = data['department_comparison']
        completion_rates = [
            department_comparison['left_department']['avg_completion_rate'],
            department_comparison['right_department']['avg_completion_rate'],
        ]
        assert 25.0 in completion_rates

    def test_dashboard_excludes_superadmin_dept_manager_and_team_manager(self, api_client, team_manager, department):
        """团队经理看板排除超级管理员、室经理和团队经理"""
        admin_role, _ = Role.objects.get_or_create(code='ADMIN', defaults={'name': '管理员'})
        dept_manager_role, _ = Role.objects.get_or_create(code='DEPT_MANAGER', defaults={'name': '室经理'})

        admin_like_user = User.objects.create_user(
            employee_id='ADMIN_LIKE_001',
            username='管理员账号',
            password='password123',
            department=department,
        )
        UserRole.objects.create(user=admin_like_user, role=admin_role)

        dept_manager_like_user = User.objects.create_user(
            employee_id='DEPT_LIKE_001',
            username='室经理账号',
            password='password123',
            department=department,
        )
        UserRole.objects.create(user=dept_manager_like_user, role=dept_manager_role)

        super_admin_user = User.objects.create_user(
            employee_id='SUPER_ADMIN_001',
            username='超级管理员账号',
            password='password123',
            department=department,
            is_superuser=True,
            is_staff=True,
        )
        UserRole.objects.create(user=super_admin_user, role=admin_role)

        api_client.force_authenticate(user=team_manager)
        response = api_client.get('/api/dashboard/team-manager/', HTTP_X_CURRENT_ROLE='TEAM_MANAGER')
        data = unwrap_response_data(response)

        assert response.status_code == 200
        all_student_names = {
            student['student_name']
            for item in data['department_student_view']
            for student in item['students']
        }

        # 团队经理自身应排除
        assert '测试团队经理' not in all_student_names
        # 普通 ADMIN 角色账号应纳入
        assert '管理员账号' in all_student_names
        # 室经理与超级管理员应排除
        assert '室经理账号' not in all_student_names
        assert '超级管理员账号' not in all_student_names

    def test_dashboard_scope_follows_permission_overrides(self, api_client, team_manager, student):
        """团队经理看板学员范围应遵循 knowledge.view 的 ALLOW/DENY 覆盖"""
        permission = Permission.objects.get(code='knowledge.view')

        api_client.force_authenticate(user=team_manager)
        response = api_client.get('/api/dashboard/team-manager/', HTTP_X_CURRENT_ROLE='TEAM_MANAGER')
        data = unwrap_response_data(response)

        assert response.status_code == 200
        assert data['summary']['total_students'] >= 1
        all_student_ids = {
            student_item['student_id']
            for item in data['department_student_view']
            for student_item in item['students']
        }
        assert student.id in all_student_ids

        UserPermissionOverride.objects.create(
            user=team_manager,
            permission=permission,
            effect='DENY',
            applies_to_role='TEAM_MANAGER',
            scope_type='EXPLICIT_USERS',
            scope_user_ids=[student.id],
            granted_by=team_manager,
        )

        response = api_client.get('/api/dashboard/team-manager/', HTTP_X_CURRENT_ROLE='TEAM_MANAGER')
        data = unwrap_response_data(response)

        assert response.status_code == 200
        all_student_ids = {
            student_item['student_id']
            for item in data['department_student_view']
            for student_item in item['students']
        }
        assert student.id not in all_student_ids


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
