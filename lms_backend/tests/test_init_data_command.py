from django.core.management import call_command
from django.contrib.auth.models import Group

import pytest

from apps.users.models import Department, User


@pytest.mark.django_db
def test_init_data_does_not_create_default_super_admin():
    call_command('init_data')

    assert Department.objects.filter(code='DEPT1', name='一室').exists()
    assert Department.objects.filter(code='DEPT2', name='二室').exists()
    assert Group.objects.filter(name='STUDENT').exists()
    assert Group.objects.filter(name='MENTOR').exists()
    assert Group.objects.filter(name='DEPT_MANAGER').exists()
    assert Group.objects.filter(name='ADMIN').exists()
    assert not Group.objects.filter(name='TEAM_MANAGER').exists()
    assert not User.objects.filter(employee_id='ADMIN001', is_superuser=True).exists()
