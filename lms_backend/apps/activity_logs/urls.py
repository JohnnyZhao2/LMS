from django.urls import path

from .views import (
    ActivityLogBulkDeleteView,
    ActivityLogItemView,
    ActivityLogListView,
    ActivityLogPolicyView,
    ActivityLogUserListView,
)

urlpatterns = [
    path('', ActivityLogListView.as_view(), name='activity-log-list'),
    path('users/', ActivityLogUserListView.as_view(), name='activity-log-user-list'),
    path('policies/', ActivityLogPolicyView.as_view(), name='activity-log-policy'),
    path('items/bulk-delete/', ActivityLogBulkDeleteView.as_view(), name='activity-log-bulk-delete'),
    path('items/<str:log_item_id>/', ActivityLogItemView.as_view(), name='activity-log-item'),
]
