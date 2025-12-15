"""
Factory Boy factories for generating test data.
"""
import factory
from factory.django import DjangoModelFactory
from django.contrib.auth import get_user_model

from apps.users.models import Department, Role, UserRole

User = get_user_model()


class DepartmentFactory(DjangoModelFactory):
    """Factory for creating Department instances."""
    
    class Meta:
        model = Department
    
    name = factory.Sequence(lambda n: f'部门{n}')
    code = factory.Sequence(lambda n: f'DEPT{n:03d}')
    description = factory.LazyAttribute(lambda obj: f'{obj.name}的描述')


class RoleFactory(DjangoModelFactory):
    """Factory for creating Role instances."""
    
    class Meta:
        model = Role
        django_get_or_create = ('code',)
    
    code = 'STUDENT'
    name = factory.LazyAttribute(lambda obj: dict(Role.ROLE_CHOICES).get(obj.code, obj.code))
    description = factory.LazyAttribute(lambda obj: f'{obj.name}角色')


class UserFactory(DjangoModelFactory):
    """Factory for creating User instances."""
    
    class Meta:
        model = User
    
    username = factory.Sequence(lambda n: f'user{n}')
    employee_id = factory.Sequence(lambda n: f'EMP{n:06d}')
    real_name = factory.Sequence(lambda n: f'用户{n}')
    email = factory.LazyAttribute(lambda obj: f'{obj.username}@example.com')
    password = factory.PostGenerationMethodCall('set_password', 'testpass123')
    is_active = True
    department = factory.SubFactory(DepartmentFactory)


class UserRoleFactory(DjangoModelFactory):
    """Factory for creating UserRole instances."""
    
    class Meta:
        model = UserRole
    
    user = factory.SubFactory(UserFactory)
    role = factory.SubFactory(RoleFactory)
    assigned_by = None


from apps.knowledge.models import Knowledge, KnowledgeCategory, KnowledgeCategoryRelation


class KnowledgeCategoryFactory(DjangoModelFactory):
    """Factory for creating KnowledgeCategory instances."""
    
    class Meta:
        model = KnowledgeCategory
    
    name = factory.Sequence(lambda n: f'分类{n}')
    code = factory.Sequence(lambda n: f'CAT{n:03d}')
    description = factory.LazyAttribute(lambda obj: f'{obj.name}的描述')
    sort_order = factory.Sequence(lambda n: n)
    parent = None


class KnowledgeFactory(DjangoModelFactory):
    """Factory for creating Knowledge instances."""
    
    class Meta:
        model = Knowledge
    
    title = factory.Sequence(lambda n: f'知识文档{n}')
    knowledge_type = 'OTHER'
    summary = factory.LazyAttribute(lambda obj: f'{obj.title}的摘要')
    content = factory.LazyAttribute(lambda obj: f'{obj.title}的正文内容')
    created_by = factory.SubFactory(UserFactory)
    is_deleted = False


class EmergencyKnowledgeFactory(KnowledgeFactory):
    """Factory for creating emergency type Knowledge instances."""
    
    knowledge_type = 'EMERGENCY'
    content = ''
    fault_scenario = factory.Sequence(lambda n: f'故障场景{n}')
    trigger_process = factory.Sequence(lambda n: f'触发流程{n}')
    solution = factory.Sequence(lambda n: f'解决方案{n}')
    verification_plan = factory.Sequence(lambda n: f'验证方案{n}')
    recovery_plan = factory.Sequence(lambda n: f'恢复方案{n}')


class KnowledgeCategoryRelationFactory(DjangoModelFactory):
    """Factory for creating KnowledgeCategoryRelation instances."""
    
    class Meta:
        model = KnowledgeCategoryRelation
    
    knowledge = factory.SubFactory(KnowledgeFactory)
    category = factory.SubFactory(KnowledgeCategoryFactory)
    is_primary = False


from apps.questions.models import Question


