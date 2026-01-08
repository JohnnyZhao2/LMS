"""
Serializers for user management.
"""
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
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
        fields = ['id', 'username', 'employee_id']
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
            'id', 'employee_id', 'username',
            'department', 'mentor', 'is_active'
        ]
# ============ User Management Serializers ============
class UserListSerializer(serializers.ModelSerializer):
    """
    Serializer for user list view.
    """
    department = DepartmentSerializer(read_only=True)
    mentor = MentorSerializer(read_only=True)
    roles = RoleSerializer(many=True, read_only=True)
    class Meta:
        model = User
        fields = [
            'id', 'employee_id', 'username',
            'department', 'mentor', 'roles', 'is_active', 'is_superuser',
            'last_login', 'created_at', 'updated_at'
        ]
class UserDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for user detail view.
    """
    department = DepartmentSerializer(read_only=True)
    mentor = MentorSerializer(read_only=True)
    roles = RoleSerializer(many=True, read_only=True)
    mentees_count = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = [
            'id', 'employee_id', 'username',
            'department', 'mentor', 'roles', 'is_active', 'is_superuser',
            'last_login', 'mentees_count', 'created_at', 'updated_at'
        ]
    @extend_schema_field(serializers.IntegerField())
    def get_mentees_count(self, obj):
        """Get count of mentees for this user."""
        return obj.mentees.filter(is_active=True).count()
class UserCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new users.
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
    class Meta:
        model = User
        fields = [
            'password', 'employee_id', 'username',
            'department_id', 'mentor_id'
        ]
    def validate_username(self, value):
        """Validate username (display name)."""
        if not value or not value.strip():
            raise serializers.ValidationError('姓名不能为空')
        return value.strip()
    def validate_employee_id(self, value):
        """Validate employee_id is unique."""
        if User.objects.filter(employee_id=value).exists():
            raise serializers.ValidationError('该工号已存在')
        return value
    def validate_department_id(self, value):
        """Validate department exists."""
        if not Department.objects.filter(id=value).exists():
            raise serializers.ValidationError('部门不存在')
        return value
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
    def create(self, validated_data):
        """
        创建用户并设置密码。
        直接创建 User 对象而不是使用 create_user() 方法，因为：
        1. 更直观，只传递实际存在的字段
        2. 避免 UserManager 传递 email 等不存在的字段
        3. 手动调用 set_password() 确保密码正确哈希
        Args:
            validated_data: 已验证的数据字典
        Returns:
            User: 创建的用户对象
        """
        # 提取特殊字段
        department_id = validated_data.pop('department_id')
        password = validated_data.pop('password')
        employee_id = validated_data.pop('employee_id')
        username = validated_data.pop('username')
        mentor_id = validated_data.pop('mentor_id', None)
        # 设置部门
        validated_data['department_id'] = department_id
        # 直接创建 User 对象（不传递不存在的字段）
        user = User(
            username=username,
            employee_id=employee_id,
            **validated_data
        )
        # 手动设置密码（会自动哈希）
        user.set_password(password)
        user.save()
        # 如果提供了导师ID，设置导师
        if mentor_id is not None:
            try:
                mentor = User.objects.get(pk=mentor_id)
                user.mentor = mentor
                user.save()
            except User.DoesNotExist:
                # 验证阶段已经检查过，这里理论上不会发生
                pass
        return user
class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user information.
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
    class Meta:
        model = User
        fields = [
            'username', 'employee_id', 'department_id'
        ]
    def validate_username(self, value):
        """Validate username (display name)."""
        if not value or not value.strip():
            raise serializers.ValidationError('姓名不能为空')
        return value.strip()
    def validate_employee_id(self, value):
        """Validate employee_id is unique (excluding current user)."""
        if value:
            # 在 update 方法中，self.instance 是当前用户对象
            # 检查时排除当前用户
            queryset = User.objects.filter(employee_id=value)
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError('该工号已存在')
        return value
    def validate_department_id(self, value):
        """Validate department exists."""
        if value is not None:
            if not Department.objects.filter(id=value).exists():
                raise serializers.ValidationError('部门不存在')
        return value
    def update(self, instance, validated_data):
        """Update user information."""
        from django.utils import timezone
        department_id = validated_data.pop('department_id', None)
        username = validated_data.pop('username', None)  # username 用于存储显示名称
        employee_id = validated_data.pop('employee_id', None)  # employee_id 可以更新
        if department_id is not None:
            instance.department_id = department_id
        if username is not None:
            instance.username = username
        if employee_id is not None:
            instance.employee_id = employee_id
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        # 保存时，Django 的 auto_now=True 会自动更新 updated_at
        instance.save()
        return instance
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
        help_text='要分配的角色代码列表（不包含学员角色，学员角色自动保留）'
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
            'id', 'employee_id', 'username',
            'department', 'is_active'
        ]
class DepartmentMemberListSerializer(serializers.ModelSerializer):
    """Serializer for listing department members."""
    mentor = MentorSerializer(read_only=True)
    roles = RoleSerializer(many=True, read_only=True)
    class Meta:
        model = User
        fields = [
            'id', 'employee_id', 'username',
            'mentor', 'roles', 'is_active'
        ]
