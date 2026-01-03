"""
Submissions views module.

Split into:
- common.py: Common views (unified quiz interface, save answer, my submissions)
- practice.py: Practice submission views
- exam.py: Exam submission views
- grading.py: Grading management views
"""
from .common import (
    StartQuizView,
    SubmitView,
    SaveAnswerView,
    MySubmissionsView,
)
from .practice import (
    StartPracticeView,
    SubmitPracticeView,
    PracticeResultView,
    PracticeHistoryView,
)
from .exam import (
    StartExamView,
    SubmitExamView,
    ExamResultView,
)
from .grading import (
    GradingListView,
    GradingDetailView,
    GradeAnswerView,
    BatchGradeView,
)

__all__ = [
    # Common views
    'StartQuizView',
    'SubmitView',
    'SaveAnswerView',
    'MySubmissionsView',
    # Practice views
    'StartPracticeView',
    'SubmitPracticeView',
    'PracticeResultView',
    'PracticeHistoryView',
    # Exam views
    'StartExamView',
    'SubmitExamView',
    'ExamResultView',
    # Grading views
    'GradingListView',
    'GradingDetailView',
    'GradeAnswerView',
    'BatchGradeView',
]
