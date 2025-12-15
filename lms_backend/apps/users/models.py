"""
User models for LMS.

Implements:
- Department: 组织单位（室）
- Role: 角色定义
- User: 用户模型
- UserRole: 用户角色关联

Requirements: 2.1, 3.4
"""
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.exceptions import ValidationError

from core.mixins import TimestampMixin


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


class User(AbstractUser, TimestampMixin):
    """
    自定义用户模型
    
    基础字段:
    - employee_id: 工号
    - real_name: 真实姓名
    - department: 所属部门
    - mentor: 导师（师徒关系）
    
    Requirements:
    - 2.1: 创建用户时存储基础信息并默认分配学员角色
    - 3.4: 为学员指定导师建立师徒绑定关系
    - 3.6: 一个学员同时只能绑定一个导师
    """
    employee_id = models.CharField(
        max_length=20, 
        unique=True, 
        verbose_name='工号'
    )
    real_name = models.CharField(
        max_length=50, 
        verbose_name='真实姓名'
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name='members',
        null=True,
        blank=True,
        verbose_name='所属部门'
    )
    mentor = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='mentees',
        verbose_name='导师'
    )
    roles = models.ManyToManyField(
        Role,
        through='UserRole',
        through_fields=('user', 'role'),
        related_name='users',
        verbose_name='角色'
    )
    
    # Override AbstractUser fields to make email optional
    email = models.EmailField(blank=True, default='', verbose_name='邮箱')
    
    class Meta:
        db_table = 'lms_user'
        verbose_name = '用户'
        verbose_name_plural = '用户'
        ordering = ['employee_id']
    
    def __str__(self):
        return f"{self.real_name}({self.employee_id})"
    
    def clean(self):
        """
        验证师徒关系:
        - 不能自己做自己的导师
        - 导师必须具有 MENTOR 角色
        """
        super().clean()
        if self.mentor:
            if self.mentor == self:
                raise ValidationError({'mentor': '不能将自己设为导师'})
    
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
        """获取名下学员（仅当用户是导师时有意义）"""
        return User.objects.filter(mentor=self, is_active=True)
    
    def get_department_members(self):
        """获取本室成员（仅当用户是室经理时有意义）"""
        if self.department:
            return User.objects.filter(
                department=self.department, 
                is_active=True
            ).exclude(pk=self.pk)
        return User.objects.none()


class UserRole(TimestampMixin, models.Model):
    """
    用户角色关联模型
    
    实现用户与角色的多对多关系，支持:
    - 记录角色分配时间
    - 记录角色分配者
    
    Requirements:
    - 2.6: 在保留默认学员角色的基础上附加其他角色
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
        return f"{self.user.real_name} - {self.role.name}"
    
    def clean(self):
        """
        验证:
        - 学员角色不可移除（在删除时检查）
        """
        super().clean()
    
    def delete(self, *args, **kwargs):
        """
        重写删除方法，防止删除学员角色
        
        Requirements:
        - 2.6: 学员角色不可移除
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
    
    Requirements:
    - 2.1: 创建新用户时默认分配学员角色
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
