from types import SimpleNamespace

import pytest

from apps.submissions.models import Submission
from apps.submissions.services import SubmissionService

from .factories import QuizFactory, TaskAssignmentFactory, UserFactory


@pytest.mark.django_db
def test_update_task_assignment_recalculates_highest_score():
    user = UserFactory()
    assignment = TaskAssignmentFactory(assignee=user)
    quiz = QuizFactory(created_by=user)
    Submission.objects.create(
        task_assignment=assignment,
        quiz=quiz,
        user=user,
        status='GRADED',
        attempt_number=1,
        obtained_score=90,
    )
    latest_submission = Submission.objects.create(
        task_assignment=assignment,
        quiz=quiz,
        user=user,
        status='GRADED',
        attempt_number=2,
        obtained_score=70,
    )

    service = SubmissionService(SimpleNamespace(user=user))
    service._update_task_assignment(latest_submission)

    assignment.refresh_from_db()
    assert float(assignment.score) == 90.0
