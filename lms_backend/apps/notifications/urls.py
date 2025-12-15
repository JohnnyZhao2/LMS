"""
Notifications URLs for LMS.

Requirements: 7.5, 9.5, 11.6
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.notifications.views import NotificationViewSet


router = DefaultRouter()
router.register(r'', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
]
