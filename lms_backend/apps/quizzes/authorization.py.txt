"""Quiz owned permission specs."""

from apps.authorization.registry import AuthorizationSpec, PermissionDefinition


AUTHORIZATION_SPECS = (
    AuthorizationSpec(
        key='quizzes.permissions',
        module='quiz',
        permissions=(
            PermissionDefinition(
                code='quiz.view',
                name='查看试卷',
                description='查看试卷列表和试卷详情',
            ),
            PermissionDefinition(
                code='quiz.create',
                name='创建试卷',
                description='创建新试卷',
            ),
            PermissionDefinition(
                code='quiz.update',
                name='更新试卷',
                description='编辑试卷和题目顺序',
            ),
            PermissionDefinition(
                code='quiz.delete',
                name='删除试卷',
                description='删除试卷',
            ),
        ),
        role_defaults={
            'MENTOR': ('quiz.view', 'quiz.create', 'quiz.update', 'quiz.delete'),
            'DEPT_MANAGER': ('quiz.view', 'quiz.create', 'quiz.update', 'quiz.delete'),
            'ADMIN': ('quiz.view', 'quiz.create', 'quiz.update', 'quiz.delete'),
        },
    ),
)
