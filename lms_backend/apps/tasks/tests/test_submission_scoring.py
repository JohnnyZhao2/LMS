from decimal import Decimal
from types import SimpleNamespace

import pytest

from apps.submissions.models import Submission
from apps.submissions.services import SubmissionService
from apps.tasks.models import TaskQuiz
from apps.tasks.selectors import task_score_distribution, task_student_executions

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


@pytest.mark.django_db
def test_task_student_executions_uses_assignment_score_for_practice_quiz():
    user = UserFactory()
    assignment = TaskAssignmentFactory(assignee=user)
    quiz = QuizFactory(created_by=user, quiz_type='PRACTICE')
    TaskQuiz.objects.create(task=assignment.task, quiz=quiz, order=1)
    Submission.objects.create(
        task_assignment=assignment,
        quiz=quiz,
        user=user,
        status='GRADED',
        attempt_number=1,
        obtained_score=88,
    )
    assignment.score = Decimal('88')
    assignment.save(update_fields=['score'])

    executions = task_student_executions(assignment.task_id)

    assert executions[0]['score'] == 88.0


@pytest.mark.django_db
def test_task_score_distribution_uses_percentage_for_practice_quiz():
    user = UserFactory()
    assignment = TaskAssignmentFactory(assignee=user)
    quiz = QuizFactory(created_by=user, quiz_type='PRACTICE')
    TaskQuiz.objects.create(task=assignment.task, quiz=quiz, order=1)
    Submission.objects.create(
        task_assignment=assignment,
        quiz=quiz,
        user=user,
        status='GRADED',
        attempt_number=1,
        obtained_score=3,
        total_score=8,
    )

    distribution = task_score_distribution(assignment.task_id)
    distribution_map = {item['range']: item['count'] for item in distribution}

    assert distribution_map['0-60'] == 1
