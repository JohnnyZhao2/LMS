"""
Serializers for User and Role models.
"""
from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, Role, UserRole, Department


class RoleSerializer(serializers.ModelSerializer):
    """角色序列化器"""
    class Meta:
        model = Role
        fields = ['id', 'name', 'code', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']


class DepartmentSerializer(serializers.ModelSerializer):
    """部门序列化器"""
    manager_name = serializers.CharField(source='manager.real_name', read_only=True)
    
    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'manager', 'manager_name', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']


class UserSerializer(serializers.ModelSerializer):
    """用户序列化器"""
    department_name = serializers.CharField(source='department.name', read_only=True)
    mentor_name = serializers.CharField(source='mentor.real_name', read_only=True)
    roles = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'real_name', 'employee_id', 'email', 'phone',
            'department', 'department_name', 'mentor', 'mentor_name',
            'join_date', 'is_active', 'roles', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def get_roles(self, obj):
        """获取用户角色列表"""
        user_roles = obj.user_roles.select_related('role').all()
        return [{'id': ur.role.id, 'name': ur.role.name, 'code': ur.role.code} for ur in user_roles]

    def create(self, validated_data):
        """创建用户并自动分配学员角色"""
        user = User.objects.create_user(**validated_data)
        # 自动分配学员角色
        student_role = Role.objects.get(code=Role.STUDENT)
        user.assign_role(student_role)
        return user


class LoginSerializer(serializers.Serializer):
    """登录序列化器"""
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')

        if username and password:
            user = authenticate(username=username, password=password)
            if not user:
                raise serializers.ValidationError('用户名或密码错误')
            if not user.is_active:
                raise serializers.ValidationError('用户账号已被禁用')
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('必须提供用户名和密码')


class UserDetailSerializer(serializers.ModelSerializer):
    """用户详情序列化器（包含更多信息）"""
    department = DepartmentSerializer(read_only=True)
    mentor = UserSerializer(read_only=True)
    roles = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'real_name', 'employee_id', 'email', 'phone',
            'department', 'mentor', 'join_date', 'is_active', 'is_staff',
            'roles', 'created_at', 'updated_at', 'last_login'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_login']

    def get_roles(self, obj):
        """获取用户角色列表"""
        user_roles = obj.user_roles.select_related('role').all()
        return [{
            'id': ur.role.id,
            'name': ur.role.name,
            'code': ur.role.code,
            'assigned_at': ur.assigned_at
        } for ur in user_roles]


class RoleSwitchSerializer(serializers.Serializer):
    """角色切换序列化器"""
    role_code = serializers.ChoiceField(choices=[
        Role.STUDENT,
        Role.MENTOR,
        Role.DEPT_MANAGER,
        Role.TEAM_MANAGER,
        Role.ADMIN
    ])

    def validate_role_code(self, value):
        """验证用户是否拥有该角色"""
        user = self.context['request'].user
        if not user.has_role(value):
            raise serializers.ValidationError('您没有该角色权限')
        return value
