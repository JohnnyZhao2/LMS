from datetime import timedelta
from types import SimpleNamespace

import pytest
from django.utils import timezone

from apps.submissions.serializers import SubmissionDetailSerializer
from apps.submissions.services import SubmissionService
from apps.tasks.tests.factories import (
    QuizFactory,
    QuizRevisionFactory,
    SubmissionFactory,
    TaskAssignmentFactory,
    TaskFactory,
    TaskQuizFactory,
    UserFactory,
)
from core.exceptions import BusinessError, ErrorCodes


def build_request(user):
    return SimpleNamespace(user=user, META={})


@pytest.mark.django_db
def test_exam_reference_timer_uses_elapsed_time(monkeypatch):
    student = UserFactory()
    task = TaskFactory(deadline=timezone.now() + timedelta(days=3))
    assignment = TaskAssignmentFactory(task=task, assignee=student)
    source_quiz = QuizFactory(quiz_type='EXAM', duration=30, pass_score=60, created_by=student, updated_by=student)
    revision = QuizRevisionFactory(source_quiz=source_quiz)
    task_quiz = TaskQuizFactory(task=task, quiz=revision, source_quiz=source_quiz)

    fixed_now = timezone.now()
    submission = SubmissionFactory(
        task_assignment=assignment,
        task_quiz=task_quiz,
        quiz=revision,
        user=student,
        status='IN_PROGRESS',
        remaining_seconds=30 * 60,
    )
    submission.started_at = fixed_now - timedelta(minutes=20)
    submission.save(update_fields=['started_at'])

    monkeypatch.setattr('apps.submissions.models.timezone.now', lambda: fixed_now)

    data = SubmissionDetailSerializer(submission).data

    assert data['remaining_seconds'] == 10 * 60


@pytest.mark.django_db
def test_exam_still_allows_only_one_submitted_attempt():
    student = UserFactory()
    task = TaskFactory(deadline=timezone.now() + timedelta(days=3))
    assignment = TaskAssignmentFactory(task=task, assignee=student)
    source_quiz = QuizFactory(quiz_type='EXAM', duration=30, pass_score=60, created_by=student, updated_by=student)
    revision = QuizRevisionFactory(source_quiz=source_quiz)
    task_quiz = TaskQuizFactory(task=task, quiz=revision, source_quiz=source_quiz)
    service = SubmissionService(build_request(student))

    submission = service.start_quiz(assignment, task_quiz, student, is_exam=True)
    service.submit(submission)

    with pytest.raises(BusinessError) as exc:
        service.check_exam_constraints(assignment, task_quiz.id)

    assert exc.value.code == ErrorCodes.INVALID_OPERATION
    assert '无法重新作答' in exc.value.message
