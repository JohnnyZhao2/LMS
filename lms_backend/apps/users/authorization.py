"""User owned permission specs."""

from apps.authorization.registry import (
    AuthorizationSpec,
    PermissionDefinition,
    PermissionScopeRuleDefinition,
    ScopeFilterHandler,
)
from apps.users.models import User


def _filter_viewable_users(engine, *, queryset, context=None):
    return engine.get_scoped_user_queryset(
        'user.view',
        queryset.filter(is_active=True).distinct(),
        cache_key='active_users',
    )


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
            PermissionDefinition(
                code='user.avatar.update',
                name='修改他人头像',
                description='管理员修改指定用户头像',
            ),
        ),
        role_defaults={
            'ADMIN': ('user.avatar.update',),
        },
        scope_rules=(
            PermissionScopeRuleDefinition('user.view', 'MENTOR', 'MENTEES'),
            PermissionScopeRuleDefinition('user.view', 'DEPT_MANAGER', 'DEPARTMENT'),
            PermissionScopeRuleDefinition('user.view', 'ADMIN', 'ALL'),
        ),
        scope_filter_handlers=(
            ScopeFilterHandler(
                key='users.scope_filter.user_view',
                permission_code='user.view',
                resource_model=User,
                filter_queryset=_filter_viewable_users,
                constraint_summary='默认按角色范围生效（名下学员/本室成员/全部），可通过用户授权按对象范围增删。',
            ),
        ),
    ),
    AuthorizationSpec(
        key='users.profile_permissions',
        module='profile',
        permissions=(
            PermissionDefinition(
                code='profile.student.view',
                name='查看学员个人中心',
                description='查看学员个人中心',
            ),
            PermissionDefinition(
                code='profile.student.update',
                name='更新学员个人资料',
                description='更新学员个人资料',
            ),
        ),
        system_managed_codes=('profile.student.view', 'profile.student.update'),
        role_system_defaults={
            'STUDENT': ('profile.student.view', 'profile.student.update'),
        },
    ),
)
