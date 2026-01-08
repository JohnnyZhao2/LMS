"""
User models for LMS.
Implements:
- Department: 组织单位（室）
- Role: 角色定义
- User: 用户模型
- UserRole: 用户角色关联
"""
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.core.exceptions import ValidationError
from core.mixins import TimestampMixin
class UserManager(BaseUserManager):
    """自定义 User Manager，支持使用 employee_id 作为用户名字段"""
    def create_user(self, employee_id, username, password=None, **extra_fields):
        """创建普通用户"""
        if not employee_id:
            raise ValueError('工号必须提供')
        if not username:
            raise ValueError('姓名必须提供')
        user = self.model(employee_id=employee_id, username=username, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
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
class Role(TimestampMixin, models.Model):
    """
    角色模型
    系统预定义角色:
    - STUDENT: 学员（默认角色，不可移除）
    - MENTOR: 导师
    - DEPT_MANAGER: 室经理
    - ADMIN: 管理员
    - TEAM_MANAGER: 团队经理
    """
    ROLE_CHOICES = [
        ('STUDENT', '学员'),
        ('MENTOR', '导师'),
        ('DEPT_MANAGER', '室经理'),
        ('ADMIN', '管理员'),
        ('TEAM_MANAGER', '团队经理'),
    ]
    # 角色优先级顺序（从高到低）
    # 用于确定用户的默认角色
    ROLE_PRIORITY_ORDER = [
        'ADMIN',
        'DEPT_MANAGER',
        'MENTOR',
        'TEAM_MANAGER',
        'STUDENT',
    ]
    code = models.CharField(
        max_length=20, 
        unique=True, 
        choices=ROLE_CHOICES,
        verbose_name='角色代码'
    )
    name = models.CharField(max_length=50, verbose_name='角色名称')
    description = models.TextField(blank=True, default='', verbose_name='角色描述')
    class Meta:
        db_table = 'lms_role'
        verbose_name = '角色'
        verbose_name_plural = '角色'
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
    username = models.CharField(max_length=150, unique=True)
    mentor = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='mentees')
    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name='members')
    roles = models.ManyToManyField(Role, through='UserRole', through_fields=('user', 'role'), related_name='users')
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    USERNAME_FIELD = 'employee_id'
    REQUIRED_FIELDS = ['username']
    objects = UserManager()
    class Meta:
        db_table = 'lms_user'
        ordering = ['employee_id']
    def __str__(self):
        return self.username
    def has_role(self, role_code: str) -> bool:
        """检查用户是否拥有指定角色"""
        return self.roles.filter(code=role_code).exists()
    @property
    def is_admin(self) -> bool:
        """是否为管理员"""
        return self.has_role('ADMIN')
    @property
    def is_mentor(self) -> bool:
        """是否为导师"""
        return self.has_role('MENTOR')
    @property
    def is_dept_manager(self) -> bool:
        """是否为室经理"""
        return self.has_role('DEPT_MANAGER')
    @property
    def is_team_manager(self) -> bool:
        """是否为团队经理"""
        return self.has_role('TEAM_MANAGER')
    @property
    def role_codes(self) -> list:
        """获取用户所有角色代码列表"""
        return list(self.roles.values_list('code', flat=True))
    def get_mentees(self):
        """获取名下学员"""
        return User.objects.filter(mentor=self, is_active=True)
class UserRole(TimestampMixin, models.Model):
    """
    用户角色关联模型
    实现用户与角色的多对多关系，支持:
    - 记录角色分配时间
    - 记录角色分配者
    """
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
        verbose_name='分配者'
    )
    class Meta:
        db_table = 'lms_user_role'
        verbose_name = '用户角色'
        verbose_name_plural = '用户角色'
        unique_together = ['user', 'role']
        ordering = ['user', 'role']
    def __str__(self):
        return f"{self.user.username} - {self.role.name}"
    def clean(self):
        """
        验证:
        - 学员角色不可移除（在删除时检查）
        """
        super().clean()
    def delete(self, *args, **kwargs):
        """
        重写删除方法，防止删除学员角色
        """
        if self.role.code == 'STUDENT':
            raise ValidationError('学员角色不可移除')
        super().delete(*args, **kwargs)
# Signal handlers for automatic role assignment
from django.db.models.signals import post_save
from django.dispatch import receiver
@receiver(post_save, sender=User)
def assign_default_student_role(sender, instance, created, **kwargs):
    """
    新用户创建后自动分配学员角色
    - Property 5: 新用户默认学员角色
    """
    if created:
        # 获取或创建学员角色
        student_role, _ = Role.objects.get_or_create(
            code='STUDENT',
            defaults={'name': '学员', 'description': '系统默认角色'}
        )
        # 检查是否已有学员角色（避免重复）
        if not UserRole.objects.filter(user=instance, role=student_role).exists():
            UserRole.objects.create(user=instance, role=student_role)
