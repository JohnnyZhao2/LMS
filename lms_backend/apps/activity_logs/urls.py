from django.urls import path
from .views import UserLogListView, ContentLogListView, OperationLogListView

urlpatterns = [
    path('user/', UserLogListView.as_view(), name='user-log-list'),
    path('content/', ContentLogListView.as_view(), name='content-log-list'),
    path('operation/', OperationLogListView.as_view(), name='operation-log-list'),
]
