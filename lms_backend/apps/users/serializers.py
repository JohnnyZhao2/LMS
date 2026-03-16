"""
Serializers for user management.
"""
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from core.exceptions import BusinessError

from .models import Department, Role, User
from .permissions import SUPER_ADMIN_ROLE, SUPER_ADMIN_ROLE_NAME
from .role_constraints import validate_role_assignment_constraints


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


def _serialize_user_roles(user: User) -> list[dict]:
    if user.is_superuser:
        return [{'code': SUPER_ADMIN_ROLE, 'name': SUPER_ADMIN_ROLE_NAME}]
    return [{'code': role.code, 'name': role.name} for role in user.roles.all()]


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
    roles = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = [
            'id', 'employee_id', 'username',
            'department', 'mentor', 'roles', 'is_active', 'is_superuser',
            'last_login', 'created_at', 'updated_at'
        ]

    @extend_schema_field(RoleSerializer(many=True))
    def get_roles(self, obj):
        return _serialize_user_roles(obj)


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
            'id', 'employee_id', 'username',
            'department', 'mentor', 'roles', 'is_active', 'is_superuser',
            'last_login', 'mentees_count', 'created_at', 'updated_at'
        ]

    @extend_schema_field(serializers.IntegerField())
    def get_mentees_count(self, obj):
        """Get count of mentees for this user."""
        return obj.mentees.filter(is_active=True).count()

    @extend_schema_field(RoleSerializer(many=True))
    def get_roles(self, obj):
        return _serialize_user_roles(obj)
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

    def validate(self, attrs):
        """验证角色和部门的约束。"""
        role_codes = attrs.get('role_codes', [])
        department_id = attrs.get('department_id')
        try:
            validate_role_assignment_constraints(
                role_codes=role_codes,
                department_id=department_id,
                is_superuser=False,
            )
        except BusinessError as exc:
            raise serializers.ValidationError({'role_codes': exc.message})

        return attrs

    def create(self, validated_data):
        """
        创建用户并设置密码、导师和角色（在一个事务中）。
        Args:
            validated_data: 已验证的数据字典
        Returns:
            User: 创建的用户对象
        """
        from django.db import transaction

        # 提取特殊字段
        department_id = validated_data.pop('department_id')
        password = validated_data.pop('password')
        employee_id = validated_data.pop('employee_id')
        username = validated_data.pop('username')
        mentor_id = validated_data.pop('mentor_id', None)
        role_codes = validated_data.pop('role_codes', [])

        with transaction.atomic():
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
                    user.save(update_fields=['mentor'])
                except User.DoesNotExist:
                    pass

            # 分配角色（统一走 service，保证约束与日志一致）
            from .services import UserManagementService

            request = self.context.get('request')
            if not request or not getattr(request, 'user', None) or not request.user.is_authenticated:
                raise serializers.ValidationError({'role_codes': '缺少请求上下文，无法分配角色'})
            assigned_by = request.user
            service = UserManagementService(request)
            service.assign_roles(
                user_id=user.id,
                role_codes=role_codes,
                assigned_by=assigned_by,
            )

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

    def validate(self, attrs):
        """验证角色和部门的约束，同时考虑两者的变化。"""
        role_codes = attrs.get('role_codes')
        department_id = attrs.get('department_id')

        # 确定最终的角色和部门（role_codes 省略时沿用现有非 STUDENT 角色）
        final_role_codes = (
            role_codes
            if role_codes is not None
            else list(
                self.instance.roles.exclude(code='STUDENT').values_list('code', flat=True)
            )
        )
        final_department_id = (
            department_id if department_id is not None
            else getattr(self.instance, 'department_id', None)
        )
        try:
            validate_role_assignment_constraints(
                role_codes=final_role_codes,
                department_id=final_department_id,
                is_superuser=self.instance.is_superuser if self.instance else False,
                exclude_user_id=self.instance.pk if self.instance else None,
                validate_dedicated_roles=role_codes is not None,
            )
        except BusinessError as exc:
            raise serializers.ValidationError({'role_codes': exc.message})

        return attrs

    def update(self, instance, validated_data):
        """Update user information including roles."""
        from django.db import transaction
        from .services import UserManagementService

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
                request = self.context.get('request')
                if not request:
                    raise serializers.ValidationError({
                        'role_codes': '缺少请求上下文，无法记录角色分配人'
                    })
                service = UserManagementService(request)
                instance = service.assign_roles(
                    user_id=instance.id,
                    role_codes=role_codes,
                    assigned_by=request.user
                )

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
    roles = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = [
            'id', 'employee_id', 'username',
            'mentor', 'roles', 'is_active'
        ]

    @extend_schema_field(RoleSerializer(many=True))
    def get_roles(self, obj):
        return _serialize_user_roles(obj)
