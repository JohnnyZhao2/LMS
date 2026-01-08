"""
URL configuration for questions app.

Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7
"""
from django.urls import path

from .views import (
    QuestionListCreateView,
    QuestionDetailView,
)

urlpatterns = [
    # Question CRUD
    path('', QuestionListCreateView.as_view(), name='question-list-create'),
    path('<int:pk>/', QuestionDetailView.as_view(), name='question-detail'),
    
]
