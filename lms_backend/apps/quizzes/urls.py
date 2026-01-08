"""
Quiz URLs for LMS.
"""
from django.urls import path
from .views import (
    QuizListCreateView,
    QuizDetailView,
    QuizAddQuestionsView,
    QuizRemoveQuestionsView,
)
urlpatterns = [
    # Quiz CRUD
    path('', QuizListCreateView.as_view(), name='quiz-list-create'),
    path('<int:pk>/', QuizDetailView.as_view(), name='quiz-detail'),
    # Quiz question management
    path('<int:pk>/add-questions/', QuizAddQuestionsView.as_view(), name='quiz-add-questions'),
    path('<int:pk>/remove-questions/', QuizRemoveQuestionsView.as_view(), name='quiz-remove-questions'),
]
