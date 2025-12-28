"""
Tasks URLs for task management.
"""
from django.urls import path

from .views import (
    AssignableUserListView,
    TaskCreateView,
    TaskListView,
    TaskDetailView,
    TaskCloseView,
    StudentAssignmentListView,
    StudentTaskDetailView,
    CompleteKnowledgeLearningView,
)

urlpatterns = [
    # Task list and detail
    path('', TaskListView.as_view(), name='task-list'),
    path('<int:pk>/', TaskDetailView.as_view(), name='task-detail'),
    
    # Task creation (unified)
    path('create/', TaskCreateView.as_view(), name='task-create'),
    
    # Task management
    path('<int:pk>/close/', TaskCloseView.as_view(), name='task-close'),
    
    # Assignable students
    path('assignable-users/', AssignableUserListView.as_view(), name='assignable-user-list'),
    
    # Student task execution
    path('my-assignments/', StudentAssignmentListView.as_view(), name='student-assignment-list'),
    path('<int:task_id>/detail/', StudentTaskDetailView.as_view(), name='student-task-detail'),
    path('<int:task_id>/complete-knowledge/', CompleteKnowledgeLearningView.as_view(), name='complete-knowledge-learning'),
]
