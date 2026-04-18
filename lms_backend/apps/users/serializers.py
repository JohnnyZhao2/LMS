"""
Serializers for user management.
"""
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.authorization.roles import serialize_user_roles
from core.exceptions import BusinessError

from .avatar_constants import validate_avatar_key
from .models import Department, Role, User
from .selectors import get_valid_mentor_by_id


def validate_mentor(mentor_id):
    """
    Validate mentor exists, has MENTOR role, and is active.
    Returns mentor User object if valid.
    Raises ValidationError if invalid.
    """
    try:
        return get_valid_mentor_by_id(mentor_id)
    except BusinessError as exc:
        raise serializers.ValidationError(exc.message)


class UserValidationMixin:
    """Mixin for common user field validations."""
    
    def validate_username_field(self, value, instance=None):
        """Validate username (display name)."""
        if not value or not value.strip():
            raise serializers.ValidationError('姓名不能为空')
        return value.strip()
    
    def validate_employee_id_field(self, value, instance=None):
        """Validate employee_id is unique."""
        if value:
            queryset = User.objects.filter(employee_id=value)
            if instance:
                queryset = queryset.exclude(pk=instance.pk)
            if queryset.exists():
                raise serializers.ValidationError('该工号已存在')
        return value
    
    def validate_department_id_field(self, value):
        """Validate department exists."""
        if value is not None:
            if not Department.objects.filter(id=value).exists():
                raise serializers.ValidationError('部门不存在')
        return value


class DepartmentSerializer(serializers.ModelSerializer):
    """Serializer for Department model."""
    class Meta:
        model = Department
        fields = ['id', 'name', 'code']
class RoleSerializer(serializers.ModelSerializer):
    """Serializer for Role model."""
    class Meta:
        model = Role
        fields = ['code', 'name']
class MentorSerializer(serializers.ModelSerializer):
    """Serializer for mentor information."""
    class Meta:
        model = User
        fields = ['id', 'username', 'employee_id', 'avatar_key']
class UserInfoSerializer(serializers.ModelSerializer):
    """
    Serializer for user information in responses.
    Used in login response and other user-related endpoints.
    """
    department = DepartmentSerializer(read_only=True)
    mentor = MentorSerializer(read_only=True)
    class Meta:
        model = User
        fields = [
            'id', 'employee_id', 'username', 'avatar_key',
            'department', 'mentor', 'is_active', 'is_superuser'
        ]
# ============ User Management Serializers ============
class UserListSerializer(serializers.ModelSerializer):
    """
    Serializer for user list view.
    """
    department = DepartmentSerializer(read_only=True)
    mentor = MentorSerializer(read_only=True)
    roles = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = [
            'id', 'employee_id', 'username', 'avatar_key',
            'department', 'mentor', 'roles', 'is_active', 'is_superuser',
            'last_login', 'created_at', 'updated_at'
        ]

    @extend_schema_field(RoleSerializer(many=True))
    def get_roles(self, obj):
        return serialize_user_roles(obj)


class UserDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for user detail view.
    """
    department = DepartmentSerializer(read_only=True)
    mentor = MentorSerializer(read_only=True)
    roles = serializers.SerializerMethodField()
    mentees_count = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = [
            'id', 'employee_id', 'username', 'avatar_key',
            'department', 'mentor', 'roles', 'is_active', 'is_superuser',
            'last_login', 'mentees_count', 'created_at', 'updated_at'
        ]

    @extend_schema_field(serializers.IntegerField())
    def get_mentees_count(self, obj):
        """Get count of mentees for this user."""
        return obj.mentees.filter(is_active=True).count()

    @extend_schema_field(RoleSerializer(many=True))
    def get_roles(self, obj):
        return serialize_user_roles(obj)
class UserCreateSerializer(UserValidationMixin, serializers.ModelSerializer):
    """
    Serializer for creating new users.
    支持在一个请求中完成：
    - 创建用户基本信息
    - 设置部门
    - 设置导师（可选）
    - 分配角色（可选，学员角色自动保留）
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        help_text='密码'
    )
    department_id = serializers.IntegerField(
        required=True,
        help_text='部门ID'
    )
    mentor_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text='导师ID（可选）'
    )
    role_codes = serializers.ListField(
        child=serializers.ChoiceField(choices=[
            ('MENTOR', '导师'),
            ('DEPT_MANAGER', '室经理'),
            ('ADMIN', '管理员'),
            ('TEAM_MANAGER', '团队经理'),
        ]),
        required=False,
        default=list,
        help_text='要分配的角色代码列表（不包含学员角色；学员以外系统角色最多一个；默认保留学员，室经理/团队经理不保留学员；超管账号禁止分配业务角色）'
    )

    class Meta:
        model = User
        fields = [
            'password', 'employee_id', 'username',
            'department_id', 'mentor_id', 'role_codes'
        ]

    def validate_username(self, value):
        return self.validate_username_field(value)

    def validate_employee_id(self, value):
        return self.validate_employee_id_field(value)

    def validate_department_id(self, value):
        return self.validate_department_id_field(value)

    def validate_mentor_id(self, value):
        """Validate mentor exists and has MENTOR role."""
        validate_mentor(value)
        return value


class AvatarUpdateSerializer(serializers.Serializer):
    avatar_key = serializers.CharField(required=True, max_length=32, help_text='默认头像标识')

    def validate_avatar_key(self, value):
        return validate_avatar_key(value)
class UserUpdateSerializer(UserValidationMixin, serializers.ModelSerializer):
    """
    Serializer for updating user information.
    支持同时更新基本信息、部门和角色，在一个事务中处理以保证数据一致性。
    """
    department_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text='部门ID'
    )
    employee_id = serializers.CharField(
        required=False,
        help_text='工号'
    )
    role_codes = serializers.ListField(
        child=serializers.ChoiceField(choices=[
            ('MENTOR', '导师'),
            ('DEPT_MANAGER', '室经理'),
            ('ADMIN', '管理员'),
            ('TEAM_MANAGER', '团队经理'),
        ]),
        required=False,
        help_text='要分配的角色代码列表（不包含学员角色；学员以外系统角色最多一个；默认保留学员，室经理/团队经理不保留学员；超管账号禁止分配业务角色）'
    )

    class Meta:
        model = User
        fields = [
            'username', 'employee_id', 'department_id', 'role_codes'
        ]

    def validate_username(self, value):
        return self.validate_username_field(value, self.instance)

    def validate_employee_id(self, value):
        return self.validate_employee_id_field(value, self.instance)

    def validate_department_id(self, value):
        return self.validate_department_id_field(value)
class AssignRolesSerializer(serializers.Serializer):
    """
    Serializer for assigning roles to a user.
    """
    role_codes = serializers.ListField(
        child=serializers.ChoiceField(choices=[
            ('MENTOR', '导师'),
            ('DEPT_MANAGER', '室经理'),
            ('ADMIN', '管理员'),
            ('TEAM_MANAGER', '团队经理'),
        ]),
        required=True,
        help_text='要分配的角色代码列表（不包含学员角色；学员以外系统角色最多一个；默认保留学员，室经理/团队经理不保留学员；超管账号禁止分配业务角色）'
    )
class AssignMentorSerializer(serializers.Serializer):
    """
    Serializer for assigning a mentor to a user.
    """
    mentor_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text='导师用户ID，传入null解除绑定'
    )
    def validate_mentor_id(self, value):
        """Validate mentor exists and has MENTOR role."""
        validate_mentor(value)
        return value
