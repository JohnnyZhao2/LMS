from django.core.management import call_command

import pytest

from apps.users.models import Department, Role, User


@pytest.mark.django_db
def test_init_data_does_not_create_default_super_admin():
    call_command('init_data')

    assert Department.objects.filter(code='DEPT1', name='一室').exists()
    assert Department.objects.filter(code='DEPT2', name='二室').exists()
    assert Role.objects.filter(code='STUDENT', name='学员').exists()
    assert Role.objects.filter(code='MENTOR', name='导师').exists()
    assert Role.objects.filter(code='DEPT_MANAGER', name='室经理').exists()
    assert Role.objects.filter(code='TEAM_MANAGER', name='团队经理').exists()
    assert Role.objects.filter(code='ADMIN', name='管理员').exists()
    assert not User.objects.filter(employee_id='ADMIN001', is_superuser=True).exists()