class QuestionFactory(DjangoModelFactory):
    """Factory for creating Question instances."""
    
    class Meta:
        model = Question
    
    content = factory.Sequence(lambda n: f'这是第 {n} 道题目的内容？')
    question_type = 'SINGLE_CHOICE'
    options = factory.LazyAttribute(lambda obj: [
        {'key': 'A', 'value': '选项A'},
        {'key': 'B', 'value': '选项B'},
        {'key': 'C', 'value': '选项C'},
        {'key': 'D', 'value': '选项D'},
    ])
    answer = 'A'
    explanation = factory.Sequence(lambda n: f'第 {n} 道题目的解析')
    score = 1.0
    difficulty = 'MEDIUM'
    tags = factory.LazyAttribute(lambda obj: ['测试'])
    created_by = factory.SubFactory(UserFactory)
    is_deleted = False


class MultipleChoiceQuestionFactory(QuestionFactory):
    """Factory for creating multiple choice Question instances."""
    
    question_type = 'MULTIPLE_CHOICE'
    answer = ['A', 'B']


class TrueFalseQuestionFactory(QuestionFactory):
    """Factory for creating true/false Question instances."""
    
    question_type = 'TRUE_FALSE'
    options = []
    answer = 'TRUE'


class ShortAnswerQuestionFactory(QuestionFactory):
    """Factory for creating short answer Question instances."""
    
    question_type = 'SHORT_ANSWER'
    options = []
    answer = factory.Sequence(lambda n: f'第 {n} 道简答题的参考答案')


from apps.quizzes.models import Quiz, QuizQuestion


class QuizFactory(DjangoModelFactory):
    """Factory for creating Quiz instances."""
    
    class Meta:
        model = Quiz
    
    title = factory.Sequence(lambda n: f'试卷{n}')
    description = factory.LazyAttribute(lambda obj: f'{obj.title}的描述')
    created_by = factory.SubFactory(UserFactory)
    is_deleted = False


class QuizQuestionFactory(DjangoModelFactory):
    """Factory for creating QuizQuestion instances."""
    
    class Meta:
        model = QuizQuestion
    
    quiz = factory.SubFactory(QuizFactory)
    question = factory.SubFactory(QuestionFactory)
    order = factory.Sequence(lambda n: n + 1)


from apps.tasks.models import Task, TaskAssignment, TaskKnowledge, TaskQuiz


class TaskFactory(DjangoModelFactory):
    """Factory for creating Task instances."""
    
    class Meta:
        model = Task
    
    title = factory.Sequence(lambda n: f'任务{n}')
    description = factory.LazyAttribute(lambda obj: f'{obj.title}的描述')
    task_type = 'LEARNING'
    deadline = factory.LazyFunction(lambda: __import__('django.utils.timezone', fromlist=['timezone']).timezone.now() + __import__('datetime').timedelta(days=7))
    created_by = factory.SubFactory(UserFactory)
    is_deleted = False


class LearningTaskFactory(TaskFactory):
    """Factory for creating learning Task instances."""
    task_type = 'LEARNING'


class PracticeTaskFactory(TaskFactory):
    """Factory for creating practice Task instances."""
    task_type = 'PRACTICE'


class ExamTaskFactory(TaskFactory):
    """Factory for creating exam Task instances."""
    task_type = 'EXAM'
    start_time = factory.LazyFunction(lambda: __import__('django.utils.timezone', fromlist=['timezone']).timezone.now())
    duration = 60  # 60 minutes
    pass_score = 60.0


class TaskAssignmentFactory(DjangoModelFactory):
    """Factory for creating TaskAssignment instances."""
    
    class Meta:
        model = TaskAssignment
    
    task = factory.SubFactory(TaskFactory)
    assignee = factory.SubFactory(UserFactory)
    status = 'IN_PROGRESS'


class TaskKnowledgeFactory(DjangoModelFactory):
    """Factory for creating TaskKnowledge instances."""
    
    class Meta:
        model = TaskKnowledge
    
    task = factory.SubFactory(TaskFactory)
    knowledge = factory.SubFactory(KnowledgeFactory)
    order = factory.Sequence(lambda n: n + 1)


class TaskQuizFactory(DjangoModelFactory):
    """Factory for creating TaskQuiz instances."""
    
    class Meta:
        model = TaskQuiz
    
    task = factory.SubFactory(TaskFactory)
    quiz = factory.SubFactory(QuizFactory)
    order = factory.Sequence(lambda n: n + 1)


# Additional factories will be added as models are implemented
# - SubmissionFactory (task 9.1)
# - SpotCheckFactory (task 10.1)
