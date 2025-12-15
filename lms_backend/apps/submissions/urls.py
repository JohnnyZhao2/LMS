"""
Submissions URLs.

Implements URL routing for:
- Practice submissions (Requirements: 10.2, 10.3, 10.4, 10.5, 10.6, 10.7)
- Exam submissions (Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8)
"""
from django.urls import path

from .views import (
    StartPracticeView,
    SaveAnswerView,
    SubmitPracticeView,
    PracticeResultView,
    PracticeHistoryView,
    MySubmissionsView,
)
from .views_exam import (
    StartExamView,
    SubmitExamView,
    ExamResultView,
)

urlpatterns = [
    # Practice endpoints
    path('practice/start/', StartPracticeView.as_view(), name='start-practice'),
    path('practice/history/<int:task_id>/', PracticeHistoryView.as_view(), name='practice-history'),
    
    # Common endpoints
    path('<int:pk>/save-answer/', SaveAnswerView.as_view(), name='save-answer'),
    path('<int:pk>/submit-practice/', SubmitPracticeView.as_view(), name='submit-practice'),
    path('<int:pk>/result/', PracticeResultView.as_view(), name='submission-result'),
    
    # Exam endpoints
    path('exam/start/', StartExamView.as_view(), name='start-exam'),
    path('<int:pk>/submit-exam/', SubmitExamView.as_view(), name='submit-exam'),
    path('exam/<int:pk>/result/', ExamResultView.as_view(), name='exam-result'),
    
    # My submissions
    path('my/', MySubmissionsView.as_view(), name='my-submissions'),
]
