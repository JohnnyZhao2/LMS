"""
User selectors for LMS.
Provides optimized query functions for user-related data retrieval.
"""
from typing import Dict, List, Optional

from django.db.models import Case, Exists, IntegerField, OuterRef, Q, QuerySet, Value, When

from .models import Department, Role, User, UserRole


def user_base_queryset() -> QuerySet:
    """
    Base queryset for users with common prefetches.
    Returns:
        QuerySet with select_related and prefetch_related applied
    """
    return User.objects.select_related(
        'department',
        'mentor'
    ).prefetch_related('roles')


def get_user_by_id(pk: int) -> Optional[User]:
    """
    Get a user by ID with related data.
    Args:
        pk: User primary key
    Returns:
        User instance or None
    """
    return user_base_queryset().filter(pk=pk).first()


def list_users(
    is_active: Optional[bool] = None,
    department_id: Optional[int] = None,
    mentor_id: Optional[int] = None,
    search: Optional[str] = None,
) -> QuerySet:
    """
    List users with optional filters.
    Args:
        is_active: Filter by active status
        department_id: Filter by department
        mentor_id: Filter by mentor
        search: Search in username or employee_id
    Returns:
        Filtered QuerySet of users, with dept_manager at top when filtering by department
    """
    qs = user_base_queryset()
    if is_active is not None:
        qs = qs.filter(is_active=is_active)
    if department_id:
        qs = qs.filter(department_id=department_id)
    if mentor_id:
        qs = qs.filter(mentor_id=mentor_id)
    if search:
        qs = qs.filter(
            Q(username__icontains=search) |
            Q(employee_id__icontains=search)
        )

    # 按部门筛选时，室经理置顶
    if department_id:
        # 使用子查询判断是否是室经理，避免 JOIN 导致重复
        dept_manager_subquery = UserRole.objects.filter(
            user_id=OuterRef('pk'),
            role__code='DEPT_MANAGER'
        )
        qs = qs.annotate(
            _dept_manager_sort=Case(
                When(Exists(dept_manager_subquery), then=Value(0)),
                default=Value(1),
                output_field=IntegerField()
            )
        ).order_by('_dept_manager_sort', 'employee_id')
    else:
        qs = qs.order_by('employee_id')

    return qs
def list_mentors() -> QuerySet:
    """
    List all active users with MENTOR role.
    Returns:
        QuerySet of mentor users
    """
    return User.objects.filter(
        roles__code='MENTOR',
        is_active=True
    ).distinct().order_by('username')


def list_departments() -> QuerySet:
    """
    List all departments.
    Returns:
        QuerySet of departments
    """
    return Department.objects.all().order_by('code')


def list_roles(exclude_student: bool = True) -> QuerySet:
    """
    List all roles.
    Args:
        exclude_student: Whether to exclude STUDENT role
    Returns:
        QuerySet of roles
    """
    qs = Role.objects.all()
    if exclude_student:
        qs = qs.exclude(code='STUDENT')
    return qs.order_by('code')


def get_user_created_resource_ids(user_id: int) -> Dict[str, List[int]]:
    """
    获取用户创建资源的 ID 快照，用于硬删除流程。
    """
    from apps.knowledge.models import Knowledge
    from apps.questions.models import Question
    from apps.quizzes.models import Quiz
    from apps.tasks.models import Task

    return {
        'task_ids': list(Task.objects.filter(created_by_id=user_id).values_list('id', flat=True)),
        'knowledge_ids': list(Knowledge.objects.filter(created_by_id=user_id).values_list('id', flat=True)),
        'quiz_ids': list(Quiz.objects.filter(created_by_id=user_id).values_list('id', flat=True)),
        'question_ids': list(Question.objects.filter(created_by_id=user_id).values_list('id', flat=True)),
    }


def purge_user_related_business_data(
    user_id: int,
    created_resource_ids: Dict[str, List[int]],
) -> None:
    """
    清理用户关联业务数据（硬删除，破坏式）。
    """
    from apps.knowledge.models import Knowledge
    from apps.questions.models import Question
    from apps.quizzes.models import Quiz, QuizQuestion
    from apps.spot_checks.models import SpotCheck
    from apps.submissions.models import Answer, Submission
    from apps.tasks.models import Task, TaskAssignment, TaskKnowledge, TaskQuiz

    created_quiz_ids = created_resource_ids['quiz_ids']
    created_question_ids = created_resource_ids['question_ids']
    created_knowledge_ids = created_resource_ids['knowledge_ids']
    created_task_ids = created_resource_ids['task_ids']

    # 1) 清理直接挂在该用户上的业务数据（PROTECT 关系）
    SpotCheck.objects.filter(
        Q(student_id=user_id) | Q(checker_id=user_id)
    ).delete()
    TaskAssignment.objects.filter(assignee_id=user_id).delete()
    Submission.objects.filter(user_id=user_id).delete()

    # 2) 清理该用户“创建”的资源依赖关系（避免 PROTECT 阻塞）
    if created_quiz_ids:
        Submission.objects.filter(quiz_id__in=created_quiz_ids).delete()
        TaskQuiz.objects.filter(quiz_id__in=created_quiz_ids).delete()

    if created_question_ids:
        Answer.objects.filter(question_id__in=created_question_ids).delete()
        QuizQuestion.objects.filter(question_id__in=created_question_ids).delete()

    if created_knowledge_ids:
        TaskKnowledge.objects.filter(knowledge_id__in=created_knowledge_ids).delete()

    # 3) 删除该用户创建的资源
    if created_task_ids:
        Task.objects.filter(id__in=created_task_ids).delete()
    if created_quiz_ids:
        Quiz.objects.filter(id__in=created_quiz_ids).delete()
    if created_knowledge_ids:
        Knowledge.objects.filter(id__in=created_knowledge_ids).delete()
    if created_question_ids:
        Question.objects.filter(id__in=created_question_ids).delete()
