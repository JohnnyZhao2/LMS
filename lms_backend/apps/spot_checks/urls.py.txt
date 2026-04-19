"""
SpotChecks URLs.
"""
from django.urls import path

from .views import SpotCheckDetailView, SpotCheckListCreateView, SpotCheckStudentListView

urlpatterns = [
    path('students/', SpotCheckStudentListView.as_view(), name='spot-check-student-list'),
    path('', SpotCheckListCreateView.as_view(), name='spot-check-list-create'),
    path('<int:pk>/', SpotCheckDetailView.as_view(), name='spot-check-detail'),
]
