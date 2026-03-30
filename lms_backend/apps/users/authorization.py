"""User owned permission specs."""

from apps.authorization.registry import AuthorizationSpec, PermissionDefinition


AUTHORIZATION_SPECS = (
    AuthorizationSpec(
        key='users.permissions',
        module='user',
        permissions=(
            PermissionDefinition(
                code='user.view',
                name='查看用户',
                description='查看用户列表和详情',
            ),
            PermissionDefinition(
                code='user.create',
                name='创建用户',
                description='创建新用户',
            ),
            PermissionDefinition(
                code='user.update',
                name='编辑用户',
                description='编辑用户资料和指定导师',
            ),
            PermissionDefinition(
                code='user.activate',
                name='启停账号',
                description='启用/停用账号并重置密码',
            ),
            PermissionDefinition(
                code='user.authorize',
                name='分配权限',
                description='分配角色并配置用户权限自定义',
            ),
            PermissionDefinition(
                code='user.delete',
                name='删除用户',
                description='彻底删除离职用户',
            ),
        ),
    ),
    AuthorizationSpec(
        key='users.profile_permissions',
        module='profile',
        permissions=(
            PermissionDefinition(
                code='profile.view',
                name='查看个人中心',
                description='查看个人中心',
            ),
            PermissionDefinition(
                code='profile.update',
                name='更新个人资料',
                description='更新个人资料',
            ),
        ),
        system_managed_codes=('profile.view', 'profile.update'),
        role_system_defaults={
            'STUDENT': ('profile.view', 'profile.update'),
        },
    ),
)
