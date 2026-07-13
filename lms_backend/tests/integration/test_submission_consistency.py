import pytest
from django.core.exceptions import ValidationError

from apps.submissions.models import Submission
from apps.tasks.tests.factories import (
    QuizRevisionFactory,
    SubmissionFactory,
    TaskAssignmentFactory,
    TaskFactory,
    TaskQuizFactory,
    UserFactory,
)


@pytest.mark.django_db
class TestSubmissionRelationConsistency:
    def test_create_requires_task_quiz(self):
        assignment = TaskAssignmentFactory()
        quiz = QuizRevisionFactory()
        with pytest.raises(ValidationError) as exc_info:
            Submission.objects.create(
                task_assignment=assignment,
                quiz=quiz,
                user=assignment.assignee,
            )
        assert 'task_quiz' in exc_info.value.message_dict

    def test_user_must_match_assignee(self):
        assignment = TaskAssignmentFactory()
        other_user = UserFactory()
        task_quiz = TaskQuizFactory(task=assignment.task)
        with pytest.raises(ValidationError) as exc_info:
            Submission.objects.create(
                task_assignment=assignment,
                task_quiz=task_quiz,
                quiz=task_quiz.quiz,
                user=other_user,
            )
        assert 'user' in exc_info.value.message_dict

    def test_task_quiz_must_belong_to_assignment_task(self):
        assignment = TaskAssignmentFactory()
        other_task = TaskFactory()
        task_quiz = TaskQuizFactory(task=other_task)
        with pytest.raises(ValidationError) as exc_info:
            Submission.objects.create(
                task_assignment=assignment,
                task_quiz=task_quiz,
                quiz=task_quiz.quiz,
                user=assignment.assignee,
            )
        assert 'task_quiz' in exc_info.value.message_dict

    def test_quiz_must_match_task_quiz_revision(self):
        assignment = TaskAssignmentFactory()
        task_quiz = TaskQuizFactory(task=assignment.task)
        other_quiz = QuizRevisionFactory()
        with pytest.raises(ValidationError) as exc_info:
            Submission.objects.create(
                task_assignment=assignment,
                task_quiz=task_quiz,
                quiz=other_quiz,
                user=assignment.assignee,
            )
        assert 'quiz' in exc_info.value.message_dict

    def test_consistent_create_succeeds(self):
        submission = SubmissionFactory()
        assert submission.pk is not None
        assert submission.user_id == submission.task_assignment.assignee_id
        assert submission.task_quiz.task_id == submission.task_assignment.task_id
        assert submission.quiz_id == submission.task_quiz.quiz_id
