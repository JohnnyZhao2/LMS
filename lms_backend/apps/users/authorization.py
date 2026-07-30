from apps.authorization.decisions import conditional_allow, conditional_deny
from apps.authorization.registry import (
    AuthorizationSpec,
    ResourceAuthorizationHandler,
    ScopeFilterHandler,
    crud_permissions,
    perm,
)
from apps.users.models import User


USER_SCOPE_CODES = (
    'user.view',
    'user.create',
    'user.update',
    'user.delete',
    'user.activate',
    'user.role.assign',
    'user.avatar.update',
)
MEMBER_SUMMARY = '按当前角色人员范围'


def _filter_viewable_users(engine, *, queryset):
    return engine.get_role_scoped_user_queryset(queryset.distinct(), cache_key='viewable_users')


def _authorize_user(engine, permission_code, *, resource=None, error_message=None):
    if not isinstance(resource, User):
        return None
    base = engine.base_permission_decision(permission_code, error_message=error_message)
    if not base.allowed:
        return base
    if engine.get_role_scoped_user_queryset(
        User.objects.filter(pk=resource.pk)
    ).exists():
        return conditional_allow(permission_code, constraint='member_scope')
    return conditional_deny(
        permission_code,
        message=error_message or '该用户不在当前管理范围内',
        reason='scope_denied',
        constraint='member_scope',
    )


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
            ),
            perm(
                code='user.permission.view',
                name='查看用户权限',
                description='查看用户直接拥有的管理权限',
            ),
            perm(
                code='user.permission.update',
                name='更新用户权限',
                description='配置用户直接拥有的管理权限',
            ),
            perm(
                code='user.avatar.update',
                name='修改他人头像',
                description='全局角色修改指定用户头像',
            ),
        ),
        resource_authorization_handlers=(
            ResourceAuthorizationHandler(
                key='users.member_scope',
                permission_codes=USER_SCOPE_CODES,
                authorize=_authorize_user,
                constraint_summaries={
                    code: MEMBER_SUMMARY for code in USER_SCOPE_CODES
                },
            ),
        ),
        scope_filter_handlers=(
            ScopeFilterHandler(
                key='users.scope_filter.user_view',
                permission_code='user.view',
                resource_model=User,
                filter_queryset=_filter_viewable_users,
                constraint_summary=MEMBER_SUMMARY,
            ),
        ),
    ),
)
