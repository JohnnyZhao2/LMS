"""
测试数据库配置
验证测试数据库是否正确设置
"""
import pytest
from django.conf import settings
from apps.users.models import User


@pytest.mark.django_db
def test_database_connection():
    """测试数据库连接"""
    # 验证使用的是测试数据库
    assert settings.DATABASES['default']['NAME'] == 'lms_test'
    print(f"✓ 使用测试数据库: {settings.DATABASES['default']['NAME']}")


@pytest.mark.django_db
def test_create_user(test_department, admin_role):
    """测试创建用户"""
    user = User.objects.create(
        username='test_user',
        employee_id='TEST001',
        department=test_department
    )
    user.roles.add(admin_role)
    
    assert user.username == 'test_user'
    assert user.department == test_department
    assert user.roles.filter(code='ADMIN').exists()
    print(f"✓ 创建用户成功: {user.username}")


@pytest.mark.django_db
def test_fixtures(admin_user, student_user, mentor_user):
    """测试 fixtures"""
    # 管理员
    assert admin_user.username == 'admin'
    assert admin_user.is_staff
    assert admin_user.roles.filter(code='ADMIN').exists()
    print(f"✓ 管理员: {admin_user.username}")
    
    # 学员
    assert student_user.username == 'student'
    assert student_user.roles.filter(code='STUDENT').exists()
    print(f"✓ 学员: {student_user.username}")
    
    # 导师
    assert mentor_user.username == 'mentor'
    assert mentor_user.roles.filter(code='MENTOR').exists()
    print(f"✓ 导师: {mentor_user.username}")


@pytest.mark.django_db
def test_api_authentication(authenticated_client, admin_user):
    """测试 API 认证"""
    # 测试认证客户端可以访问需要认证的端点
    # 注意：这里只测试认证机制，不测试具体的 API 端点
    assert authenticated_client.handler._force_user == admin_user
    print(f"✓ API 客户端已认证为: {admin_user.username}")

