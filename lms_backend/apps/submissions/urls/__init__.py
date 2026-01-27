"""
Submissions URL configuration.
Exports URL patterns from submissions module.
"""
from django.urls import include, path

urlpatterns = [
    path('', include('apps.submissions.urls.submissions')),
]
