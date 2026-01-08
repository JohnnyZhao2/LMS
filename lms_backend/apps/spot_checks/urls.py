"""
SpotChecks URLs.
"""
from django.urls import path
from .views import SpotCheckListCreateView, SpotCheckDetailView
urlpatterns = [
    path('', SpotCheckListCreateView.as_view(), name='spot-check-list-create'),
    path('<int:pk>/', SpotCheckDetailView.as_view(), name='spot-check-detail'),
]
