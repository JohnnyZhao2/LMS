from rest_framework import serializers
from .models import UserLog, ContentLog, OperationLog


class SimpleUserSerializer(serializers.Serializer):
    """简单的用户信息序列化器"""
    id = serializers.IntegerField(read_only=True)
    employee_id = serializers.CharField(read_only=True)
    username = serializers.CharField(read_only=True)


class UserLogSerializer(serializers.ModelSerializer):
    user = SimpleUserSerializer(read_only=True)
    operator = SimpleUserSerializer(read_only=True)

    class Meta:
        model = UserLog
        fields = [
            'id',
            'user',
            'operator',
            'action',
            'description',
            'status',
            'created_at',
        ]


class ContentLogSerializer(serializers.ModelSerializer):
    operator = SimpleUserSerializer(read_only=True)

    class Meta:
        model = ContentLog
        fields = [
            'id',
            'content_type',
            'content_id',
            'content_title',
            'operator',
            'action',
            'description',
            'status',
            'created_at',
        ]


class OperationLogSerializer(serializers.ModelSerializer):
    operator = serializers.SerializerMethodField()

    class Meta:
        model = OperationLog
        fields = [
            'id',
            'operator',
            'operation_type',
            'action',
            'description',
            'status',
            'duration',
            'created_at',
        ]

    def get_operator(self, obj):
        return {
            'employee_id': obj.operator.employee_id,
            'username': obj.operator.username,
            'role': ', '.join([role.name for role in obj.operator.roles.all()]),
        }
