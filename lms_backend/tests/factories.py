"""
Factory Boy factories for generating test data.
"""
import factory
from factory.django import DjangoModelFactory
from django.contrib.auth import get_user_model

from apps.users.models import Department, Role, UserRole

User = get_user_model()


class DepartmentFactory(DjangoModelFactory):
    """Factory for creating Department instances."""
    
    class Meta:
        model = Department
    
    name = factory.Sequence(lambda n: f'部门{n}')
    code = factory.Sequence(lambda n: f'DEPT{n:03d}')
    description = factory.LazyAttribute(lambda obj: f'{obj.name}的描述')


class RoleFactory(DjangoModelFactory):
    """Factory for creating Role instances."""
    
    class Meta:
        model = Role
        django_get_or_create = ('code',)
    
    code = 'STUDENT'
    name = factory.LazyAttribute(lambda obj: dict(Role.ROLE_CHOICES).get(obj.code, obj.code))
    description = factory.LazyAttribute(lambda obj: f'{obj.name}角色')


class UserFactory(DjangoModelFactory):
    """Factory for creating User instances."""
    
    class Meta:
        model = User
    
    username = factory.Sequence(lambda n: f'user{n}')
    employee_id = factory.Sequence(lambda n: f'EMP{n:06d}')
    real_name = factory.Sequence(lambda n: f'用户{n}')
    email = factory.LazyAttribute(lambda obj: f'{obj.username}@example.com')
    password = factory.PostGenerationMethodCall('set_password', 'testpass123')
    is_active = True
    department = factory.SubFactory(DepartmentFactory)


class UserRoleFactory(DjangoModelFactory):
    """Factory for creating UserRole instances."""
    
    class Meta:
        model = UserRole
    
    user = factory.SubFactory(UserFactory)
    role = factory.SubFactory(RoleFactory)
    assigned_by = None


# Additional factories will be added as models are implemented
# - KnowledgeFactory (task 4.1)
# - QuestionFactory (task 5.1)
# - QuizFactory (task 6.1)
# - TaskFactory (task 7.1)
# - SubmissionFactory (task 9.1)
# - SpotCheckFactory (task 10.1)
