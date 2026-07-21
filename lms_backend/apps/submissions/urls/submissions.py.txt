"""
Submissions URLs.
Implements URL routing for:
- submission lifecycle
"""
from django.urls import path

from ..views import (
    ResultView,
    SaveAnswerView,
    StartQuizView,
    SubmitView,
)

urlpatterns = [
    path('start/', StartQuizView.as_view(), name='start-quiz'),
    path('<int:pk>/submit/', SubmitView.as_view(), name='submit-quiz'),
    path('<int:pk>/save-answer/', SaveAnswerView.as_view(), name='save-answer'),
    path('<int:pk>/result/', ResultView.as_view(), name='submission-result'),
]
