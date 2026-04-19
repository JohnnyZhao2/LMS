from types import SimpleNamespace

import pytest
from django.utils import timezone

from apps.activity_logs.models import ActivityLog, ActivityLogPolicy
from apps.activity_logs.services import ActivityLogService
from apps.authorization.constants import PERMISSION_SCOPE_GROUPS, SCOPE_ALL
from apps.authorization.services import AuthorizationService
from apps.submissions.models import Answer
from apps.tags.models import Tag
from apps.tags.services import TagService
from apps.tasks.tests.factories import (
    QuestionFactory,
    QuizFactory,
    QuizRevisionFactory,
    QuizRevisionQuestionFactory,
    SubmissionFactory,
    TaskAssignmentFactory,
    TaskFactory,
    TaskQuizFactory,
    UserFactory,
)
from apps.users.models import Role


def build_request(user):
    return SimpleNamespace(user=user, META={})


@pytest.mark.django_db
def test_activity_log_policy_sync_uses_declared_bindings():
    ActivityLogPolicy.objects.update_or_create(
        key='content.tag.create',
        defaults={
            'category': 'operation',
            'group': '旧分组',
            'label': '旧标签',
            'enabled': False,
        },
    )

    ActivityLogService.sync_policies()

    create_policy = ActivityLogPolicy.objects.get(key='content.tag.create')
    assert create_policy.category == 'content'
    assert create_policy.group == '标签管理'
    assert create_policy.label == '创建标签'
    assert create_policy.enabled is False

    assert ActivityLogPolicy.objects.filter(
        key='operation.authorization.replace_role_permissions',
        group='角色模板',
        label='更新角色模板权限',
    ).exists()


@pytest.mark.django_db
def test_tag_service_create_writes_activity_log():
    actor = UserFactory(username='标签管理员')
    service = TagService(build_request(actor))

    tag = service.create(
        {
            'name': '日志标签',
            'tag_type': 'TAG',
            'allow_knowledge': True,
            'allow_question': False,
        }
    )

    log = ActivityLog.objects.get(category='content', action='create', target_type='tag', target_id=str(tag.id))
    assert log.actor_id == actor.id
    assert log.target_title == '日志标签'
    assert log.summary == f'{actor.username} 创建了标签《日志标签》'
    assert log.description == '知识标签'


@pytest.mark.django_db
def test_tag_service_reorder_writes_activity_log():
    actor = UserFactory(username='标签管理员')
    first = Tag.objects.create(
        name='空间A',
        tag_type='SPACE',
        allow_knowledge=True,
        allow_question=True,
        sort_order=1,
    )
    second = Tag.objects.create(
        name='空间B',
        tag_type='SPACE',
        allow_knowledge=True,
        allow_question=True,
        sort_order=2,
    )
    service = TagService(build_request(actor))

    service.reorder_spaces([second.id, first.id])

    log = ActivityLog.objects.get(category='operation', action='reorder_spaces', actor=actor)
    assert log.summary == f'{actor.username} 调整了空间标签顺序'
    assert log.description == '2 个空间标签'


@pytest.mark.django_db
def test_authorization_role_template_writes_activity_log():
    actor = UserFactory(username='授权管理员')
    Role.objects.get_or_create(code='ADMIN', defaults={'name': '管理员'})
    service = AuthorizationService(build_request(actor))

    service.replace_role_permissions('ADMIN', ['knowledge.view', 'tag.view'])

    log = ActivityLog.objects.get(category='operation', action='replace_role_permissions', actor=actor)
    assert log.target_type == 'role'
    assert log.target_title == 'ADMIN'
    assert log.summary == f'{actor.username} 更新了角色模板《ADMIN》的权限'
    assert log.description == '2 项权限'


