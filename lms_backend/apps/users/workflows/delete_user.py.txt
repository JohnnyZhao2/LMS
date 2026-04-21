from django.db.models import Q


def hard_delete_user_business_data(user_id: int) -> None:
    """硬删除用户关联业务数据。"""
    from apps.knowledge.models import Knowledge, KnowledgeRevision
    from apps.questions.models import Question
    from apps.quizzes.models import Quiz, QuizRevision
    from apps.spot_checks.models import SpotCheck
    from apps.submissions.models import Submission
    from apps.tasks.models import Task, TaskAssignment, TaskKnowledge, TaskQuiz
    from apps.tasks.task_service import TaskService

    created_task_ids = list(Task.objects.filter(created_by_id=user_id).values_list('id', flat=True))
    created_quiz_ids = list(Quiz.objects.filter(created_by_id=user_id).values_list('id', flat=True))
    created_knowledge_ids = list(Knowledge.objects.filter(created_by_id=user_id).values_list('id', flat=True))
    created_question_ids = list(Question.objects.filter(created_by_id=user_id).values_list('id', flat=True))

    SpotCheck.objects.filter(Q(student_id=user_id) | Q(checker_id=user_id)).delete()
    TaskAssignment.objects.filter(assignee_id=user_id).delete()
    Submission.objects.filter(user_id=user_id).delete()

    Submission.objects.filter(quiz__created_by_id=user_id).delete()
    TaskQuiz.objects.filter(quiz__created_by_id=user_id).delete()
    TaskKnowledge.objects.filter(knowledge__created_by_id=user_id).delete()

    if created_task_ids:
        TaskService.hard_delete_tasks(created_task_ids)
    if created_quiz_ids:
        Quiz.objects.filter(id__in=created_quiz_ids).delete()
    if created_knowledge_ids:
        Knowledge.objects.filter(id__in=created_knowledge_ids).delete()
    if created_question_ids:
        Question.objects.filter(id__in=created_question_ids).delete()

    KnowledgeRevision.objects.filter(
        created_by_id=user_id,
        knowledge_tasks__isnull=True,
    ).delete()
    QuizRevision.objects.filter(
        created_by_id=user_id,
        quiz_tasks__isnull=True,
        submissions__isnull=True,
    ).delete()
