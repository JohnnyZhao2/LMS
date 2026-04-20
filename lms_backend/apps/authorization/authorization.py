from .registry import AuthorizationSpec, perm


AUTHORIZATION_SPECS = (
    AuthorizationSpec(
        key='authorization.role_templates',
        module='config',
        permissions=(
            perm(
                code='authorization.role_template.view',
                name='查看角色模板',
                description='查看角色权限模板',
            ),
            perm(
                code='authorization.role_template.update',
                name='更新角色模板',
                description='更新角色权限模板',
            ),
        ),
        system_managed_codes=(
            'authorization.role_template.view',
            'authorization.role_template.update',
        ),
    ),
)
