"""Tasks URLs for task management."""

from django.urls import path

from .views.analytics import StudentExecutionsView, TaskAnalyticsView
from .views.management import (
    AssignableUserListView,
    TaskCreateView,
    TaskDetailView,
    TaskListView,
    TaskResourceOptionListView,
)
from .views.student import (
    CompleteKnowledgeLearningView,
    StudentAssignmentListView,
    StudentTaskDetailView,
)

urlpatterns = [
    path('', TaskListView.as_view(), name='task-list'),
    path('<int:pk>/', TaskDetailView.as_view(), name='task-detail'),
    path('create/', TaskCreateView.as_view(), name='task-create'),
    path('assignable-users/', AssignableUserListView.as_view(), name='assignable-user-list'),
    path('resource-options/', TaskResourceOptionListView.as_view(), name='task-resource-options'),
    path('my-assignments/', StudentAssignmentListView.as_view(), name='student-assignment-list'),
    path('<int:task_id>/detail/', StudentTaskDetailView.as_view(), name='student-task-detail'),
    path(
        '<int:task_id>/complete-knowledge/',
        CompleteKnowledgeLearningView.as_view(),
        name='complete-knowledge-learning',
    ),
    path('<int:pk>/analytics/', TaskAnalyticsView.as_view(), name='task-analytics'),
    path(
        '<int:pk>/student-executions/',
        StudentExecutionsView.as_view(),
        name='student-executions',
    ),
]
