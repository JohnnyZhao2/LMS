"""Grading owned permission specs."""

from apps.authorization.registry import AuthorizationSpec, PermissionDefinition


AUTHORIZATION_SPECS = (
    AuthorizationSpec(
        key='grading.permissions',
        module='grading',
        permissions=(
            PermissionDefinition(
                code='grading.view',
                name='查看阅卷中心',
                description='查看待阅卷任务、题目分析和作答详情',
            ),
            PermissionDefinition(
                code='grading.score',
                name='提交评分',
                description='为主观题提交评分',
            ),
        ),
        role_defaults={
            'MENTOR': ('grading.view', 'grading.score'),
            'DEPT_MANAGER': ('grading.view', 'grading.score'),
        },
    ),
)
