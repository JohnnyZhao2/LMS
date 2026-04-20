from apps.authorization.registry import (
    AuthorizationSpec,
    ScopeFilterHandler,
    crud_permissions,
    scope_rules,
    perm,
)
from apps.users.models import User


def _filter_viewable_users(engine, *, queryset, context=None):
    return engine.get_scoped_user_queryset('user.view', queryset.distinct(), cache_key='viewable_users')


AUTHORIZATION_SPECS = (
    AuthorizationSpec(
        key='users.permissions',
        module='user',
        permissions=(
            *crud_permissions(
                'user',
                '用户',
                names={'update': '编辑用户'},
                descriptions={'create': '创建新用户', 'update': '编辑用户资料和指定导师', 'delete': '彻底删除离职用户'},
                kwargs_by_action={'view': {'scope_group_key': 'user_scope'}},
            ),
            perm(
                code='user.activate',
                name='启停账号',
                description='启用/停用账号并重置密码',
            ),
            perm(
                code='user.authorize',
                name='分配权限',
                description='分配角色并配置用户权限自定义',
            ),
            perm(
                code='user.avatar.update',
                name='修改他人头像',
                description='管理员修改指定用户头像',
            ),
        ),
        role_defaults={
            'ADMIN': ('user.avatar.update',),
        },
        scope_rules=scope_rules('user.view', MENTOR='MENTEES', DEPT_MANAGER='DEPARTMENT', ADMIN='ALL'),
        scope_filter_handlers=(
            ScopeFilterHandler(
                key='users.scope_filter.user_view',
                permission_code='user.view',
                resource_model=User,
                filter_queryset=_filter_viewable_users,
                constraint_summary='角色范围',
            ),
        ),
    ),
    AuthorizationSpec(
        key='users.profile_permissions',
        module='profile',
        permissions=(
            perm(code='profile.student.view', name='查看学员个人中心', description='查看学员个人中心'),
            perm(code='profile.student.update', name='更新学员个人资料', description='更新学员个人资料'),
        ),
        system_managed_codes=('profile.student.view', 'profile.student.update'),
        role_system_defaults={
            'STUDENT': ('profile.student.view', 'profile.student.update'),
        },
    ),
)
