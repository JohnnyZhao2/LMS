"""Question owned permission specs."""

from apps.authorization.registry import AuthorizationSpec, PermissionDefinition


AUTHORIZATION_SPECS = (
    AuthorizationSpec(
        key='questions.permissions',
        module='question',
        permissions=(
            PermissionDefinition(
                code='question.view',
                name='查看题目',
                description='查看题库列表和题目详情',
            ),
            PermissionDefinition(
                code='question.create',
                name='创建题目',
                description='创建题目',
            ),
            PermissionDefinition(
                code='question.update',
                name='更新题目',
                description='编辑题目内容',
            ),
            PermissionDefinition(
                code='question.delete',
                name='删除题目',
                description='删除题目',
            ),
        ),
        role_defaults={
            'MENTOR': ('question.view', 'question.create', 'question.update', 'question.delete'),
            'DEPT_MANAGER': ('question.view', 'question.create', 'question.update', 'question.delete'),
            'ADMIN': ('question.view', 'question.create', 'question.update', 'question.delete'),
        },
    ),
)
