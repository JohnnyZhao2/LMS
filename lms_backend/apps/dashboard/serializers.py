"""
Serializers for dashboard module.
Implements serializers for:
- Student dashboard
- Mentor/Department manager dashboard
"""
from rest_framework import serializers
from apps.tasks.models import TaskAssignment
from apps.knowledge.models import Knowledge
class StudentPendingTaskSerializer(serializers.ModelSerializer):
    """
    Serializer for student's pending tasks on dashboard.
    """
    task_id = serializers.IntegerField(source='task.id', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    deadline = serializers.DateTimeField(source='task.deadline', read_only=True)
    created_by_name = serializers.CharField(source='task.created_by.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    progress = serializers.SerializerMethodField()
    class Meta:
        model = TaskAssignment
        fields = [
            'id', 'task_id', 'task_title',
            'deadline', 'created_by_name', 'status', 'status_display',
            'progress', 'created_at'
        ]
    def get_progress(self, obj):
        """
        Calculate progress based on total items (knowledge + quizzes).
        """
        task = obj.task
        total_k = task.task_knowledge.count()
        total_q = task.task_quizzes.count()
        total = total_k + total_q
        if total == 0:
            return {'completed': 0, 'total': 0, 'percentage': 0}
        completed_k = obj.knowledge_progress.filter(is_completed=True).count()
        from apps.submissions.models import Submission
        completed_q_ids = set(
            Submission.objects.filter(
                task_assignment=obj
                # Consider passed quizzes? Or just submitted? Assuming submitted/graded counts as done
            ).values_list('quiz_id', flat=True).distinct()
        )
        completed_q = len(completed_q_ids)
        completed = completed_k + completed_q
        return {
            'completed': completed,
            'total': total,
            'percentage': round(completed / total * 100, 1)
        }
class LatestKnowledgeSerializer(serializers.ModelSerializer):
    """
    Serializer for latest knowledge documents on dashboard.
    """
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    updated_by_name = serializers.SerializerMethodField()
    knowledge_type_display = serializers.CharField(source='get_knowledge_type_display', read_only=True)
    content_preview = serializers.SerializerMethodField()
    class Meta:
        model = Knowledge
        fields = [
            'id', 'title', 'knowledge_type', 'knowledge_type_display',
            'content_preview', 'operation_tags',
            'created_by_name', 'updated_by_name',
            'created_at', 'updated_at'
        ]
    def get_content_preview(self, obj):
        """Get content preview from Knowledge model property."""
        return obj.content_preview
    def get_updated_by_name(self, obj):
        """Get name of last updater."""
        if obj.updated_by:
            return obj.updated_by.username
        return obj.created_by.username if obj.created_by else None
class StudentDashboardSerializer(serializers.Serializer):
    """
    Serializer for student dashboard data.
    """
    pending_tasks = StudentPendingTaskSerializer(many=True, read_only=True)
    latest_knowledge = LatestKnowledgeSerializer(many=True, read_only=True)
    task_summary = serializers.DictField(read_only=True)
# ============ Mentor/Department Manager Dashboard Serializers ============
class MentorStudentStatSerializer(serializers.Serializer):
    """
    Serializer for individual student statistics in mentor dashboard.
    """
    id = serializers.IntegerField(read_only=True)
    employee_id = serializers.CharField(read_only=True)
    username = serializers.CharField(read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True, allow_null=True)
    # Task statistics
    total_tasks = serializers.IntegerField(read_only=True)
    completed_tasks = serializers.IntegerField(read_only=True)
    in_progress_tasks = serializers.IntegerField(read_only=True)
    overdue_tasks = serializers.IntegerField(read_only=True)
    completion_rate = serializers.FloatField(read_only=True)
    # Score statistics
    avg_score = serializers.FloatField(read_only=True, allow_null=True)
    exam_count = serializers.IntegerField(read_only=True)
    exam_passed_count = serializers.IntegerField(read_only=True)
    exam_pass_rate = serializers.FloatField(read_only=True, allow_null=True)
class MentorDashboardSummarySerializer(serializers.Serializer):
    """
    Serializer for mentor dashboard summary statistics.
    """
    # Student count
    total_students = serializers.IntegerField(read_only=True)
    # Task statistics
    total_tasks = serializers.IntegerField(read_only=True)
    completed_tasks = serializers.IntegerField(read_only=True)
    in_progress_tasks = serializers.IntegerField(read_only=True)
    overdue_tasks = serializers.IntegerField(read_only=True)
    overall_completion_rate = serializers.FloatField(read_only=True)
    # Score statistics
    overall_avg_score = serializers.FloatField(read_only=True, allow_null=True)
    # Task status breakdown
    learning_tasks = serializers.DictField(read_only=True)
class MentorDashboardSerializer(serializers.Serializer):
    """
    Serializer for complete mentor/department manager dashboard data.
    """
    summary = MentorDashboardSummarySerializer(read_only=True)
    students = MentorStudentStatSerializer(many=True, read_only=True)
    quick_links = serializers.DictField(read_only=True)
