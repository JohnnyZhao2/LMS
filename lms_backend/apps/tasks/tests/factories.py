from datetime import timedelta

import factory
from django.utils import timezone
from factory.django import DjangoModelFactory

from apps.knowledge.models import Knowledge
from apps.quizzes.models import Quiz
from apps.submissions.models import Submission
from apps.tasks.models import (
    KnowledgeLearningProgress,
    Task,
    TaskAssignment,
    TaskKnowledge,
)
from apps.users.models import Department, User


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
    username = factory.Sequence(lambda n: f'User {n}')
    department = factory.SubFactory(DepartmentFactory)


class TaskFactory(DjangoModelFactory):
    class Meta:
        model = Task

    title = factory.Sequence(lambda n: f'Task {n}')
    description = 'Test task description'
    deadline = factory.LazyFunction(lambda: timezone.now() + timedelta(days=7))
    created_by = factory.SubFactory(UserFactory)
    created_role = 'MENTOR'


class TaskAssignmentFactory(DjangoModelFactory):
    class Meta:
        model = TaskAssignment

    task = factory.SubFactory(TaskFactory)
    assignee = factory.SubFactory(UserFactory)
    status = 'IN_PROGRESS'


class KnowledgeFactory(DjangoModelFactory):
    class Meta:
        model = Knowledge

    title = factory.Sequence(lambda n: f'Knowledge {n}')
    content = '<p>Test knowledge content</p>'
    created_by = factory.SubFactory(UserFactory)


class TaskKnowledgeFactory(DjangoModelFactory):
    class Meta:
        model = TaskKnowledge

    task = factory.SubFactory(TaskFactory)
    knowledge = factory.SubFactory(KnowledgeFactory)
    order = 1


class KnowledgeLearningProgressFactory(DjangoModelFactory):
    class Meta:
        model = KnowledgeLearningProgress

    assignment = factory.SubFactory(TaskAssignmentFactory)
    task_knowledge = factory.SubFactory(TaskKnowledgeFactory)
    is_completed = False


class QuizFactory(DjangoModelFactory):
    class Meta:
        model = Quiz

    title = factory.Sequence(lambda n: f'Quiz {n}')
    quiz_type = 'PRACTICE'
    created_by = factory.SubFactory(UserFactory)


class SubmissionFactory(DjangoModelFactory):
    class Meta:
        model = Submission

    task_assignment = factory.SubFactory(TaskAssignmentFactory)
    quiz = factory.SubFactory(QuizFactory)
    status = 'SUBMITTED'
