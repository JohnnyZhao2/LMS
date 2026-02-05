"""
Submissions URLs.
Implements URL routing for:
- Practice submissions
- Exam submissions
"""
from django.urls import path

from ..views import (
    ExamResultView,
    PracticeResultView,
    SaveAnswerView,
    SaveAnswersView,
    StartQuizView,
    SubmitView,
)

urlpatterns = [
    # Unified endpoints (new)
    path('start/', StartQuizView.as_view(), name='start-quiz'),
    path('<int:pk>/submit/', SubmitView.as_view(), name='submit-quiz'),
    # Common endpoints
    path('<int:pk>/save-answer/', SaveAnswerView.as_view(), name='save-answer'),
    path('<int:pk>/save-answers/', SaveAnswersView.as_view(), name='save-answers'),
    path('<int:pk>/result/', PracticeResultView.as_view(), name='submission-result'),
    path('exam/<int:pk>/result/', ExamResultView.as_view(), name='exam-result'),
]
