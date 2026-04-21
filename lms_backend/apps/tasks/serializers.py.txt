"""Task serializer facade."""

from .analytics_serializers import (
    AccuracySerializer,
    CompletionSerializer,
    DistributionItemSerializer,
    NodeProgressSerializer,
    StudentExecutionSerializer,
    TaskAnalyticsSerializer,
)
from .management_serializers import (
    TaskAssignmentSerializer,
    TaskCreateSerializer,
    TaskDetailSerializer,
    TaskKnowledgeSerializer,
    TaskListSerializer,
    TaskQuizSerializer,
    TaskResourceOptionSerializer,
    TaskUpdateSerializer,
)
from .student_serializers import (
    CompleteKnowledgeLearningSerializer,
    KnowledgeLearningProgressSerializer,
    StudentAssignmentListSerializer,
    StudentTaskDetailSerializer,
)

__all__ = [
    'AccuracySerializer',
    'CompleteKnowledgeLearningSerializer',
    'CompletionSerializer',
    'DistributionItemSerializer',
    'KnowledgeLearningProgressSerializer',
    'NodeProgressSerializer',
    'StudentAssignmentListSerializer',
    'StudentExecutionSerializer',
    'StudentTaskDetailSerializer',
    'TaskAnalyticsSerializer',
    'TaskAssignmentSerializer',
    'TaskCreateSerializer',
    'TaskDetailSerializer',
    'TaskKnowledgeSerializer',
    'TaskListSerializer',
    'TaskQuizSerializer',
    'TaskResourceOptionSerializer',
    'TaskUpdateSerializer',
]
