"""Knowledge owned permission specs."""

from apps.authorization.registry import AuthorizationSpec, PermissionDefinition


AUTHORIZATION_SPECS = (
    AuthorizationSpec(
        key='knowledge.permissions',
        module='knowledge',
        permissions=(
            PermissionDefinition(
                code='knowledge.view',
                name='查看知识',
                description='查看知识列表、详情和知识统计',
            ),
            PermissionDefinition(
                code='knowledge.create',
                name='创建知识',
                description='创建知识文档和知识标签',
            ),
            PermissionDefinition(
                code='knowledge.update',
                name='更新知识',
                description='编辑知识文档内容和标签信息',
            ),
            PermissionDefinition(
                code='knowledge.delete',
                name='删除知识',
                description='删除知识文档',
            ),
        ),
        role_defaults={
            'STUDENT': ('knowledge.view',),
            'DEPT_MANAGER': (
                'knowledge.view',
                'knowledge.create',
                'knowledge.update',
                'knowledge.delete',
            ),
            'TEAM_MANAGER': ('knowledge.view',),
            'ADMIN': (
                'knowledge.view',
                'knowledge.create',
                'knowledge.update',
                'knowledge.delete',
            ),
        },
    ),
)
