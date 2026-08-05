from rest_framework import serializers

from .execution_status import AssignmentExecutionStatusSerializerMixin
from .models import KnowledgeLearningProgress, TaskAssignment
from .progress import build_assignment_progress


class KnowledgeLearningProgressSerializer(serializers.ModelSerializer):
    knowledge_id = serializers.IntegerField(
        source='task_knowledge.source_knowledge_id',
        read_only=True,
    )
    knowledge_title = serializers.CharField(
        source='task_knowledge.knowledge.title',
        read_only=True,
    )
    order = serializers.IntegerField(source='task_knowledge.order', read_only=True)

    class Meta:
        model = KnowledgeLearningProgress
        fields = [
            'id',
            'knowledge_id',
            'knowledge_title',
            'order',
            'is_completed',
            'started_at',
            'completed_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'is_completed',
            'started_at',
            'completed_at',
            'created_at',
            'updated_at',
        ]


class CompleteKnowledgeLearningResponseSerializer(KnowledgeLearningProgressSerializer):
    task_status = serializers.CharField()
    task_completed = serializers.BooleanField()

    class Meta(KnowledgeLearningProgressSerializer.Meta):
        fields = KnowledgeLearningProgressSerializer.Meta.fields + [
            'task_status',
            'task_completed',
        ]


class StudentAssignmentListSerializer(AssignmentExecutionStatusSerializerMixin, serializers.ModelSerializer):
    task_id = serializers.IntegerField(source='task.id', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    task_description = serializers.CharField(source='task.description', read_only=True)
    deadline = serializers.DateTimeField(source='task.deadline', read_only=True)
    created_by_name = serializers.CharField(source='task.created_by.username', read_only=True)
    status = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
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
        return bool(obj.task.task_quizzes.all())

    def get_has_knowledge(self, obj):
        return bool(obj.task.task_knowledge.all())

    def get_progress(self, obj):
        return build_assignment_progress(obj)


class StudentTaskDetailSerializer(AssignmentExecutionStatusSerializerMixin, serializers.ModelSerializer):
    task_id = serializers.IntegerField(source='task.id', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    task_description = serializers.CharField(source='task.description', read_only=True)
    deadline = serializers.DateTimeField(source='task.deadline', read_only=True)
    created_by_name = serializers.CharField(source='task.created_by.username', read_only=True)
    status = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
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
        return getattr(obj, 'progress_payload', None) or build_assignment_progress(obj)

    def get_knowledge_items(self, obj):
        return getattr(obj, 'knowledge_items_payload', [])

    def get_quiz_items(self, obj):
        return getattr(obj, 'quiz_items_payload', [])


class CompleteKnowledgeLearningSerializer(serializers.Serializer):
    task_knowledge_id = serializers.IntegerField(
        min_value=1,
        help_text='要标记为已学习的任务知识节点ID',
    )