@pytest.mark.django_db
def test_authorization_user_permission_override_writes_activity_logs():
    actor = UserFactory(username='授权管理员')
    target = UserFactory(username='目标用户')
    service = AuthorizationService(build_request(actor))

    override = service.create_user_permission_override(
        user_id=target.id,
        permission_code='knowledge.view',
        effect='ALLOW',
        applies_to_role=None,
        scope_type=SCOPE_ALL,
        scope_user_ids=[],
        reason='临时放开',
    )
    service.revoke_user_permission_override(
        user_id=target.id,
        override_id=override.id,
        revoke_reason='恢复默认',
    )

    create_log = ActivityLog.objects.get(category='operation', action='create_user_permission_override', target_title=target.username)
    revoke_log = ActivityLog.objects.get(category='operation', action='revoke_user_permission_override', target_title=target.username)
    assert create_log.actor_id == actor.id
    assert '权限：knowledge.view' in create_log.description
    assert '效果：允许' in create_log.description
    assert revoke_log.actor_id == actor.id
    assert revoke_log.description == '权限：knowledge.view'


@pytest.mark.django_db
def test_authorization_scope_group_override_writes_activity_logs():
    actor = UserFactory(username='授权管理员')
    target = UserFactory(username='目标用户')
    scope_group_key = sorted(PERMISSION_SCOPE_GROUPS)[0]
    service = AuthorizationService(build_request(actor))

    override = service.create_user_scope_group_override(
        user_id=target.id,
        scope_group_key=scope_group_key,
        effect='ALLOW',
        applies_to_role=None,
        scope_type=SCOPE_ALL,
        scope_user_ids=[],
        reason='补充范围',
    )
    service.revoke_user_scope_group_override(
        user_id=target.id,
        override_id=override.id,
        revoke_reason='恢复默认',
    )

    create_log = ActivityLog.objects.get(category='operation', action='create_user_scope_group_override', target_title=target.username)
    revoke_log = ActivityLog.objects.get(category='operation', action='revoke_user_scope_group_override', target_title=target.username)
    assert create_log.actor_id == actor.id
    assert f'范围组：{scope_group_key}' in create_log.description
    assert '效果：允许' in create_log.description
    assert revoke_log.actor_id == actor.id
    assert revoke_log.description == f'范围组：{scope_group_key}'


@pytest.mark.django_db
def test_grading_submit_writes_activity_log(api_client, monkeypatch):
    monkeypatch.setattr('apps.grading.views.enforce', lambda *args, **kwargs: True)

    grader = UserFactory(username='阅卷老师')
    student = UserFactory(username='待评分学员')
    task = TaskFactory(created_by=grader, updated_by=grader, created_role='MENTOR')
    assignment = TaskAssignmentFactory(task=task, assignee=student, status='IN_PROGRESS')
    source_quiz = QuizFactory(title='主观题试卷', created_by=grader, updated_by=grader)
    quiz_revision = QuizRevisionFactory(source_quiz=source_quiz, title=source_quiz.title, created_by=grader)
    task_quiz = TaskQuizFactory(task=task, quiz=quiz_revision, source_quiz=source_quiz)
    source_question = QuestionFactory(
        created_by=grader,
        updated_by=grader,
        question_type='SHORT_ANSWER',
        reference_answer='参考答案',
        with_default_options=False,
    )
    revision_question = QuizRevisionQuestionFactory(
        quiz=quiz_revision,
        question=source_question,
        question_type='SHORT_ANSWER',
        content='请说明原因',
        reference_answer='参考答案',
        score=5,
        with_default_options=False,
    )
    submission = SubmissionFactory(
        task_assignment=assignment,
        task_quiz=task_quiz,
        quiz=quiz_revision,
        user=student,
        status='GRADING',
        submitted_at=timezone.now(),
    )
    Answer.objects.create(
        submission=submission,
        question=revision_question,
        text_answer='这是我的回答',
    )

    api_client.force_authenticate(user=grader)
    response = api_client.post(
        f'/api/grading/tasks/{task.id}/submit/',
        {
            'quiz_id': task_quiz.id,
            'question_id': revision_question.id,
            'student_id': student.id,
            'score': 4,
            'comments': '已完成评分',
        },
        format='json',
    )

    assert response.status_code == 200, response.data

    log = ActivityLog.objects.get(category='operation', action='manual_grade', actor=grader)
    assert log.target_type == 'quiz'
    assert log.target_title == quiz_revision.title
    assert log.summary == f'{grader.username} 批改了答卷'
    assert '待评分学员' in log.description
    assert '4.0/5 分' in log.description
