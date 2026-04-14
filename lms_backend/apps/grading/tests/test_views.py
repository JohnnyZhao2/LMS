import pytest

from apps.grading.views import GradingAnswersView
from apps.questions.models import Question, QuestionOption
from apps.quizzes.models import QuizQuestion
from apps.submissions.models import Answer, AnswerSelection
from apps.tasks.models import TaskQuiz
from apps.tasks.tests.factories import (
    QuizFactory,
    SubmissionFactory,
    TaskAssignmentFactory,
    TaskFactory,
    UserFactory,
)


def create_choice_question(*, created_by, content: str, correct_keys: list[str]) -> Question:
    question = Question.objects.create(
        content=content,
        question_type='MULTIPLE_CHOICE',
        score=2,
        created_by=created_by,
    )
    for index, label in enumerate(['选项 A', '选项 B', '选项 C'], start=1):
        QuestionOption.objects.create(
            question=question,
            sort_order=index,
            content=label,
            is_correct=chr(64 + index) in correct_keys,
        )
    return question


def create_objective_answer(*, submission, question, selected_keys: list[str], is_correct: bool):
    answer = Answer.objects.create(
        submission=submission,
        question=question,
        is_correct=is_correct,
    )
    key_map = question.get_option_key_map()
    for key in selected_keys:
        AnswerSelection.objects.create(
            answer=answer,
            question_option_id=key_map[key]['id'],
        )
    return answer


@pytest.mark.django_db
def test_objective_distribution_counts_answered_students_once():
    mentor = UserFactory()
    task = TaskFactory(created_by=mentor)
    quiz = QuizFactory(created_by=mentor)
    TaskQuiz.objects.create(task=task, quiz=quiz, order=1)

    question = create_choice_question(
        created_by=mentor,
        content='多选题',
        correct_keys=['A', 'B'],
    )
    QuizQuestion.objects.create(quiz=quiz, question=question, order=1, score=2)

    assignment_a = TaskAssignmentFactory(task=task)
    assignment_b = TaskAssignmentFactory(task=task)
    assignment_c = TaskAssignmentFactory(task=task)

    submission_a = SubmissionFactory(task_assignment=assignment_a, quiz=quiz, status='SUBMITTED')
    submission_b = SubmissionFactory(task_assignment=assignment_b, quiz=quiz, status='SUBMITTED')
    submission_c = SubmissionFactory(task_assignment=assignment_c, quiz=quiz, status='SUBMITTED')

    create_objective_answer(submission=submission_a, question=question, selected_keys=['A', 'B'], is_correct=True)
    create_objective_answer(submission=submission_b, question=question, selected_keys=['B'], is_correct=False)
    create_objective_answer(submission=submission_c, question=question, selected_keys=[], is_correct=False)

    payload = GradingAnswersView()._get_grading_answers(task, question.id, quiz.id)
    option_map = {option['option_key']: option for option in payload['options']}

    assert payload['answered_count'] == 2
    assert option_map['A']['selected_count'] == 1
    assert option_map['B']['selected_count'] == 2
    assert option_map['C']['selected_count'] == 0
