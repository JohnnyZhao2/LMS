import pytest
from django.contrib.auth.models import AnonymousUser
from django.test import RequestFactory

from apps.authorization.constants import ROLE_PERMISSION_DEFAULTS, ROLE_SYSTEM_PERMISSION_DEFAULTS
from apps.authorization.models import RolePermission
from apps.authorization.services import AuthorizationService
from apps.users.models import Role


def _build_service() -> AuthorizationService:
    request = RequestFactory().get('/')
    request.user = AnonymousUser()
    return AuthorizationService(request)


@pytest.mark.django_db
def test_ensure_defaults_preserves_existing_role_templates_by_default():
    Role.objects.get_or_create(code='ADMIN', defaults={'name': '管理员'})
    AuthorizationService.ensure_defaults()
    service = _build_service()

    custom_codes = {'knowledge.view', 'tag.view'}
    service.replace_role_permissions('ADMIN', custom_codes)

    AuthorizationService.ensure_defaults()

    current_codes = set(service.get_role_permission_codes('ADMIN'))
    assert current_codes == custom_codes | set(ROLE_SYSTEM_PERMISSION_DEFAULTS['ADMIN'])


@pytest.mark.django_db
def test_ensure_defaults_can_explicitly_reset_existing_role_templates():
    role, _ = Role.objects.get_or_create(code='ADMIN', defaults={'name': '管理员'})
    AuthorizationService.ensure_defaults()
    service = _build_service()

    custom_codes = {'knowledge.view', 'tag.view'}
    service.replace_role_permissions('ADMIN', custom_codes)

    AuthorizationService.ensure_defaults(
        sync_role_templates=True,
        overwrite_existing_role_templates=True,
    )

    current_codes = set(service.get_role_permission_codes('ADMIN'))
    assert current_codes == (
        set(ROLE_PERMISSION_DEFAULTS['ADMIN']) | set(ROLE_SYSTEM_PERMISSION_DEFAULTS['ADMIN'])
    )
    assert not RolePermission.objects.filter(role=role).exists()


@pytest.mark.django_db
def test_existing_role_overrides_automatically_receive_new_default_permissions():
    Role.objects.get_or_create(code='ADMIN', defaults={'name': '管理员'})
    AuthorizationService.ensure_defaults()
    service = _build_service()

    custom_codes = {'knowledge.view', 'tag.view'}
    service.replace_role_permissions('ADMIN', custom_codes)

    original_defaults = list(ROLE_PERMISSION_DEFAULTS['ADMIN'])
    try:
        ROLE_PERMISSION_DEFAULTS['ADMIN'] = [*original_defaults, 'user.view']
        current_codes = set(service.get_role_permission_codes('ADMIN'))
    finally:
        ROLE_PERMISSION_DEFAULTS['ADMIN'] = original_defaults

    assert custom_codes.issubset(current_codes)
    assert 'user.view' in current_codes


@pytest.mark.django_db
def test_replace_role_permissions_allows_system_managed_defaults():
    Role.objects.get_or_create(code='ADMIN', defaults={'name': '管理员'})
    AuthorizationService.ensure_defaults()
    service = _build_service()

    current_codes = set(service.replace_role_permissions('ADMIN', {'knowledge.view', 'tag.view'}))

    assert 'knowledge.view' in current_codes
    assert 'tag.view' in current_codes
    assert 'dashboard.admin.view' in current_codes
