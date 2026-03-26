from django.urls import path

from .views import (
    ActivityLogListView,
    ActivityLogPolicyView,
)

urlpatterns = [
    path('', ActivityLogListView.as_view(), name='activity-log-list'),
    path('policies/', ActivityLogPolicyView.as_view(), name='activity-log-policy'),
]
