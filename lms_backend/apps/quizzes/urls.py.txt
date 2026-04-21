"""
Quiz URLs for LMS.
"""
from django.urls import path

from .views import (
    QuizDetailView,
    QuizListCreateView,
)

urlpatterns = [
    # Quiz CRUD
    path('', QuizListCreateView.as_view(), name='quiz-list-create'),
    path('<int:pk>/', QuizDetailView.as_view(), name='quiz-detail'),
]
