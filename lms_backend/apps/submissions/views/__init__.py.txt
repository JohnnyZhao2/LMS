"""
Submissions views module.
Split into:
- common.py: Common views
"""
from .common import (
    ResultView,
    SaveAnswerView,
    StartQuizView,
    SubmitView,
)

__all__ = [
    'StartQuizView',
    'SubmitView',
    'ResultView',
    'SaveAnswerView',
]
