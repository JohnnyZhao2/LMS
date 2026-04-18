from rest_framework import serializers

from .assignment_workflow import get_assignment_progress_data
from .models import KnowledgeLearningProgress, TaskAssignment, TaskKnowledge
from .student_task_service import StudentTaskService


class KnowledgeLearningProgressSerializer(serializers.ModelSerializer):
    knowledge_id = serializers.IntegerField(source='task_knowledge.source_knowledge_id', read_only=True)
    knowledge_title = serializers.CharField(source='task_knowledge.knowledge.title', read_only=True)
    order = serializers.IntegerField(source='task_knowledge.order', read_only=True)

    class Meta:
        model = KnowledgeLearningProgress
        fields = [
            'id',
            'knowledge_id',
            'knowledge_title',
            'order',
            'is_completed',
            'completed_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['is_completed', 'completed_at', 'created_at', 'updated_at']


class StudentAssignmentListSerializer(serializers.ModelSerializer):
    task_id = serializers.IntegerField(source='task.id', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    task_description = serializers.CharField(source='task.description', read_only=True)
    deadline = serializers.DateTimeField(source='task.deadline', read_only=True)
    created_by_name = serializers.CharField(source='task.created_by.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    has_quiz = serializers.SerializerMethodField()
    has_knowledge = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()

    class Meta:
        model = TaskAssignment
        fields = [
            'id',
            'task_id',
            'task_title',
            'task_description',
            'deadline',
            'created_by_name',
            'status',
            'status_display',
            'has_quiz',
            'has_knowledge',
            'progress',
            'score',
            'completed_at',
            'created_at',
            'updated_at',
        ]

    def get_has_quiz(self, obj):
        return obj.task.has_quiz

    def get_has_knowledge(self, obj):
        return obj.task.has_knowledge

    def get_progress(self, obj):
        return get_assignment_progress_data(obj)


class StudentTaskDetailSerializer(serializers.ModelSerializer):
    task_id = serializers.IntegerField(source='task.id', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    task_description = serializers.CharField(source='task.description', read_only=True)
    deadline = serializers.DateTimeField(source='task.deadline', read_only=True)
    created_by_name = serializers.CharField(source='task.created_by.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    progress = serializers.SerializerMethodField()
    knowledge_items = serializers.SerializerMethodField()
    quiz_items = serializers.SerializerMethodField()

    class Meta:
        model = TaskAssignment
        fields = [
            'id',
            'task_id',
            'task_title',
            'task_description',
            'deadline',
            'created_by_name',
            'status',
            'status_display',
            'progress',
            'completed_at',
            'score',
            'knowledge_items',
            'quiz_items',
            'created_at',
            'updated_at',
        ]

    def get_progress(self, obj):
        return get_assignment_progress_data(obj)

    def get_knowledge_items(self, obj):
        return StudentTaskService.get_student_knowledge_items(obj)

    def get_quiz_items(self, obj):
        return StudentTaskService.get_student_quiz_items(obj)


class CompleteKnowledgeLearningSerializer(serializers.Serializer):
    task_knowledge_id = serializers.IntegerField(min_value=1, help_text='要标记为已学习的任务知识节点ID')

    def validate_task_knowledge_id(self, value):
        if not TaskKnowledge.objects.filter(id=value).exists():
            raise serializers.ValidationError('任务知识不存在')
        return value
