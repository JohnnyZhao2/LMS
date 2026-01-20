"""
Task analytics views for admin preview.
Implements:
- Task analytics API
- Student executions API
- Grading APIs
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter
from django.db.models import Avg, Sum, Count, Q, F, OuterRef, Subquery
from django.utils import timezone
from decimal import Decimal

from core.exceptions import BusinessError, ErrorCodes
from core.responses import success_response, list_response
from apps.users.permissions import IsAdminOrMentorOrDeptManager
from apps.tasks.models import Task, TaskAssignment, TaskKnowledge, TaskQuiz, KnowledgeLearningProgress
from apps.tasks.serializers import (
    TaskAnalyticsSerializer,
    StudentExecutionSerializer,
    GradingQuestionSerializer,
    GradingAnswerResponseSerializer,
    GradingSubmitSerializer,
)
from apps.tasks.services import TaskService
from apps.submissions.models import Submission, Answer


def _get_latest_answers(task, question_id, quiz_id):
    """获取每位学员最新一次提交的答案"""
    base_answers = Answer.objects.filter(
        question_id=question_id,
        submission__task_assignment__task=task,
        submission__quiz_id=quiz_id,
        submission__status__in=['GRADING', 'SUBMITTED', 'GRADED']
    )

    latest_submission_subquery = Submission.objects.filter(
        task_assignment_id=OuterRef('submission__task_assignment_id'),
        quiz_id=OuterRef('submission__quiz_id'),
        status__in=['GRADING', 'SUBMITTED', 'GRADED']
    ).order_by('-attempt_number', '-submitted_at', '-id').values('id')[:1]

    return base_answers.annotate(
        latest_submission_id=Subquery(latest_submission_subquery)
    ).filter(submission_id=F('latest_submission_id'))


class TaskAnalyticsView(APIView):
    """Task analytics endpoint for admin preview."""
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = TaskService()

    @extend_schema(
        summary='获取任务分析数据',
        description='获取任务的完成情况、准确率、异常人数等分析数据',
        responses={
            200: TaskAnalyticsSerializer,
            404: OpenApiResponse(description='任务不存在'),
        },
        tags=['任务分析']
    )
    def get(self, request, pk):
        task = self.service.get_task_by_id(pk)
        self.service.check_task_read_permission(task, request.user)

        analytics = self._compute_analytics(task)
        serializer = TaskAnalyticsSerializer(analytics)
        return success_response(serializer.data)

    def _compute_analytics(self, task):
        """计算任务分析数据"""
        assignments = task.assignments.select_related('assignee', 'assignee__department')
        total_count = assignments.count()
        completed_count = assignments.filter(status='COMPLETED').count()

        # 计算平均用时（分钟）
        completed_assignments = assignments.filter(
            status='COMPLETED',
            completed_at__isnull=False
        )
        avg_time = 0
        if completed_assignments.exists():
            total_time = sum([
                (a.completed_at - a.created_at).total_seconds() / 60
                for a in completed_assignments
            ])
            avg_time = round(total_time / completed_assignments.count(), 1)

        # 计算准确率
        has_quiz = task.task_quizzes.exists()
        accuracy_percentage = None
        if has_quiz:
            submissions = Submission.objects.filter(
                task_assignment__task=task,
                status__in=['SUBMITTED', 'GRADED']
            )
            if submissions.exists():
                total_score = submissions.aggregate(
                    total=Sum('total_score')
                )['total'] or 0
                obtained_score = submissions.aggregate(
                    total=Sum('obtained_score')
                )['total'] or 0
                if total_score > 0:
                    accuracy_percentage = round(float(obtained_score) / float(total_score) * 100, 1)

        # 计算异常人数
        abnormal_count = self._count_abnormal(task, assignments)

        # 计算节点进度
        node_progress = self._compute_node_progress(task, total_count)

        # 计算时间分布
        time_distribution = self._compute_time_distribution(completed_assignments)

        # 计算分数分布和通过率
        score_distribution = None
        pass_rate = None
        if has_quiz:
            score_distribution = self._compute_score_distribution(task)
            pass_rate = self._compute_pass_rate(task)

        return {
            'completion': {
                'completed_count': completed_count,
                'total_count': total_count,
                'percentage': round(completed_count / total_count * 100, 1) if total_count > 0 else 0,
            },
            'average_time': avg_time,
            'accuracy': {
                'has_quiz': has_quiz,
                'percentage': accuracy_percentage,
            },
            'abnormal_count': abnormal_count,
            'node_progress': node_progress,
            'time_distribution': time_distribution,
            'score_distribution': score_distribution,
            'pass_rate': pass_rate,
        }

    def _count_abnormal(self, task, assignments):
        """
        计算异常人数
        异常规则：
        - 文章阅读时长 < 5分钟
        - 测验完成时长 < 5分钟
        - 考试完成时长 < 30分钟
        """
        abnormal_ids = set()

        for assignment in assignments.filter(status='COMPLETED'):
            # 检查知识学习时长
            for progress in assignment.knowledge_progress.filter(is_completed=True):
                if progress.completed_at and progress.created_at:
                    duration = (progress.completed_at - progress.created_at).total_seconds() / 60
                    if duration < 5:
                        abnormal_ids.add(assignment.assignee_id)
                        break

            # 检查测验/考试时长
            submissions = Submission.objects.filter(
                task_assignment=assignment,
                status__in=['SUBMITTED', 'GRADED']
            )
            for sub in submissions:
                if sub.submitted_at and sub.started_at:
                    duration = (sub.submitted_at - sub.started_at).total_seconds() / 60
                    is_exam = sub.quiz.quiz_type == 'EXAM'
                    threshold = 30 if is_exam else 5
                    if duration < threshold:
                        abnormal_ids.add(assignment.assignee_id)
                        break

        return len(abnormal_ids)

    def _compute_node_progress(self, task, total_count):
        """计算各节点完成进度"""
        nodes = []

        # 知识节点
        for tk in task.task_knowledge.select_related('knowledge').order_by('order'):
            completed = KnowledgeLearningProgress.objects.filter(
                task_knowledge=tk,
                is_completed=True
            ).count()
            nodes.append({
                'node_id': tk.id,
                'node_name': tk.knowledge.title,
                'category': 'KNOWLEDGE',
                'completed_count': completed,
                'total_count': total_count,
                'percentage': round(completed / total_count * 100, 1) if total_count > 0 else 0,
            })

        # 试卷节点
        for tq in task.task_quizzes.select_related('quiz').order_by('order'):
            completed = Submission.objects.filter(
                task_assignment__task=task,
                quiz=tq.quiz,
                status__in=['SUBMITTED', 'GRADING', 'GRADED']
            ).values('task_assignment').distinct().count()
            nodes.append({
                'node_id': tq.id,
                'node_name': tq.quiz.title,
                'category': tq.quiz.quiz_type,  # 'PRACTICE' or 'EXAM'
                'completed_count': completed,
                'total_count': total_count,
                'percentage': round(completed / total_count * 100, 1) if total_count > 0 else 0,
            })

        return nodes

    def _compute_time_distribution(self, completed_assignments):
        """计算时间分布"""
        ranges = [
            ('0-15', 0, 15),
            ('15-30', 15, 30),
            ('30-45', 30, 45),
            ('45-60', 45, 60),
            ('60+', 60, float('inf')),
        ]
        distribution = {r[0]: 0 for r in ranges}

        for assignment in completed_assignments:
            if assignment.completed_at and assignment.created_at:
                duration = (assignment.completed_at - assignment.created_at).total_seconds() / 60
                for label, min_val, max_val in ranges:
                    if min_val <= duration < max_val:
                        distribution[label] += 1
                        break

        return [{'range': k, 'count': v} for k, v in distribution.items()]

    def _compute_score_distribution(self, task):
        """计算分数分布（仅考试，按实际分数统计）"""
        ranges = [
            ('0-60', 0, 60),
            ('60-70', 60, 70),
            ('70-80', 70, 80),
            ('80-90', 80, 90),
            ('90-100', 90, 101),
        ]
        distribution = {r[0]: 0 for r in ranges}

        # 获取每个学员在考试中的最高分提交（只统计 EXAM）
        from django.db.models import Max
        
        highest_scores = Submission.objects.filter(
            task_assignment__task=task,
            quiz__quiz_type='EXAM',  # 只统计考试
            status__in=['SUBMITTED', 'GRADING', 'GRADED'],
            obtained_score__isnull=False
        ).values('task_assignment_id').annotate(
            max_obtained=Max('obtained_score')
        )
        
        # 构建一个字典：task_assignment_id -> max_obtained_score
        assignment_max_scores = {
            item['task_assignment_id']: item['max_obtained'] 
            for item in highest_scores
        }
        
        # 获取达到最高分的那些提交记录，并按实际分数统计
        for assignment_id, max_score in assignment_max_scores.items():
            score = float(max_score)  # 直接使用实际分数，不计算百分比
            for label, min_val, max_val in ranges:
                if min_val <= score < max_val:
                    distribution[label] += 1
                    break

        return [{'range': k, 'count': v} for k, v in distribution.items()]

    def _compute_pass_rate(self, task):
        """计算通过率（仅考试任务）"""
        # 1. 首先检查任务是否包含考试类型的试卷
        has_exam = task.task_quizzes.filter(quiz__quiz_type='EXAM').exists()
        if not has_exam:
            return None

        # 2. 获取所有已完成的考试提交
        exam_submissions = Submission.objects.filter(
            task_assignment__task=task,
            quiz__quiz_type='EXAM',
            status__in=['SUBMITTED', 'GRADING', 'GRADED'],
            obtained_score__isnull=False
        ).select_related('quiz')

        # 3. 如果有考试但没人提交，返回 0.0
        if not exam_submissions.exists():
            return 0.0

        # 4. 统计通过人数
        passed_count = 0
        total_count = exam_submissions.count()

        for submission in exam_submissions:
            if submission.quiz.pass_score and submission.obtained_score >= submission.quiz.pass_score:
                passed_count += 1

        return round(passed_count / total_count * 100, 1) if total_count > 0 else 0.0


class StudentExecutionsView(APIView):
    """Student executions endpoint for admin preview."""
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = TaskService()

    @extend_schema(
        summary='获取学员执行情况',
        description='获取任务下所有学员的执行情况列表',
        responses={
            200: StudentExecutionSerializer(many=True),
            404: OpenApiResponse(description='任务不存在'),
        },
        tags=['任务分析']
    )
    def get(self, request, pk):
        task = self.service.get_task_by_id(pk)
        self.service.check_task_read_permission(task, request.user)

        executions = self._get_student_executions(task)
        serializer = StudentExecutionSerializer(executions, many=True)
        return list_response(serializer.data)

    def _get_student_executions(self, task):
        """获取学员执行情况列表"""
        assignments = task.assignments.select_related(
            'assignee', 'assignee__department'
        ).order_by('-created_at')

        total_nodes = task.task_knowledge.count() + task.task_quizzes.count()
        results = []

        for assignment in assignments:
            # 计算完成节点数
            completed_knowledge = assignment.knowledge_progress.filter(is_completed=True).count()
            completed_quizzes = Submission.objects.filter(
                task_assignment=assignment,
                status__in=['SUBMITTED', 'GRADING', 'GRADED']
            ).values('quiz').distinct().count()
            completed_nodes = completed_knowledge + completed_quizzes

            # 计算用时
            time_spent = 0
            if assignment.completed_at and assignment.created_at:
                time_spent = int((assignment.completed_at - assignment.created_at).total_seconds() / 60)

            # 获取分数（只显示考试分数）
            score = None
            exam_submission = Submission.objects.filter(
                task_assignment=assignment,
                quiz__quiz_type='EXAM',
                status__in=['SUBMITTED', 'GRADING', 'GRADED'],
                obtained_score__isnull=False
            ).order_by('-obtained_score').first()
            
            if exam_submission:
                score = float(exam_submission.obtained_score)

            # 检查是否异常
            is_abnormal = self._check_abnormal(assignment)

            # 确定状态
            status = assignment.status
            if status == 'COMPLETED' and is_abnormal:
                status = 'COMPLETED_ABNORMAL'

            results.append({
                'student_id': assignment.assignee.id,
                'student_name': assignment.assignee.username,
                'employee_id': assignment.assignee.employee_id or '',
                'department': assignment.assignee.department.name if assignment.assignee.department else '',
                'status': status,
                'node_progress': f'{completed_nodes}/{total_nodes}',
                'score': score,
                'time_spent': time_spent,
                'answer_details': '查看详情',
                'is_abnormal': is_abnormal,
            })

        return results

    def _check_abnormal(self, assignment):
        """检查学员是否异常"""
        # 检查知识学习时长
        for progress in assignment.knowledge_progress.filter(is_completed=True):
            if progress.completed_at and progress.created_at:
                duration = (progress.completed_at - progress.created_at).total_seconds() / 60
                if duration < 5:
                    return True

        # 检查测验/考试时长
        submissions = Submission.objects.filter(
            task_assignment=assignment,
            status__in=['SUBMITTED', 'GRADED']
        )
        for sub in submissions:
            if sub.submitted_at and sub.started_at:
                duration = (sub.submitted_at - sub.started_at).total_seconds() / 60
                is_exam = sub.quiz.quiz_type == 'EXAM'
                threshold = 30 if is_exam else 5
                if duration < threshold:
                    return True

        return False


class GradingQuestionsView(APIView):
    """Grading questions endpoint."""
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = TaskService()

    @extend_schema(
        summary='获取阅卷中心题目列表',
        description='获取任务中全部题目及通过率信息',
        responses={
            200: GradingQuestionSerializer(many=True),
            404: OpenApiResponse(description='任务不存在'),
        },
        tags=['阅卷中心']
    )
    def get(self, request, pk):
        task = self.service.get_task_by_id(pk)
        self.service.check_task_read_permission(task, request.user)

        quiz_id = request.query_params.get('quiz_id')
        if not quiz_id:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='缺少 quiz_id 参数'
            )
        quiz_id = int(quiz_id)
        if not task.task_quizzes.filter(quiz_id=quiz_id).exists():
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='试卷不属于该任务'
            )

        questions = self._get_grading_questions(task, quiz_id)
        serializer = GradingQuestionSerializer(questions, many=True)
        return list_response(serializer.data)

    def _get_grading_questions(self, task, quiz_id):
        """获取阅卷中心题目列表"""
        from apps.questions.models import Question

        # 获取任务关联的所有试卷中的题目
        questions = Question.objects.filter(
            question_quizzes__quiz_id=quiz_id
        ).distinct().order_by('question_quizzes__order')

        results = []
        for question in questions:
            pass_rate = self._calculate_pass_rate(task, question, quiz_id)

            results.append({
                'question_id': question.id,
                'question_text': question.content,
                'question_analysis': question.explanation or '',
                'question_type': question.question_type,
                'question_type_display': question.get_question_type_display(),
                'max_score': float(question.score),
                'pass_rate': pass_rate,
            })

        return results

    def _calculate_pass_rate(self, task, question, quiz_id):
        """计算通过率"""
        answers = _get_latest_answers(task, question.id, quiz_id)
        total_count = answers.count()
        if total_count == 0:
            return None

        if question.is_objective:
            correct_count = answers.filter(is_correct=True).count()
        else:
            score_threshold = float(question.score) * 0.6
            correct_count = answers.filter(
                graded_by__isnull=False,
                obtained_score__gte=score_threshold
            ).count()

        return round(correct_count / total_count * 100, 1)


class GradingAnswersView(APIView):
    """Grading answers endpoint."""
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = TaskService()

    @extend_schema(
        summary='获取题目分析详情',
        description='获取指定题目的作答分布与学员答案',
        parameters=[
            OpenApiParameter(name='question_id', type=int, required=True, description='题目ID'),
        ],
        responses={
            200: GradingAnswerResponseSerializer,
            404: OpenApiResponse(description='任务不存在'),
        },
        tags=['阅卷中心']
    )
    def get(self, request, pk):
        task = self.service.get_task_by_id(pk)
        self.service.check_task_read_permission(task, request.user)

        question_id = request.query_params.get('question_id')
        quiz_id = request.query_params.get('quiz_id')
        if not question_id:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='缺少 question_id 参数'
            )
        if not quiz_id:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='缺少 quiz_id 参数'
            )
        quiz_id = int(quiz_id)
        if not task.task_quizzes.filter(quiz_id=quiz_id).exists():
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='试卷不属于该任务'
            )

        answers = self._get_grading_answers(task, int(question_id), quiz_id)
        serializer = GradingAnswerResponseSerializer(answers)
        return success_response(serializer.data)

    def _get_grading_answers(self, task, question_id, quiz_id):
        """获取题目分析详情"""
        from apps.questions.models import Question

        question = Question.objects.filter(id=question_id).first()
        if not question:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='未找到对应题目'
            )
        answers = _get_latest_answers(task, question_id, quiz_id).select_related(
            'submission__task_assignment__assignee',
            'submission__task_assignment__assignee__department'
        ).order_by('graded_by', 'submission__submitted_at')

        pass_rate = self._calculate_pass_rate(task, question, quiz_id)

        if question.is_objective:
            return {
                'question_id': question.id,
                'question_type': question.question_type,
                'pass_rate': pass_rate,
                'options': self._build_objective_options(question, answers),
            }

        return {
            'question_id': question.id,
            'question_type': question.question_type,
            'pass_rate': pass_rate,
            'subjective_answers': self._build_subjective_answers(answers),
        }

    def _calculate_pass_rate(self, task, question, quiz_id):
        """计算通过率"""
        answers = _get_latest_answers(task, question.id, quiz_id)
        total_count = answers.count()
        if total_count == 0:
            return None

        if question.is_objective:
            correct_count = answers.filter(is_correct=True).count()
        else:
            score_threshold = float(question.score) * 0.6
            correct_count = answers.filter(
                graded_by__isnull=False,
                obtained_score__gte=score_threshold
            ).count()

        return round(correct_count / total_count * 100, 1)

    def _build_objective_options(self, question, answers):
        """构造客观题选项分布"""
        options = question.options or []
        if question.question_type == 'TRUE_FALSE' and not options:
            options = [
                {'key': 'TRUE', 'value': '正确'},
                {'key': 'FALSE', 'value': '错误'},
            ]

        correct_keys = question.answer if isinstance(question.answer, list) else [question.answer]
        option_payload = []

        for option in options:
            if not isinstance(option, dict):
                continue
            option_key = option.get('key')
            option_text = option.get('value')
            if not option_key:
                continue
            students = []
            selected_count = 0

            for answer in answers:
                user_answer = answer.user_answer
                selected = False
                if question.question_type == 'MULTIPLE_CHOICE':
                    selected = isinstance(user_answer, list) and option_key in user_answer
                else:
                    selected = user_answer == option_key

                if selected:
                    selected_count += 1
                    user = answer.submission.task_assignment.assignee
                    students.append({
                        'student_id': user.id,
                        'student_name': user.username,
                        'employee_id': user.employee_id or '',
                        'department': user.department.name if user.department else '',
                    })

            option_payload.append({
                'option_key': option_key,
                'option_text': option_text,
                'selected_count': selected_count,
                'is_correct': option_key in correct_keys,
                'students': students,
            })

        return option_payload

    def _build_subjective_answers(self, answers):
        """构造主观题答案列表"""
        results = []
        for answer in answers:
            user = answer.submission.task_assignment.assignee
            results.append({
                'student_id': user.id,
                'student_name': user.username,
                'employee_id': user.employee_id or '',
                'department': user.department.name if user.department else '',
                'answer_text': answer.user_answer if isinstance(answer.user_answer, str) else str(answer.user_answer or ''),
                'submitted_at': answer.submission.submitted_at,
                'score': float(answer.obtained_score) if answer.graded_by else None,
            })

        return results


class GradingSubmitView(APIView):
    """Grading submit endpoint."""
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = TaskService()

    @extend_schema(
        summary='提交评分',
        description='为学员的简答题答案提交评分',
        request=GradingSubmitSerializer,
        responses={
            200: OpenApiResponse(description='评分成功'),
            400: OpenApiResponse(description='参数错误'),
            404: OpenApiResponse(description='任务或答案不存在'),
        },
        tags=['阅卷中心']
    )
    def post(self, request, pk):
        task = self.service.get_task_by_id(pk)
        self.service.check_task_read_permission(task, request.user)

        serializer = GradingSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        if not task.task_quizzes.filter(quiz_id=data['quiz_id']).exists():
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='试卷不属于该任务'
            )
        self._submit_grading(
            task=task,
            quiz_id=data['quiz_id'],
            question_id=data['question_id'],
            student_id=data['student_id'],
            score=data['score'],
            comments=data['comments'],
            grader=request.user
        )

        return success_response({'message': '评分成功'})

    def _submit_grading(self, task, quiz_id, question_id, student_id, score, comments, grader):
        """提交评分"""
        # 查找最新一次提交的答案记录
        answer = _get_latest_answers(task, question_id, quiz_id).filter(
            submission__task_assignment__assignee_id=student_id,
            submission__status__in=['GRADING', 'SUBMITTED', 'GRADED']
        ).order_by('-submission__submitted_at', '-submission_id').first()
        if not answer:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='未找到对应的答案记录'
            )

        # 验证分数范围
        if score < 0 or score > float(answer.question.score):
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'分数必须在 0 到 {answer.question.score} 之间'
            )

        # 执行评分
        answer.grade(grader=grader, score=score, comment=comments)
