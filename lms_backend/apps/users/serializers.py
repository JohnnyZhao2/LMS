"""
Serializers for user management.
"""
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Department, Role, User


def validate_mentor(mentor_id):
    """
    Validate mentor exists, has MENTOR role, and is active.
    Returns mentor User object if valid.
    Raises ValidationError if invalid.
    """
    if mentor_id is None:
        return None
    try:
        mentor = User.objects.get(pk=mentor_id)
        if not mentor.has_role('MENTOR'):
            raise serializers.ValidationError('指定的用户不是导师')
        if not mentor.is_active:
            raise serializers.ValidationError('指定的导师已被停用')
        return mentor
    except User.DoesNotExist:
        raise serializers.ValidationError('导师不存在')


class UserValidationMixin:
    """Mixin for common user field validations."""
    
    def validate_username_field(self, value, instance=None):
        """Validate username (display name)."""
        if not value or not value.strip():
            raise serializers.ValidationError('姓名不能为空')
        normalized = value.strip()
        queryset = User.objects.filter(username=normalized)
        if instance:
            queryset = queryset.exclude(pk=instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('该姓名已存在')
        return normalized
    
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
            'department', 'mentor', 'is_active', 'is_superuser'
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
class UserCreateSerializer(UserValidationMixin, serializers.ModelSerializer):
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
        return self.validate_username_field(value)
    
    def validate_employee_id(self, value):
        return self.validate_employee_id_field(value)
    
    def validate_department_id(self, value):
        return self.validate_department_id_field(value)
    
    def validate_mentor_id(self, value):
        """Validate mentor exists and has MENTOR role."""
        validate_mentor(value)
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
        help_text='要分配的角色代码列表（不包含学员角色，学员角色自动保留）'
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

    def validate(self, attrs):
        """验证角色和部门的约束，同时考虑两者的变化。"""
        role_codes = attrs.get('role_codes')
        department_id = attrs.get('department_id')

        # 确定最终的角色和部门
        final_has_dept_manager = (
            'DEPT_MANAGER' in role_codes if role_codes is not None
            else (self.instance.has_role('DEPT_MANAGER') if self.instance else False)
        )
        final_has_team_manager = (
            'TEAM_MANAGER' in role_codes if role_codes is not None
            else (self.instance.has_role('TEAM_MANAGER') if self.instance else False)
        )
        final_department_id = (
            department_id if department_id is not None
            else getattr(self.instance, 'department_id', None)
        )

        # 验证团队经理唯一性（全局只能有一个）
        if final_has_team_manager:
            existing_team_manager = User.objects.filter(
                roles__code='TEAM_MANAGER',
                is_active=True
            ).exclude(pk=self.instance.pk if self.instance else None).first()
            if existing_team_manager:
                raise serializers.ValidationError({
                    'role_codes': f'团队经理角色已被分配给 {existing_team_manager.employee_id}，全局只能有一个团队经理'
                })

        # 验证室经理唯一性（每个部门只能有一个）
        if final_has_dept_manager:
            if not final_department_id:
                raise serializers.ValidationError({
                    'role_codes': '用户未分配部门，无法设置为室经理'
                })
            existing_dept_manager = User.objects.filter(
                roles__code='DEPT_MANAGER',
                department_id=final_department_id,
                is_active=True
            ).exclude(pk=self.instance.pk if self.instance else None).first()
            if existing_dept_manager:
                dept = Department.objects.filter(id=final_department_id).first()
                dept_name = dept.name if dept else final_department_id
                raise serializers.ValidationError({
                    'role_codes': f'部门 {dept_name} 已有室经理 {existing_dept_manager.employee_id}，每个部门只能有一个室经理'
                })

        return attrs

    def update(self, instance, validated_data):
        """Update user information including roles."""
        from django.db import transaction
        from .models import Role, UserRole

        department_id = validated_data.pop('department_id', None)
        username = validated_data.pop('username', None)
        employee_id = validated_data.pop('employee_id', None)
        role_codes = validated_data.pop('role_codes', None)

        with transaction.atomic():
            # 更新基本信息
            if department_id is not None:
                instance.department_id = department_id
            if username is not None:
                instance.username = username
            if employee_id is not None:
                instance.employee_id = employee_id
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()

            # 更新角色（如果提供了 role_codes）
            if role_codes is not None:
                roles_to_assign = set(role_codes)
                roles_to_assign.add('STUDENT')  # 始终保留学员角色

                current_role_codes = set(instance.roles.values_list('code', flat=True))
                roles_to_remove = current_role_codes - roles_to_assign
                if 'STUDENT' in roles_to_remove:
                    roles_to_remove.remove('STUDENT')
                roles_to_add = roles_to_assign - current_role_codes

                if roles_to_remove:
                    UserRole.objects.filter(
                        user_id=instance.id,
                        role__code__in=list(roles_to_remove)
                    ).delete()

                for role_code in roles_to_add:
                    role = Role.objects.filter(code=role_code).first()
                    if not role:
                        role_name = dict(Role.ROLE_CHOICES).get(role_code, role_code)
                        role = Role.objects.create(
                            code=role_code,
                            name=role_name,
                            description=f'{role_name}角色'
                        )
                    if not instance.roles.filter(code=role_code).exists():
                        # 使用 context 中的 request.user 作为 assigned_by
                        assigned_by = self.context.get('request').user if self.context.get('request') else instance
                        UserRole.objects.create(
                            user_id=instance.id,
                            role_id=role.id,
                            assigned_by_id=assigned_by.id
                        )

                instance.refresh_from_db()

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
        validate_mentor(value)
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
