import pytest
from rest_framework.test import APIClient

from apps.authorization.models import Permission, Role, RolePermission
from apps.spot_checks.models import SpotCheck, SpotCheckItem


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def unwrap_response_data():
    def _unwrap_response_data(response):
        payload = response.data
        if isinstance(payload, dict) and 'code' in payload and 'data' in payload:
            return payload['data']
        return payload

    return _unwrap_response_data


@pytest.fixture
def grant_role_permissions():
    def _grant_role_permissions(role, permission_codes):
        permissions = Permission.objects.filter(code__in=permission_codes)
        for permission in permissions:
            RolePermission.objects.get_or_create(role=role, permission=permission)

    return _grant_role_permissions


@pytest.fixture
def grant_permissions_to_roles():
    def _grant_permissions_to_roles(*, role_codes: list[str], permission_codes: list[str]) -> None:
        permissions = list(Permission.objects.filter(code__in=permission_codes))
        for role_code in role_codes:
            role, _ = Role.objects.get_or_create(code=role_code, defaults={'name': role_code})
            for permission in permissions:
                RolePermission.objects.get_or_create(role=role, permission=permission)

    return _grant_permissions_to_roles


@pytest.fixture
def create_spot_check():
    def _create_spot_check(student, checker, *, topic='契约测试抽查', content='', score='88.00', comment=''):
        spot_check = SpotCheck.objects.create(student=student, checker=checker)
        SpotCheckItem.objects.create(
            spot_check=spot_check,
            topic=topic,
            content=content,
            score=score,
            comment=comment,
            order=0,
        )
        return spot_check

    return _create_spot_check
