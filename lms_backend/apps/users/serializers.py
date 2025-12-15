"""
Serializers for user authentication and management.

Requirements: 1.1, 1.2, 1.3, 1.4, 1.6
"""
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password

from .models import User, Role, Department


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
        fields = ['id', 'real_name', 'employee_id']


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
            'id', 'username', 'employee_id', 'real_name',
            'email', 'department', 'mentor', 'is_active'
        ]


# ============ Authentication Serializers ============

class LoginRequestSerializer(serializers.Serializer):
    """
    Serializer for login request.
    
    Requirements: 1.1
    """
    username = serializers.CharField(
        required=True,
        help_text='用户名'
    )
    password = serializers.CharField(
        required=True,
        write_only=True,
        help_text='密码'
    )


class LoginResponseSerializer(serializers.Serializer):
    """
    Serializer for login response.
    
    Requirements: 1.1, 1.2
    """
    access_token = serializers.CharField(help_text='访问令牌')
    refresh_token = serializers.CharField(help_text='刷新令牌')
    user = UserInfoSerializer(help_text='用户信息')
    available_roles = RoleSerializer(many=True, help_text='可用角色列表')
    current_role = serializers.CharField(help_text='当前生效角色')


class LogoutRequestSerializer(serializers.Serializer):
    """Serializer for logout request."""
    refresh_token = serializers.CharField(
        required=False,
        help_text='刷新令牌（可选，用于黑名单）'
    )


class RefreshTokenRequestSerializer(serializers.Serializer):
    """Serializer for token refresh request."""
    refresh_token = serializers.CharField(
        required=True,
        help_text='刷新令牌'
    )


class RefreshTokenResponseSerializer(serializers.Serializer):
    """Serializer for token refresh response."""
    access_token = serializers.CharField(help_text='新的访问令牌')
    refresh_token = serializers.CharField(help_text='新的刷新令牌')


class SwitchRoleRequestSerializer(serializers.Serializer):
    """
    Serializer for role switch request.
    
    Requirements: 1.3
    """
    role_code = serializers.ChoiceField(
        choices=[
            ('STUDENT', '学员'),
            ('MENTOR', '导师'),
            ('DEPT_MANAGER', '室经理'),
            ('ADMIN', '管理员'),
            ('TEAM_MANAGER', '团队经理'),
        ],
        required=True,
        help_text='要切换到的角色代码'
    )


class SwitchRoleResponseSerializer(serializers.Serializer):
    """
    Serializer for role switch response.
    
    Requirements: 1.3, 1.4
    """
    access_token = serializers.CharField(help_text='新的访问令牌')
    refresh_token = serializers.CharField(help_text='新的刷新令牌')
    user = UserInfoSerializer(help_text='用户信息')
    available_roles = RoleSerializer(many=True, help_text='可用角色列表')
    current_role = serializers.CharField(help_text='当前生效角色')


class ResetPasswordRequestSerializer(serializers.Serializer):
    """
    Serializer for password reset request (admin only).
    
    Requirements: 1.6
    """
    user_id = serializers.IntegerField(
        required=True,
        help_text='要重置密码的用户ID'
    )


class ResetPasswordResponseSerializer(serializers.Serializer):
    """
    Serializer for password reset response.
    
    Requirements: 1.6
    """
    temporary_password = serializers.CharField(help_text='临时密码')
    message = serializers.CharField(help_text='提示信息')


class ChangePasswordRequestSerializer(serializers.Serializer):
    """Serializer for user changing their own password."""
    old_password = serializers.CharField(
        required=True,
        write_only=True,
        help_text='当前密码'
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        help_text='新密码'
    )
    
    def validate_new_password(self, value):
        """Validate new password meets requirements."""
        validate_password(value)
        return value


# ============ User Management Serializers ============

class UserListSerializer(serializers.ModelSerializer):
    """
    Serializer for user list view.
    
    Requirements: 2.1, 2.2
    """
    department = DepartmentSerializer(read_only=True)
    mentor = MentorSerializer(read_only=True)
    roles = RoleSerializer(many=True, read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'employee_id', 'real_name',
            'email', 'department', 'mentor', 'roles', 'is_active',
            'created_at', 'updated_at'
        ]


class UserDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for user detail view.
    
    Requirements: 2.1, 2.2
    """
    department = DepartmentSerializer(read_only=True)
    mentor = MentorSerializer(read_only=True)
    roles = RoleSerializer(many=True, read_only=True)
    mentees_count = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'employee_id', 'real_name',
            'email', 'department', 'mentor', 'roles', 'is_active',
            'mentees_count', 'created_at', 'updated_at'
        ]
    
    def get_mentees_count(self, obj):
        """Get count of mentees for this user."""
        return obj.mentees.filter(is_active=True).count()


class UserCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new users.
    
    Requirements:
    - 2.1: 创建新用户时存储基础信息并默认分配学员角色
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        help_text='密码'
    )
    department_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text='部门ID'
    )
    
    class Meta:
        model = User
        fields = [
            'username', 'password', 'employee_id', 'real_name',
            'email', 'department_id'
        ]
    
    def validate_employee_id(self, value):
        """Validate employee_id is unique."""
        if User.objects.filter(employee_id=value).exists():
            raise serializers.ValidationError('该工号已存在')
        return value
    
    def validate_username(self, value):
        """Validate username is unique."""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('该用户名已存在')
        return value
    
    def validate_department_id(self, value):
        """Validate department exists."""
        if value is not None:
            if not Department.objects.filter(id=value).exists():
                raise serializers.ValidationError('部门不存在')
        return value
    
    def create(self, validated_data):
        """Create user with password hashing."""
        department_id = validated_data.pop('department_id', None)
        password = validated_data.pop('password')
        
        if department_id:
            validated_data['department_id'] = department_id
        
        user = User.objects.create_user(
            password=password,
            **validated_data
        )
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user information.
    
    Requirements:
    - 2.2: 更新用户的基础信息和组织归属
    """
    department_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text='部门ID'
    )
    
    class Meta:
        model = User
        fields = [
            'real_name', 'email', 'department_id'
        ]
    
    def validate_department_id(self, value):
        """Validate department exists."""
        if value is not None:
            if not Department.objects.filter(id=value).exists():
                raise serializers.ValidationError('部门不存在')
        return value
    
    def update(self, instance, validated_data):
        """Update user information."""
        department_id = validated_data.pop('department_id', None)
        
        if department_id is not None:
            instance.department_id = department_id
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance


class AssignRolesSerializer(serializers.Serializer):
    """
    Serializer for assigning roles to a user.
    
    Requirements:
    - 2.6: 在保留默认学员角色的基础上附加其他角色
    """
    role_codes = serializers.ListField(
        child=serializers.ChoiceField(choices=[
            ('MENTOR', '导师'),
            ('DEPT_MANAGER', '室经理'),
            ('ADMIN', '管理员'),
            ('TEAM_MANAGER', '团队经理'),
        ]),
        required=True,
        help_text='要分配的角色代码列表（不包含学员角色，学员角色自动保留）'
    )


class AssignMentorSerializer(serializers.Serializer):
    """
    Serializer for assigning a mentor to a user.
    
    Requirements:
    - 3.4: 为学员指定导师建立师徒绑定关系
    - 3.5: 移除绑定时传入 null
    - 3.6: 一个学员同时只能绑定一个导师（自动解除原有绑定）
    """
    mentor_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text='导师用户ID，传入null解除绑定'
    )
    
    def validate_mentor_id(self, value):
        """Validate mentor exists and has MENTOR role."""
        if value is not None:
            try:
                mentor = User.objects.get(pk=value)
                if not mentor.has_role('MENTOR'):
                    raise serializers.ValidationError('指定的用户不是导师')
                if not mentor.is_active:
                    raise serializers.ValidationError('指定的导师已被停用')
            except User.DoesNotExist:
                raise serializers.ValidationError('导师不存在')
        return value


class MenteeListSerializer(serializers.ModelSerializer):
    """Serializer for listing mentees."""
    department = DepartmentSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'employee_id', 'real_name',
            'email', 'department', 'is_active'
        ]


class DepartmentMemberListSerializer(serializers.ModelSerializer):
    """Serializer for listing department members."""
    mentor = MentorSerializer(read_only=True)
    roles = RoleSerializer(many=True, read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'employee_id', 'real_name',
            'email', 'mentor', 'roles', 'is_active'
        ]
