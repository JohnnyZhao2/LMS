from types import SimpleNamespace

import pytest

from apps.submissions.models import Answer, AnswerSelection, Submission
from apps.tasks.models import (
    KnowledgeLearningProgress,
    Task,
    TaskAssignment,
    TaskKnowledge,
    TaskQuiz,
)
from apps.tasks.task_service import TaskService
from apps.tasks.tests.factories import (
    KnowledgeLearningProgressFactory,
    QuizRevisionQuestionFactory,
    QuizRevisionQuestionOptionFactory,
    SubmissionFactory,
    TaskAssignmentFactory,
    TaskFactory,
    TaskKnowledgeFactory,
    TaskQuizFactory,
    UserFactory,
)
from apps.users.services import UserManagementService


def build_request(user):
    return SimpleNamespace(user=user, META={})


@pytest.mark.django_db
def test_task_hard_delete_removes_execution_records():
    operator = UserFactory()
    task = TaskFactory(created_by=operator, updated_by=operator)
    assignment = TaskAssignmentFactory(task=task, assignee=operator)
    task_knowledge = TaskKnowledgeFactory(task=task)
    KnowledgeLearningProgressFactory(
        assignment=assignment,
        task_knowledge=task_knowledge,
        is_completed=True,
    )
    task_quiz = TaskQuizFactory(task=task)
    revision_question = QuizRevisionQuestionFactory(quiz=task_quiz.quiz)
    revision_option = QuizRevisionQuestionOptionFactory(question=revision_question, is_correct=True)
    submission = SubmissionFactory(
        task_assignment=assignment,
        task_quiz=task_quiz,
        quiz=task_quiz.quiz,
        user=operator,
    )
    answer = Answer.objects.create(
        submission=submission,
        question=revision_question,
        is_correct=True,
        obtained_score=revision_question.score,
    )
    selection = AnswerSelection.objects.create(
        answer=answer,
        question_option=revision_option,
    )

    TaskService(build_request(operator)).delete_task(task)

    assert not Task.objects.filter(id=task.id).exists()
    assert not TaskAssignment.objects.filter(id=assignment.id).exists()
    assert not TaskKnowledge.objects.filter(id=task_knowledge.id).exists()
    assert not TaskQuiz.objects.filter(id=task_quiz.id).exists()
    assert not KnowledgeLearningProgress.objects.exists()
    assert not Submission.objects.filter(id=submission.id).exists()
    assert not Answer.objects.filter(id=answer.id).exists()
    assert not AnswerSelection.objects.filter(id=selection.id).exists()


@pytest.mark.django_db
def test_delete_user_removes_created_task_with_other_user_submissions():
    admin_user = UserFactory()
    inactive_user = UserFactory(is_active=False)
    student = UserFactory()
    created_task = TaskFactory(created_by=inactive_user, updated_by=inactive_user)
    assignment = TaskAssignmentFactory(task=created_task, assignee=student)
    task_quiz = TaskQuizFactory(task=created_task)
    revision_question = QuizRevisionQuestionFactory(quiz=task_quiz.quiz)
    revision_option = QuizRevisionQuestionOptionFactory(question=revision_question, is_correct=True)
    submission = SubmissionFactory(
        task_assignment=assignment,
        task_quiz=task_quiz,
        quiz=task_quiz.quiz,
        user=student,
    )
    answer = Answer.objects.create(
        submission=submission,
        question=revision_question,
        is_correct=True,
        obtained_score=revision_question.score,
    )
    selection = AnswerSelection.objects.create(
        answer=answer,
        question_option=revision_option,
    )

    UserManagementService(build_request(admin_user)).delete_user(inactive_user.id)

    assert not Task.objects.filter(id=created_task.id).exists()
    assert not TaskAssignment.objects.filter(id=assignment.id).exists()
    assert not TaskQuiz.objects.filter(id=task_quiz.id).exists()
    assert not Submission.objects.filter(id=submission.id).exists()
    assert not Answer.objects.filter(id=answer.id).exists()
    assert not AnswerSelection.objects.filter(id=selection.id).exists()
    assert not type(inactive_user).objects.filter(id=inactive_user.id).exists()
    assert type(student).objects.filter(id=student.id).exists()
