"""SpotChecks URLs."""
from django.urls import path

from .views import (
    SpotCheckDetailView,
    SpotCheckListCreateView,
    SpotCheckMineView,
    SpotCheckScoreView,
    SpotCheckStudentListView,
    SpotCheckSubmitView,
)

urlpatterns = [
    path('students/', SpotCheckStudentListView.as_view(), name='spot-check-student-list'),
    path('mine/', SpotCheckMineView.as_view(), name='spot-check-mine'),
    path('', SpotCheckListCreateView.as_view(), name='spot-check-list-create'),
    path('<int:pk>/', SpotCheckDetailView.as_view(), name='spot-check-detail'),
    path('<int:pk>/submit/', SpotCheckSubmitView.as_view(), name='spot-check-submit'),
    path('<int:pk>/score/', SpotCheckScoreView.as_view(), name='spot-check-score'),
]
