"""
Serializers for spot check management.
Properties: 35, 36
"""
from rest_framework import serializers

from apps.users.models import User

from .models import SpotCheck, SpotCheckItem


class SpotCheckItemWriteSerializer(serializers.Serializer):
    """抽查明细写入序列化器。"""

    topic = serializers.CharField(max_length=120, trim_whitespace=True)
    content = serializers.CharField(required=False, allow_blank=True, default='', trim_whitespace=True)
    score = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=0, max_value=100)
    comment = serializers.CharField(required=False, allow_blank=True, default='', trim_whitespace=True)


class SpotCheckItemSerializer(serializers.ModelSerializer):
    """抽查明细输出序列化器。"""

    class Meta:
        model = SpotCheckItem
        fields = ['id', 'topic', 'content', 'score', 'comment', 'order']


class SpotCheckListSerializer(serializers.ModelSerializer):
    """抽查记录列表序列化器。"""

    student_name = serializers.CharField(source='student.username', read_only=True)
    student_employee_id = serializers.CharField(source='student.employee_id', read_only=True)
    student_avatar_key = serializers.CharField(source='student.avatar_key', read_only=True)
    checker_name = serializers.CharField(source='checker.username', read_only=True)
    checker_avatar_key = serializers.CharField(source='checker.avatar_key', read_only=True)
    topic_count = serializers.IntegerField(read_only=True)
    topic_summary = serializers.CharField(read_only=True)
    average_score = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True, allow_null=True)
    items = SpotCheckItemSerializer(many=True, read_only=True)

    class Meta:
        model = SpotCheck
        fields = [
            'id',
            'student',
            'student_name',
            'student_employee_id',
            'student_avatar_key',
            'checker',
            'checker_name',
            'checker_avatar_key',
            'topic_count',
            'topic_summary',
            'average_score',
            'items',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['checker', 'created_at', 'updated_at']


class SpotCheckStudentSerializer(serializers.ModelSerializer):
    """抽查学员侧栏序列化器。"""

    department_name = serializers.CharField(source='department.name', read_only=True, allow_null=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'employee_id', 'avatar_key', 'department_name']


class SpotCheckDetailSerializer(serializers.ModelSerializer):
    """抽查记录详情序列化器。"""

    student_name = serializers.CharField(source='student.username', read_only=True)
    student_employee_id = serializers.CharField(source='student.employee_id', read_only=True)
    student_avatar_key = serializers.CharField(source='student.avatar_key', read_only=True)
    student_department = serializers.CharField(source='student.department.name', read_only=True, allow_null=True)
    checker_name = serializers.CharField(source='checker.username', read_only=True)
    checker_avatar_key = serializers.CharField(source='checker.avatar_key', read_only=True)
    items = SpotCheckItemSerializer(many=True, read_only=True)
    topic_count = serializers.IntegerField(read_only=True)
    topic_summary = serializers.CharField(read_only=True)
    average_score = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True, allow_null=True)

    class Meta:
        model = SpotCheck
        fields = [
            'id',
            'student',
            'student_name',
            'student_employee_id',
            'student_avatar_key',
            'student_department',
            'checker',
            'checker_name',
            'checker_avatar_key',
            'topic_count',
            'topic_summary',
            'average_score',
            'items',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['checker', 'created_at', 'updated_at']


class SpotCheckCreateSerializer(serializers.Serializer):
    """创建抽查记录序列化器。"""

    student = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    items = SpotCheckItemWriteSerializer(many=True, allow_empty=False)


class SpotCheckUpdateSerializer(serializers.Serializer):
    """更新抽查记录序列化器。"""

    items = SpotCheckItemWriteSerializer(many=True, allow_empty=False, required=False)
