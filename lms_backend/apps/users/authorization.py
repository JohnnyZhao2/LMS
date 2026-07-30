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
                description='启用/停用账号并修改密码',
            ),
            perm(
                code='user.role.assign',
                name='分配用户角色',
                description='给用户分配或移除业务角色',
                implies=('user.view',),
            ),
            perm(
                code='user.permission.view',
                name='查看用户权限',
                description='查看用户继承的角色权限和用户权限自定义',
                implies=('user.view',),
            ),
            perm(
                code='user.permission.update',
                name='更新用户权限',
                description='配置用户权限自定义和范围自定义',
                implies=('user.permission.view',),
            ),
            perm(
                code='user.avatar.update',
                name='修改他人头像',
                description='全局角色修改指定用户头像',
            ),
        ),
        scope_rules=scope_rules('user.view', MENTOR='MENTEES', DEPT='DEPARTMENT', GLOBAL='ALL'),
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
)
