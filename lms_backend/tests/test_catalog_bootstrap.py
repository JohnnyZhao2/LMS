from unittest.mock import patch

from django.test import override_settings

from apps.activity_logs.bootstrap import sync_activity_log_policies
from apps.authorization.bootstrap import sync_authorization_defaults
from apps.authorization.registry import crud_permissions, discover_authorization_spec_modules, load_authorization_specs


def test_sync_authorization_defaults_calls_ensure_defaults():
    with patch('apps.authorization.bootstrap.AuthorizationService.ensure_defaults') as mocked:
        sync_authorization_defaults()

    mocked.assert_called_once_with()


def test_sync_activity_log_policies_calls_service_sync():
    with patch('apps.activity_logs.bootstrap.ActivityLogService.sync_policies') as mocked:
        sync_activity_log_policies()

    mocked.assert_called_once_with()


def test_discover_authorization_spec_modules_follows_installed_apps_order():
    discover_authorization_spec_modules.cache_clear()
    load_authorization_specs.cache_clear()
    with override_settings(
        INSTALLED_APPS=['django.contrib.admin', 'apps.users.apps.UsersConfig', 'apps.auth', 'apps.authorization', 'apps.tasks']
    ):
        assert discover_authorization_spec_modules() == (
            'apps.users.authorization',
            'apps.authorization.authorization',
            'apps.tasks.authorization',
        )
    discover_authorization_spec_modules.cache_clear()
    load_authorization_specs.cache_clear()


def test_crud_permissions_supports_overrides():
    view_permission, _, update_permission, delete_permission = crud_permissions(
        'user',
        '用户',
        names={'update': '编辑用户'},
        descriptions={'view': '查看用户列表和详情'},
        kwargs_by_action={'view': {'scope_group_key': 'user_scope'}, 'delete': {'implies': ('user.view',)}},
    )

    assert view_permission.code == 'user.view'
    assert view_permission.scope_group_key == 'user_scope'
    assert view_permission.description == '查看用户列表和详情'
    assert update_permission.name == '编辑用户'
    assert delete_permission.implies == ('user.view',)
