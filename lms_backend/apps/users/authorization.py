from apps.authorization.registry import (
    AuthorizationSpec,
    ScopeFilterHandler,
    perm,
)
from apps.users.models import User


def _filter_viewable_users(engine, *, queryset, context=None):
    return engine.get_scoped_user_queryset('users.view_user', queryset.distinct())


AUTHORIZATION_SPECS = (
    AuthorizationSpec(
        key='users.permissions',
        module='user',
        permissions=(
            perm(code='users.view_user'),
            perm(code='users.add_user', implies=('users.view_user',)),
            perm(code='users.change_user', implies=('users.view_user',)),
            perm(code='users.delete_user', implies=('users.view_user',)),
            perm(code='users.activate_user', implies=('users.view_user',)),
            perm(code='users.assign_user_role', implies=('users.view_user',)),
            perm(code='users.view_user_permission', implies=('users.view_user',)),
            perm(code='users.change_user_permission', implies=('users.view_user_permission',)),
            perm(code='users.change_user_avatar', implies=('users.view_user',)),
        ),
        scope_filter_handlers=(
            ScopeFilterHandler(
                key='users.scope_filter.user_view',
                permission_code='users.view_user',
                resource_model=User,
                filter_queryset=_filter_viewable_users,
            ),
        ),
    ),
)
