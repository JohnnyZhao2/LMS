from __future__ import annotations

from datetime import timedelta
import hashlib

import factory
from django.utils import timezone
from factory.django import DjangoModelFactory

from apps.knowledge.models import Knowledge, KnowledgeRevision
from apps.questions.models import Question, QuestionOption
from apps.quizzes.models import (
    Quiz,
    QuizQuestion,
    QuizQuestionOption,
    QuizRevision,
    QuizRevisionQuestion,
    QuizRevisionQuestionOption,
)
from apps.submissions.models import Submission
from apps.tasks.models import (
    KnowledgeLearningProgress,
    Task,
    TaskAssignment,
    TaskKnowledge,
    TaskQuiz,
)
from apps.users.models import Department, User


def _hash_value(value: str) -> str:
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


class DepartmentFactory(DjangoModelFactory):
    class Meta:
        model = Department
        django_get_or_create = ('code',)

    name = factory.Sequence(lambda n: f'Department {n}')
    code = factory.Sequence(lambda n: f'DEPT{n}')


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    employee_id = factory.Sequence(lambda n: f'EMP{n:04d}')
    username = factory.Sequence(lambda n: f'user_{n}')
    department = factory.SubFactory(DepartmentFactory)


class KnowledgeFactory(DjangoModelFactory):
    class Meta:
        model = Knowledge

    title = factory.Sequence(lambda n: f'Knowledge {n}')
    content = factory.Sequence(lambda n: f'<p>knowledge content {n}</p>')
    created_by = factory.SubFactory(UserFactory)
    updated_by = factory.SelfAttribute('created_by')


class KnowledgeRevisionFactory(DjangoModelFactory):
    class Meta:
        model = KnowledgeRevision

    source_knowledge = factory.SubFactory(KnowledgeFactory)
    revision_number = 1
    title = factory.LazyAttribute(lambda obj: obj.source_knowledge.title)
    content = factory.LazyAttribute(lambda obj: obj.source_knowledge.content)
    related_links = factory.LazyAttribute(lambda obj: obj.source_knowledge.related_links)
    space_tag_name = ''
    tags_json = []
    content_hash = factory.LazyAttribute(lambda obj: _hash_value(f'{obj.title}:{obj.content}:{obj.revision_number}'))
    created_by = factory.LazyAttribute(lambda obj: obj.source_knowledge.created_by)


class QuestionFactory(DjangoModelFactory):
    class Meta:
        model = Question

    content = factory.Sequence(lambda n: f'Question {n}')
    question_type = 'SINGLE_CHOICE'
    reference_answer = ''
    explanation = ''
    score = 1
    created_by = factory.SubFactory(UserFactory)
    updated_by = factory.SelfAttribute('created_by')
    created_from_quiz = None

    @factory.post_generation
    def with_default_options(self, create, extracted, **kwargs):
        if not create:
            return
        if extracted is False or self.question_type == 'SHORT_ANSWER':
            return
        if self.question_options.exists():
            return
        if self.question_type == 'TRUE_FALSE':
            QuestionOptionFactory(question=self, sort_order=1, content='正确', is_correct=True)
            QuestionOptionFactory(question=self, sort_order=2, content='错误', is_correct=False)
            return
        QuestionOptionFactory(question=self, sort_order=1, content='选项A', is_correct=True)
        QuestionOptionFactory(question=self, sort_order=2, content='选项B', is_correct=False)


class QuestionOptionFactory(DjangoModelFactory):
    class Meta:
        model = QuestionOption

    question = factory.SubFactory(QuestionFactory, with_default_options=False)
    sort_order = factory.Sequence(lambda n: n + 1)
    content = factory.Sequence(lambda n: f'选项 {n}')
    is_correct = False


class QuizFactory(DjangoModelFactory):
    class Meta:
        model = Quiz

    title = factory.Sequence(lambda n: f'Quiz {n}')
    quiz_type = 'PRACTICE'
    duration = None
    pass_score = None
    created_by = factory.SubFactory(UserFactory)
    updated_by = factory.SelfAttribute('created_by')


class QuizQuestionFactory(DjangoModelFactory):
    class Meta:
        model = QuizQuestion

    quiz = factory.SubFactory(QuizFactory)
    question = factory.SubFactory(QuestionFactory)
    content = factory.LazyAttribute(lambda obj: obj.question.content)
    question_type = factory.LazyAttribute(lambda obj: obj.question.question_type)
    reference_answer = factory.LazyAttribute(lambda obj: obj.question.reference_answer)
    explanation = factory.LazyAttribute(lambda obj: obj.question.explanation)
    score = factory.LazyAttribute(lambda obj: obj.question.score)
    order = factory.Sequence(lambda n: n + 1)
    space_tag_name = ''
    tags_json = []

    @factory.post_generation
    def with_default_options(self, create, extracted, **kwargs):
        if not create:
            return
        if extracted is False or self.question_type == 'SHORT_ANSWER':
            return
        if self.question_options.exists():
            return
        for option in self.question.question_options.order_by('sort_order', 'id'):
            QuizQuestionOptionFactory(
                question=self,
                sort_order=option.sort_order,
                content=option.content,
                is_correct=option.is_correct,
            )


