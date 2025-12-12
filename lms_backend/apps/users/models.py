"""
User and Role models for LMS Backend.
"""
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class Department(models.Model):
    """部门模型"""
    name = models.CharField(max_length=50, verbose_name='部门名称')
    code = models.CharField(max_length=20, unique=True, verbose_name='部门代码')
    manager = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_department',
        verbose_name='部门经理'
    )
    description = models.TextField(null=True, blank=True, verbose_name='描述')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'departments'
        verbose_name = '部门'
        verbose_name_plural = '部门'

    def __str__(self):
        return self.name


class User(AbstractUser):
    """用户模型，继承 Django AbstractUser"""
    real_name = models.CharField(max_length=50, verbose_name='真实姓名')
    employee_id = models.CharField(max_length=20, unique=True, verbose_name='工号')
    phone = models.CharField(max_length=11, unique=True, null=True, blank=True, verbose_name='手机号')
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='employees',
        verbose_name='所属部门'
    )
    mentor = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='students',
        verbose_name='导师'
    )
    join_date = models.DateField(null=True, blank=True, verbose_name='入职日期')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'users'
        verbose_name = '用户'
        verbose_name_plural = '用户'

    def __str__(self):
        return f"{self.username} ({self.real_name})"

    def get_roles(self):
        """获取用户的所有角色"""
        return self.user_roles.select_related('role').all()

    def has_role(self, role_code):
        """检查用户是否拥有指定角色"""
        return self.user_roles.filter(role__code=role_code).exists()

    def assign_role(self, role, assigned_by=None):
        """分配角色给用户"""
        user_role, created = UserRole.objects.get_or_create(
            user=self,
            role=role,
            defaults={'assigned_by': assigned_by}
        )
        return user_role, created

    def remove_role(self, role):
        """移除用户的角色"""
        return UserRole.objects.filter(user=self, role=role).delete()


class Role(models.Model):
    """角色模型"""
    STUDENT = 'STUDENT'
    MENTOR = 'MENTOR'
    DEPT_MANAGER = 'DEPT_MANAGER'
    TEAM_MANAGER = 'TEAM_MANAGER'
    ADMIN = 'ADMIN'

    ROLE_CHOICES = [
        (STUDENT, '学员'),
        (MENTOR, '导师'),
        (DEPT_MANAGER, '室经理'),
        (TEAM_MANAGER, '团队经理'),
        (ADMIN, '管理员'),
    ]

    name = models.CharField(max_length=20, unique=True, verbose_name='角色名称')
    code = models.CharField(max_length=20, unique=True, choices=ROLE_CHOICES, verbose_name='角色代码')
    description = models.TextField(null=True, blank=True, verbose_name='描述')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        db_table = 'roles'
        verbose_name = '角色'
        verbose_name_plural = '角色'

    def __str__(self):
        return self.name


class UserRole(models.Model):
    """用户角色关联模型"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='user_roles',
        verbose_name='用户'
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name='role_users',
        verbose_name='角色'
    )
    assigned_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_roles',
        verbose_name='分配人'
    )
    assigned_at = models.DateTimeField(auto_now_add=True, verbose_name='分配时间')

    class Meta:
        db_table = 'user_roles'
        unique_together = ('user', 'role')
        verbose_name = '用户角色'
        verbose_name_plural = '用户角色'

    def __str__(self):
        return f"{self.user.username} - {self.role.name}"
