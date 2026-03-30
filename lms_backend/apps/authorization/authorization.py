"""Authorization app owned permission specs."""

from .registry import AuthorizationSpec, PermissionDefinition


AUTHORIZATION_SPECS = (
    AuthorizationSpec(
        key='authorization.role_templates',
        module='config',
        permissions=(
            PermissionDefinition(
                code='authorization.role_template.view',
                name='查看角色模板',
                description='查看角色权限模板',
            ),
            PermissionDefinition(
                code='authorization.role_template.update',
                name='更新角色模板',
                description='更新角色权限模板',
            ),
        ),
    ),
)
