"""
Serializers for dashboard module.
Implements serializers for:
- Student dashboard
- Mentor/Department manager dashboard
"""
from rest_framework import serializers

from apps.knowledge.serializers import KnowledgeListSerializer
from apps.tasks.models import TaskAssignment

from .selectors import calculate_assignment_progress


class StudentTaskSerializer(serializers.ModelSerializer):
    """
    学员任务序列化器（包含进行中和已完成）
    """
    task_id = serializers.IntegerField(source='task.id', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    deadline = serializers.DateTimeField(source='task.deadline', read_only=True)
    created_by_name = serializers.CharField(source='task.created_by.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    progress = serializers.SerializerMethodField()
    score = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True, allow_null=True)

    class Meta:
        model = TaskAssignment
        fields = [
            'id', 'task_id', 'task_title',
            'deadline', 'created_by_name', 'status', 'status_display',
            'progress', 'score', 'completed_at', 'created_at'
        ]

    def get_progress(self, obj):
        """计算任务进度"""
        return calculate_assignment_progress(obj)


class StudentStatsSerializer(serializers.Serializer):
    """学员统计数据序列化器"""
    in_progress_count = serializers.IntegerField()
    urgent_count = serializers.IntegerField()
    completion_rate = serializers.FloatField()
    exam_avg_score = serializers.FloatField(allow_null=True)
    total_tasks = serializers.IntegerField()
    completed_count = serializers.IntegerField()
    overdue_count = serializers.IntegerField()


class PeerRankingSerializer(serializers.Serializer):
    """同伴排名序列化器"""
    id = serializers.IntegerField()
    name = serializers.CharField()
    progress = serializers.FloatField()
    rank = serializers.IntegerField()
    is_me = serializers.BooleanField()


class StudentDashboardSerializer(serializers.Serializer):
    """
    Serializer for student dashboard data.
    """
    stats = StudentStatsSerializer(read_only=True)
    tasks = StudentTaskSerializer(many=True, read_only=True)
    latest_knowledge = KnowledgeListSerializer(many=True, read_only=True)
