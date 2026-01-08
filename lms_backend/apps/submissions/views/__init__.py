"""
Submissions views module.

Split into:
- common.py: Common views (unified quiz interface, save answer)
- practice.py: Practice submission views
- exam.py: Exam submission views
"""
from .common import (
    StartQuizView,
    SubmitView,
    SaveAnswerView,
)
from .practice import (
    StartPracticeView,
    SubmitPracticeView,
    PracticeResultView,
)
from .exam import (
    StartExamView,
    SubmitExamView,
    ExamResultView,
)

__all__ = [
    # Common views
    'StartQuizView',
    'SubmitView',
    'SaveAnswerView',
    # Practice views
    'StartPracticeView',
    'SubmitPracticeView',
    'PracticeResultView',
    # Exam views
    'StartExamView',
    'SubmitExamView',
    'ExamResultView',
]
