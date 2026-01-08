"""
Submissions URL configuration.
Exports URL patterns from submissions module.
"""
from django.urls import path, include
urlpatterns = [
    path('', include('apps.submissions.urls.submissions')),
]
