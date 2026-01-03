"""
Grading URLs.

Implements URL routing for grading endpoints:
- Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
"""
from django.urls import path

from .views import (
    GradingListView,
    GradingDetailView,
    GradeAnswerView,
    BatchGradeView,
)

urlpatterns = [
    # Grading endpoints
    path('pending/', GradingListView.as_view(), name='grading-list'),
    path('<int:pk>/', GradingDetailView.as_view(), name='grading-detail'),
    path('<int:pk>/grade/', GradeAnswerView.as_view(), name='grade-answer'),
    path('<int:pk>/batch-grade/', BatchGradeView.as_view(), name='batch-grade'),
]
