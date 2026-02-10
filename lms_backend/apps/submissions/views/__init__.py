"""
Submissions views module.
Split into:
- common.py: Common views (unified quiz interface, save answer)
- practice.py: Practice submission views
- exam.py: Exam submission views
"""
from .common import (
    SaveAnswerView,
    StartQuizView,
    SubmitView,
)
from .exam import (
    ExamResultView,
)
from .practice import (
    PracticeResultView,
)

__all__ = [
    # Common views
    'StartQuizView',
    'SubmitView',
    'SaveAnswerView',
    # Practice views
    'PracticeResultView',
    # Exam views
    'ExamResultView',
]
