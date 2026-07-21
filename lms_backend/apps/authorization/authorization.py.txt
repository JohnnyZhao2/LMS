from .registry import AuthorizationSpec, perm


AUTHORIZATION_SPECS = (
    AuthorizationSpec(
        key='authorization.role_permission_templates',
        module='config',
        permissions=(
            perm(
                code='role_permission_template.view',
                name='查看角色模板',
                description='查看角色权限模板',
            ),
            perm(
                code='role_permission_template.update',
                name='更新角色模板',
                description='更新角色权限模板',
            ),
        ),
        system_managed_codes=(
            'role_permission_template.view',
            'role_permission_template.update',
        ),
    ),
)
