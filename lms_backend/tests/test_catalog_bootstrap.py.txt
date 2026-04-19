from unittest.mock import patch

from apps.activity_logs.bootstrap import sync_activity_log_policies
from apps.authorization.bootstrap import sync_authorization_defaults


def test_sync_authorization_defaults_calls_ensure_defaults():
    with patch('apps.authorization.bootstrap.AuthorizationService.ensure_defaults') as mocked:
        sync_authorization_defaults()

    mocked.assert_called_once_with()


def test_sync_activity_log_policies_calls_service_sync():
    with patch('apps.activity_logs.bootstrap.ActivityLogService.sync_policies') as mocked:
        sync_activity_log_policies()

    mocked.assert_called_once_with()
