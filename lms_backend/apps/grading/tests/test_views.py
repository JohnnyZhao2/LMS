import pytest

from apps.grading.views import GradingAnswersView
from apps.questions.models import Question
from apps.quizzes.models import QuizQuestion
from apps.submissions.models import Answer
from apps.tasks.models import TaskQuiz
from apps.tasks.tests.factories import (
    QuizFactory,
    SubmissionFactory,
    TaskAssignmentFactory,
    TaskFactory,
    UserFactory,
)


@pytest.mark.django_db
def test_objective_distribution_counts_answered_students_once():
    mentor = UserFactory()
    task = TaskFactory(created_by=mentor)
    quiz = QuizFactory(created_by=mentor)
    TaskQuiz.objects.create(task=task, quiz=quiz, order=1)

    question = Question.objects.create(
        content='多选题',
        question_type='MULTIPLE_CHOICE',
        options=[
            {'key': 'A', 'value': '选项 A'},
            {'key': 'B', 'value': '选项 B'},
            {'key': 'C', 'value': '选项 C'},
        ],
        answer=['A', 'B'],
        score=2,
        created_by=mentor,
    )
    QuizQuestion.objects.create(quiz=quiz, question=question, order=1, score=2)

    assignment_a = TaskAssignmentFactory(task=task)
    assignment_b = TaskAssignmentFactory(task=task)
    assignment_c = TaskAssignmentFactory(task=task)

    submission_a = SubmissionFactory(task_assignment=assignment_a, quiz=quiz, status='SUBMITTED')
    submission_b = SubmissionFactory(task_assignment=assignment_b, quiz=quiz, status='SUBMITTED')
    submission_c = SubmissionFactory(task_assignment=assignment_c, quiz=quiz, status='SUBMITTED')

    Answer.objects.create(submission=submission_a, question=question, user_answer=['A', 'B'], is_correct=True)
    Answer.objects.create(submission=submission_b, question=question, user_answer=['B'], is_correct=False)
    Answer.objects.create(submission=submission_c, question=question, user_answer=[], is_correct=False)

    payload = GradingAnswersView()._get_grading_answers(task, question.id, quiz.id)
    option_map = {option['option_key']: option for option in payload['options']}

    assert payload['answered_count'] == 2
    assert option_map['A']['selected_count'] == 1
    assert option_map['B']['selected_count'] == 2
    assert option_map['C']['selected_count'] == 0
