"""
Submissions URL configuration.

Exports URL patterns from submissions and grading modules.
"""
from django.urls import path, include

urlpatterns = [
    path('', include('apps.submissions.urls.submissions')),
]
