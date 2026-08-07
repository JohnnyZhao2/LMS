"""
User models for LMS.
Implements Department and the custom Django auth User.
"""
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    Group,
    PermissionsMixin,
)
from django.db import models, transaction
from django.utils.functional import cached_property

from core.mixins import TimestampMixin


ROLE_CHOICES = [
    ('STUDENT', '学员'),
    ('MENTOR', '导师'),
    ('DEPT_MANAGER', '室经理'),
    ('ADMIN', '管理员'),
]
ROLE_LABELS = dict(ROLE_CHOICES)
ROLE_PRIORITY_ORDER = ['ADMIN', 'DEPT_MANAGER', 'MENTOR', 'STUDENT']


class UserManager(BaseUserManager):
    """自定义 User Manager，支持使用 employee_id 作为用户名字段"""
    DEFAULT_ROLE_CODE = 'STUDENT'
    def _ensure_default_student_role(self, user):
        student_role, _ = Group.objects.get_or_create(name=self.DEFAULT_ROLE_CODE)
        user.groups.add(student_role)

    def create_user(self, employee_id, username, password=None, **extra_fields):
        """创建普通用户"""
        if not employee_id:
            raise ValueError('工号必须提供')
        if not username:
            raise ValueError('姓名必须提供')
        user = self.model(employee_id=employee_id, username=username, **extra_fields)
        if password:
            user.set_password(password)
        with transaction.atomic(using=self._db):
            user.save(using=self._db)
            if not user.is_superuser:
                self._ensure_default_student_role(user)
        return user
    def create_superuser(self, employee_id, username, password=None, **extra_fields):
        """创建超级用户"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        if extra_fields.get('is_staff') is not True:
            raise ValueError('超级用户必须 is_staff=True')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('超级用户必须 is_superuser=True')
        return self.create_user(employee_id, username, password, **extra_fields)
    def get_by_natural_key(self, employee_id):
        """通过自然键（employee_id）获取用户"""
        return self.get(employee_id=employee_id)
class Department(TimestampMixin, models.Model):
    """
    部门/室模型
    系统固定为一室/二室
    """
    name = models.CharField(max_length=50, unique=True, verbose_name='部门名称')
    code = models.CharField(max_length=20, unique=True, verbose_name='部门代码')
    description = models.TextField(blank=True, default='', verbose_name='部门描述')
    class Meta:
        db_table = 'lms_department'
        verbose_name = '部门'
        verbose_name_plural = '部门'
        ordering = ['code']
    def __str__(self):
        return self.name
class User(TimestampMixin, AbstractBaseUser, PermissionsMixin):
    """
    用户模型
    继承的字段（来自基类）:
    - created_at: 创建时间（来自 TimestampMixin，auto_now_add=True）
    - updated_at: 更新时间（来自 TimestampMixin，auto_now=True）
    - last_login: 最后登录时间（来自 AbstractBaseUser，nullable）
    - password: 密码（来自 AbstractBaseUser）
    - id: 主键（自动生成）
    """
    employee_id = models.CharField(max_length=100, unique=True)
    username = models.CharField(max_length=150)
    avatar_key = models.CharField(max_length=32, blank=True, default='avatar-01')
    mentor = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='mentees')
    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name='members')
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    USERNAME_FIELD = 'employee_id'
    REQUIRED_FIELDS = ['username']
    objects = UserManager()
    class Meta:
        db_table = 'lms_user'
        ordering = ['employee_id']
        permissions = [
            ('activate_user', '启停账号'),
            ('assign_user_role', '分配用户角色'),
            ('view_user_permission', '查看用户权限'),
            ('change_user_permission', '更新用户权限'),
            ('change_user_avatar', '修改他人头像'),
        ]
    def __str__(self):
        return self.username
    def has_role(self, role_code: str) -> bool:
        """检查用户是否拥有指定角色"""
        return self.groups.filter(name=role_code).exists()
    @property
    def is_admin(self) -> bool:
        """是否为管理员"""
        return self.is_superuser or self.has_role('ADMIN')
    @cached_property
    def role_codes(self) -> list:
        """获取用户所有角色代码列表"""
        return list(self.groups.values_list('name', flat=True))
# Signal handlers for automatic role assignment
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender=User)
def assign_default_student_role(sender, instance, created, **kwargs):
    """
    新用户创建后自动分配学员角色。
    后续仅在分配室经理时，角色分配流程会移除学员角色。
    - Property 5: 新用户默认学员角色
    """
    if created and not instance.is_superuser:
        student_role, _ = Group.objects.get_or_create(name='STUDENT')
        instance.groups.add(student_role)
