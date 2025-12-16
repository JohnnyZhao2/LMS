"""
Views for submission management.

Implements submission endpoints for:
- Practice submissions (Requirements: 10.2, 10.3, 10.4, 10.5, 10.6, 10.7)
- Exam submissions (Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8)

Properties:
- Property 24: 练习允许多次提交
- Property 25: 练习任务自动完成
- Property 26: 已完成练习仍可继续
- Property 28: 考试时间窗口控制
- Property 29: 考试单次提交限制
- Property 30: 客观题自动评分
- Property 31: 主观题待评分状态
- Property 32: 纯客观题直接完成
"""
from django.db.models import Max, Count
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter

from core.exceptions import BusinessError, ErrorCodes
from apps.tasks.models import TaskAssignment, TaskQuiz

from .models import Submission, Answer
from .serializers import (
    SubmissionListSerializer,
    SubmissionDetailSerializer,
    StartPracticeSerializer,
    SaveAnswerSerializer,
    SubmitPracticeSerializer,
    PracticeResultSerializer,
    QuizPracticeHistorySerializer,
    StartExamSerializer,
    SubmitExamSerializer,
)


class StartPracticeView(APIView):
    """
    Start a practice session.
    
    Requirements:
    - 10.2: 学员开始练习时加载试卷题目并允许作答
    - 10.5: 学员可选择再次练习同一试卷
    
    Properties:
    - Property 24: 练习允许多次提交
    - Property 26: 已完成练习仍可继续
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='开始练习',
        description='''
        开始一次新的练习。
        
        - 练习任务可以多次提交（Property 24）
        - 即使任务已完成也可以继续练习（Property 26）
        
        Requirements: 10.2, 10.5
        ''',
        request=StartPracticeSerializer,
        responses={
            201: SubmissionDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            404: OpenApiResponse(description='任务或试卷不存在'),
        },
        tags=['练习答题']
    )
    def post(self, request):
        serializer = StartPracticeSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        submission = serializer.save()
        
        response_serializer = SubmissionDetailSerializer(submission)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class SaveAnswerView(APIView):
    """
    Save an answer during practice/exam.
    
    Requirements:
    - 10.2: 学员开始练习时允许作答
    """
    permission_classes = [IsAuthenticated]
    
    def get_submission(self, pk, user):
        """Get submission and verify ownership."""
        try:
            submission = Submission.objects.select_related(
                'task_assignment', 'quiz'
            ).get(pk=pk, user=user)
            return submission
        except Submission.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='答题记录不存在'
            )
    
    @extend_schema(
        summary='保存答案',
        description='''
        保存单个题目的答案。
        
        可以在答题过程中多次调用此接口保存答案。
        ''',
        request=SaveAnswerSerializer,
        responses={
            200: OpenApiResponse(description='保存成功'),
            400: OpenApiResponse(description='参数错误'),
            404: OpenApiResponse(description='答题记录不存在'),
        },
        tags=['练习答题', '考试答题']
    )
    def post(self, request, pk):
        submission = self.get_submission(pk, request.user)
        
        # Check submission is in progress
        if submission.status != 'IN_PROGRESS':
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='只能在答题中保存答案'
            )
        
        serializer = SaveAnswerSerializer(
            data=request.data,
            context={'request': request, 'submission': submission}
        )
        serializer.is_valid(raise_exception=True)
        answer = serializer.save()
        
        return Response({
            'message': '保存成功',
            'question_id': answer.question_id,
            'user_answer': answer.user_answer
        }, status=status.HTTP_200_OK)


class SubmitPracticeView(APIView):
    """
    Submit a practice session.
    
    Requirements:
    - 10.3: 学员提交练习答案时自动判分（客观题）并展示解析
    - 10.6: 学员至少完成一次所有试卷时将练习任务状态变为「已完成」
    
    Properties:
    - Property 25: 练习任务自动完成
    - Property 30: 客观题自动评分
    """
    permission_classes = [IsAuthenticated]
    serializer_class = PracticeResultSerializer
    
    def get_submission(self, pk, user):
        """Get submission and verify ownership."""
        try:
            submission = Submission.objects.select_related(
                'task_assignment__task', 'quiz'
            ).prefetch_related(
                'answers__question'
            ).get(pk=pk, user=user)
            return submission
        except Submission.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='答题记录不存在'
            )
    
    @extend_schema(
        summary='提交练习',
        description='''
        提交练习答卷。
        
        - 客观题自动评分（Property 30）
        - 当所有试卷都至少完成一次时，任务自动完成（Property 25）
        
        Requirements: 10.3, 10.6
        ''',
        responses={
            200: PracticeResultSerializer,
            400: OpenApiResponse(description='参数错误'),
            404: OpenApiResponse(description='答题记录不存在'),
        },
        tags=['练习答题']
    )
    def post(self, request, pk):
        submission = self.get_submission(pk, request.user)
        
        # Check it's a practice submission
        if not submission.is_practice:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='此接口仅支持练习任务'
            )
        
        # Check submission is in progress
        if submission.status != 'IN_PROGRESS':
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='此答卷已提交'
            )
        
        # Submit the practice
        submission.submit()
        
        # Refresh to get updated data
        submission.refresh_from_db()
        
        response_serializer = PracticeResultSerializer(submission)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class PracticeResultView(APIView):
    """
    View practice result.
    
    Requirements:
    - 10.4: 学员查看已完成的试卷子任务时展示最近成绩、最佳成绩和作答次数和题目解析
    """
    permission_classes = [IsAuthenticated]
    
    def get_submission(self, pk, user):
        """Get submission and verify ownership."""
        try:
            submission = Submission.objects.select_related(
                'task_assignment__task', 'quiz'
            ).prefetch_related(
                'answers__question'
            ).get(pk=pk, user=user)
            return submission
        except Submission.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='答题记录不存在'
            )
    
    @extend_schema(
        summary='查看练习结果',
        description='''
        查看练习结果，包括答案和解析。
        
        Requirements: 10.4
        ''',
        responses={
            200: PracticeResultSerializer,
            404: OpenApiResponse(description='答题记录不存在'),
        },
        tags=['练习答题']
    )
    def get(self, request, pk):
        submission = self.get_submission(pk, request.user)
        
        # Check submission is completed
        if submission.status == 'IN_PROGRESS':
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='答卷尚未提交'
            )
        
        response_serializer = PracticeResultSerializer(submission)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class PracticeHistoryView(APIView):
    """
    View practice history for a task.
    
    Requirements:
    - 10.4: 展示最近成绩、最佳成绩和作答次数
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='查看练习历史',
        description='''
        查看练习任务的历史记录，包括每个试卷的：
        - 作答次数
        - 最近成绩
        - 最佳成绩
        
        Requirements: 10.4
        ''',
        responses={
            200: QuizPracticeHistorySerializer(many=True),
            404: OpenApiResponse(description='任务不存在'),
        },
        tags=['练习答题']
    )
    def get(self, request, task_id):
        user = request.user
        
        # Check task assignment exists
        try:
            assignment = TaskAssignment.objects.select_related('task').get(
                task_id=task_id,
                assignee=user,
                task__is_deleted=False
            )
        except TaskAssignment.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='任务不存在或未分配给您'
            )
        
        # Check it's a practice task
        if assignment.task.task_type != 'PRACTICE':
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='此接口仅支持练习任务'
            )
        
        # Get all quizzes for this task
        task_quizzes = TaskQuiz.objects.filter(
            task=assignment.task
        ).select_related('quiz')
        
        result = []
        for tq in task_quizzes:
            quiz = tq.quiz
            
            # Get submissions for this quiz
            submissions = Submission.objects.filter(
                task_assignment=assignment,
                quiz=quiz,
                status__in=['SUBMITTED', 'GRADING', 'GRADED']
            )
            
            attempt_count = submissions.count()
            
            if attempt_count > 0:
                # Get latest submission
                latest = submissions.order_by('-submitted_at').first()
                # Get best submission
                best = submissions.order_by('-obtained_score').first()
                
                result.append({
                    'quiz_id': quiz.id,
                    'quiz_title': quiz.title,
                    'attempt_count': attempt_count,
                    'latest_score': latest.obtained_score if latest else None,
                    'best_score': best.obtained_score if best else None,
                    'latest_submission_id': latest.id if latest else None,
                    'best_submission_id': best.id if best else None,
                })
            else:
                result.append({
                    'quiz_id': quiz.id,
                    'quiz_title': quiz.title,
                    'attempt_count': 0,
                    'latest_score': None,
                    'best_score': None,
                    'latest_submission_id': None,
                    'best_submission_id': None,
                })
        
        serializer = QuizPracticeHistorySerializer(result, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class MySubmissionsView(APIView):
    """
    List current user's submissions.
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='我的答题记录',
        description='获取当前用户的所有答题记录',
        parameters=[
            OpenApiParameter(name='task_id', type=int, description='任务ID'),
            OpenApiParameter(name='status', type=str, description='状态'),
        ],
        responses={200: SubmissionListSerializer(many=True)},
        tags=['练习答题', '考试答题']
    )
    def get(self, request):
        queryset = Submission.objects.filter(
            user=request.user
        ).select_related(
            'quiz', 'task_assignment__task'
        ).order_by('-created_at')
        
        # Apply filters
        task_id = request.query_params.get('task_id')
        if task_id:
            queryset = queryset.filter(task_assignment__task_id=task_id)
        
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        serializer = SubmissionListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
