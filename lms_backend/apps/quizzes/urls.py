"""
Quiz URLs for LMS.

Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
"""
from django.urls import path

from .views import (
    QuizListCreateView,
    QuizDetailView,
    QuizAddQuestionsView,
    QuizRemoveQuestionsView,
    QuizReorderQuestionsView,
)

urlpatterns = [
    # Quiz CRUD
    path('', QuizListCreateView.as_view(), name='quiz-list-create'),
    path('<int:pk>/', QuizDetailView.as_view(), name='quiz-detail'),
    
    # Quiz question management
    path('<int:pk>/add-questions/', QuizAddQuestionsView.as_view(), name='quiz-add-questions'),
    path('<int:pk>/remove-questions/', QuizRemoveQuestionsView.as_view(), name='quiz-remove-questions'),
    path('<int:pk>/reorder-questions/', QuizReorderQuestionsView.as_view(), name='quiz-reorder-questions'),
]
