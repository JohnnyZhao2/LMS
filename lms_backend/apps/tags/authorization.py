"""Tag owned permission specs."""

from apps.authorization.registry import AuthorizationSpec, PermissionDefinition


AUTHORIZATION_SPECS = (
    AuthorizationSpec(
        key='tags.permissions',
        module='tag',
        permissions=(
            PermissionDefinition(
                code='tag.view',
                name='查看标签',
                description='查看标签管理页和标签列表',
            ),
            PermissionDefinition(
                code='tag.create',
                name='创建标签',
                description='创建新标签',
            ),
            PermissionDefinition(
                code='tag.update',
                name='更新标签',
                description='更新标签信息与适用范围',
            ),
            PermissionDefinition(
                code='tag.delete',
                name='删除标签',
                description='删除标签',
            ),
        ),
        role_defaults={
            'MENTOR': ('tag.view', 'tag.create'),
            'DEPT_MANAGER': ('tag.view', 'tag.create', 'tag.update', 'tag.delete'),
            'ADMIN': ('tag.view', 'tag.create', 'tag.update', 'tag.delete'),
        },
    ),
)
