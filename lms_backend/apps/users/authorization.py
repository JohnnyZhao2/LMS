"""User owned permission specs."""

from apps.authorization.registry import (
    AuthorizationSpec,
    PermissionDefinition,
    PermissionScopeRuleDefinition,
    ScopeFilterHandler,
)
from apps.users.models import User


def _filter_mentee_users(engine, *, queryset, context=None):
    return engine.get_scoped_user_queryset(
        'user.mentee.view',
        queryset.filter(is_active=True, roles__code='STUDENT').distinct(),
        cache_key='active_students',
    )


def _filter_department_members(engine, *, queryset, context=None):
    return engine.get_scoped_user_queryset(
        'user.department_member.view',
        queryset.filter(is_active=True).distinct(),
        cache_key='active_members',
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
            PermissionDefinition(
                code='user.mentee.view',
                name='查看名下学员',
                description='查看当前导师可管理的学员列表',
            ),
            PermissionDefinition(
                code='user.department_member.view',
                name='查看本室成员',
                description='查看当前室经理所在部门成员列表',
            ),
        ),
        role_defaults={
            'ADMIN': ('user.avatar.update',),
            'MENTOR': ('user.mentee.view',),
            'DEPT_MANAGER': ('user.department_member.view',),
        },
        scope_rules=(
            PermissionScopeRuleDefinition('user.mentee.view', 'MENTOR', 'MENTEES'),
            PermissionScopeRuleDefinition('user.department_member.view', 'DEPT_MANAGER', 'DEPARTMENT'),
        ),
        scope_filter_handlers=(
            ScopeFilterHandler(
                key='users.scope_filter.mentees',
                permission_code='user.mentee.view',
                resource_model=User,
                filter_queryset=_filter_mentee_users,
                constraint_summary='默认按名下学员范围生效，可通过用户授权按学员范围增删。',
            ),
            ScopeFilterHandler(
                key='users.scope_filter.department_members',
                permission_code='user.department_member.view',
                resource_model=User,
                filter_queryset=_filter_department_members,
                constraint_summary='默认按本室成员范围生效，可通过用户授权按成员范围增删。',
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