class QuizQuestionOptionFactory(DjangoModelFactory):
    class Meta:
        model = QuizQuestionOption

    question = factory.SubFactory(QuizQuestionFactory, with_default_options=False)
    sort_order = factory.Sequence(lambda n: n + 1)
    content = factory.Sequence(lambda n: f'试卷选项 {n}')
    is_correct = False


class QuizRevisionFactory(DjangoModelFactory):
    class Meta:
        model = QuizRevision

    source_quiz = factory.SubFactory(QuizFactory)
    revision_number = 1
    title = factory.LazyAttribute(lambda obj: obj.source_quiz.title)
    quiz_type = factory.LazyAttribute(lambda obj: obj.source_quiz.quiz_type)
    duration = factory.LazyAttribute(lambda obj: obj.source_quiz.duration)
    pass_score = factory.LazyAttribute(lambda obj: obj.source_quiz.pass_score)
    structure_hash = factory.LazyAttribute(lambda obj: _hash_value(f'{obj.title}:{obj.revision_number}'))
    created_by = factory.LazyAttribute(lambda obj: obj.source_quiz.created_by)


class QuizRevisionQuestionFactory(DjangoModelFactory):
    class Meta:
        model = QuizRevisionQuestion

    quiz = factory.SubFactory(QuizRevisionFactory)
    question = factory.SubFactory(QuestionFactory)
    content = factory.LazyAttribute(lambda obj: obj.question.content)
    question_type = factory.LazyAttribute(lambda obj: obj.question.question_type)
    reference_answer = factory.LazyAttribute(lambda obj: obj.question.reference_answer)
    explanation = factory.LazyAttribute(lambda obj: obj.question.explanation)
    score = factory.LazyAttribute(lambda obj: obj.question.score)
    order = factory.Sequence(lambda n: n + 1)
    space_tag_name = ''
    tags_json = []

    @factory.post_generation
    def with_default_options(self, create, extracted, **kwargs):
        if not create:
            return
        if extracted is False or self.question_type == 'SHORT_ANSWER':
            return
        if self.question_options.exists():
            return
        for option in self.question.question_options.order_by('sort_order', 'id'):
            QuizRevisionQuestionOptionFactory(
                question=self,
                sort_order=option.sort_order,
                content=option.content,
                is_correct=option.is_correct,
            )


class QuizRevisionQuestionOptionFactory(DjangoModelFactory):
    class Meta:
        model = QuizRevisionQuestionOption

    question = factory.SubFactory(QuizRevisionQuestionFactory, with_default_options=False)
    sort_order = factory.Sequence(lambda n: n + 1)
    content = factory.Sequence(lambda n: f'快照选项 {n}')
    is_correct = False


class TaskFactory(DjangoModelFactory):
    class Meta:
        model = Task

    title = factory.Sequence(lambda n: f'Task {n}')
    description = 'Task description'
    deadline = factory.LazyFunction(lambda: timezone.now() + timedelta(days=7))
    created_by = factory.SubFactory(UserFactory)
    updated_by = factory.SelfAttribute('created_by')
    created_role = 'MENTOR'


class TaskAssignmentFactory(DjangoModelFactory):
    class Meta:
        model = TaskAssignment

    task = factory.SubFactory(TaskFactory)
    assignee = factory.SubFactory(UserFactory)
    status = 'IN_PROGRESS'


class TaskKnowledgeFactory(DjangoModelFactory):
    class Meta:
        model = TaskKnowledge

    task = factory.SubFactory(TaskFactory)
    knowledge = factory.SubFactory(KnowledgeRevisionFactory)
    source_knowledge = factory.LazyAttribute(lambda obj: obj.knowledge.source_knowledge)
    order = factory.Sequence(lambda n: n + 1)


class TaskQuizFactory(DjangoModelFactory):
    class Meta:
        model = TaskQuiz

    task = factory.SubFactory(TaskFactory)
    quiz = factory.SubFactory(QuizRevisionFactory)
    source_quiz = factory.LazyAttribute(lambda obj: obj.quiz.source_quiz)
    order = factory.Sequence(lambda n: n + 1)


class KnowledgeLearningProgressFactory(DjangoModelFactory):
    class Meta:
        model = KnowledgeLearningProgress

    assignment = factory.SubFactory(TaskAssignmentFactory)
    task_knowledge = factory.SubFactory(TaskKnowledgeFactory)
    is_completed = False


class SubmissionFactory(DjangoModelFactory):
    class Meta:
        model = Submission

    task_assignment = factory.SubFactory(TaskAssignmentFactory)
    task_quiz = factory.SubFactory(TaskQuizFactory, task=factory.SelfAttribute('..task_assignment.task'))
    quiz = factory.SelfAttribute('task_quiz.quiz')
    user = factory.SelfAttribute('task_assignment.assignee')
    status = 'SUBMITTED'
    attempt_number = 1
