"""
Tasks URLs for task management.

Requirements:
- 7.1, 7.2, 7.3, 7.4, 7.5: Learning task management
- 7.6, 20.1, 20.2, 20.3: Admin task management
- 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7: Learning task execution
- 9.1, 9.2, 9.3, 9.4, 9.5: Practice task management
- 11.1, 11.2, 11.3, 11.4, 11.5, 11.6: Exam task management
"""
from django.urls import path

from .views import (
    AssignableUserListView,
    LearningTaskCreateView,
    PracticeTaskCreateView,
    ExamTaskCreateView,
    TaskListView,
    TaskDetailView,
    TaskCloseView,
    StudentAssignmentListView,
    StudentLearningTaskDetailView,
    CompleteKnowledgeLearningView,
)

urlpatterns = [
    # Task list and detail
    path('', TaskListView.as_view(), name='task-list'),
    path('<int:pk>/', TaskDetailView.as_view(), name='task-detail'),
    
    # Task management
    path('<int:pk>/close/', TaskCloseView.as_view(), name='task-close'),
    
    # Learning task creation
    path('learning/', LearningTaskCreateView.as_view(), name='learning-task-create'),
    
    # Practice task creation
    path('practice/', PracticeTaskCreateView.as_view(), name='practice-task-create'),
    
    # Exam task creation
    path('exam/', ExamTaskCreateView.as_view(), name='exam-task-create'),
    
    # Assignable students
    path('assignable-users/', AssignableUserListView.as_view(), name='assignable-user-list'),
    
    # Student task execution (Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7)
    path('my-assignments/', StudentAssignmentListView.as_view(), name='student-assignment-list'),
    path('<int:task_id>/learning-detail/', StudentLearningTaskDetailView.as_view(), name='student-learning-task-detail'),
    path('<int:task_id>/complete-knowledge/', CompleteKnowledgeLearningView.as_view(), name='complete-knowledge-learning'),
]
