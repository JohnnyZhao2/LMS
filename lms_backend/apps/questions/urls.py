"""
URL configuration for questions app.
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
