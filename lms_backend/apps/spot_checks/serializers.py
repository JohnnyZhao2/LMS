"""Serializers for spot check management."""
from rest_framework import serializers

from apps.users.models import User

from .models import SpotCheck, SpotCheckItem
from .policies import get_spot_check_actions_payload


class SpotCheckItemIssueSerializer(serializers.Serializer):
    topic = serializers.CharField(max_length=120, trim_whitespace=True)
    instruction = serializers.CharField(required=False, allow_blank=True, default='', trim_whitespace=True)
    instruction_images = serializers.ListField(
        child=serializers.CharField(allow_blank=False),
        required=False,
        default=list,
    )


class SpotCheckItemSubmitSerializer(serializers.Serializer):
    id = serializers.IntegerField(min_value=1)
    content = serializers.CharField(required=False, allow_blank=True, default='', trim_whitespace=True)
    images = serializers.ListField(
        child=serializers.CharField(allow_blank=False),
        required=False,
        default=list,
    )


class SpotCheckItemScoreSerializer(serializers.Serializer):
    id = serializers.IntegerField(min_value=1)
    # 允许空：支持逐项即时打分，未评项先空着
    score = serializers.DecimalField(
        max_digits=4,
        decimal_places=2,
        min_value=0,
        max_value=10,
        required=False,
        allow_null=True,
    )
    comment = serializers.CharField(required=False, allow_blank=True, default='', trim_whitespace=True)


class SpotCheckItemListSerializer(serializers.ModelSerializer):
    """列表用，不含图片数据。"""

    class Meta:
        model = SpotCheckItem
        fields = ['id', 'topic', 'instruction', 'content', 'score', 'comment', 'order']


class SpotCheckItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpotCheckItem
        fields = ['id', 'topic', 'instruction', 'instruction_images', 'content', 'score', 'comment', 'images', 'order']


class SpotCheckListSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.username', read_only=True)
    student_employee_id = serializers.CharField(source='student.employee_id', read_only=True)
    student_avatar_key = serializers.CharField(source='student.avatar_key', read_only=True)
    checker_name = serializers.CharField(source='checker.username', read_only=True)
    checker_avatar_key = serializers.CharField(source='checker.avatar_key', read_only=True)
    topic_count = serializers.IntegerField(read_only=True)
    topic_summary = serializers.CharField(read_only=True)
    average_score = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True, allow_null=True)
    items = SpotCheckItemListSerializer(many=True, read_only=True)
    actions = serializers.SerializerMethodField()

    def get_actions(self, obj):
        return get_spot_check_actions_payload(self.context.get('request'), obj)

    class Meta:
        model = SpotCheck
        fields = [
            'id',
            'batch_id',
            'student',
            'student_name',
            'student_employee_id',
            'student_avatar_key',
            'checker',
            'checker_name',
            'checker_avatar_key',
            'status',
            'submitted_at',
            'revision',
            'topic_count',
            'topic_summary',
            'average_score',
            'items',
            'actions',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['batch_id', 'checker', 'revision', 'created_at', 'updated_at']


class SpotCheckStudentSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True, allow_null=True)
    spot_check_count = serializers.IntegerField(read_only=True, default=0)
    average_score = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'employee_id',
            'avatar_key',
            'department_name',
            'spot_check_count',
            'average_score',
        ]


class SpotCheckDetailSerializer(serializers.ModelSerializer):
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
    actions = serializers.SerializerMethodField()

    def get_actions(self, obj):
        return get_spot_check_actions_payload(self.context.get('request'), obj)

    class Meta:
        model = SpotCheck
        fields = [
            'id',
            'batch_id',
            'student',
            'student_name',
            'student_employee_id',
            'student_avatar_key',
            'student_department',
            'checker',
            'checker_name',
            'checker_avatar_key',
            'status',
            'submitted_at',
            'revision',
            'topic_count',
            'topic_summary',
            'average_score',
            'items',
            'actions',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['batch_id', 'checker', 'revision', 'created_at', 'updated_at']


class SpotCheckCreateSerializer(serializers.Serializer):
    students = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), many=True)
    items = SpotCheckItemIssueSerializer(many=True, allow_empty=False)


class SpotCheckSubmitSerializer(serializers.Serializer):
    revision = serializers.IntegerField(min_value=1)
    items = SpotCheckItemSubmitSerializer(many=True, allow_empty=False)


class SpotCheckScoreSerializer(serializers.Serializer):
    revision = serializers.IntegerField(min_value=1)
    items = SpotCheckItemScoreSerializer(many=True, allow_empty=False)
