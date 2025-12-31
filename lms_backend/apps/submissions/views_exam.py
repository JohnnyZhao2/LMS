"""
Views for exam submission management.

Implements exam submission endpoints:
- Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8

Properties:
- Property 28: 考试时间窗口控制
- Property 29: 考试单次提交限制
- Property 30: 客观题自动评分
- Property 31: 主观题待评分状态
- Property 32: 纯客观题直接完成
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse

from core.exceptions import BusinessError, ErrorCodes

from .models import Submission
from .serializers import (
    SubmissionDetailSerializer,
    StartExamSerializer,
    SubmitExamSerializer,
    PracticeResultSerializer,
)


class StartExamView(APIView):
    """
    Start an exam session.
    
    Requirements:
    - 12.1: 学员查看考试任务详情时展示任务标题、介绍、题目数量、考试时长、及格分数、开始时间和截止时间
    - 12.2: 学员在考试时间窗口内进入考试时加载试卷并开始计时
    - 12.7: 学员已提交考试时禁止重新作答
    - 12.8: 当前时间不在考试时间窗口内时禁止进入考试
    
    Properties:
    - Property 28: 考试时间窗口控制
    - Property 29: 考试单次提交限制
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='开始考试',
        description='''
        开始考试。
        
        - 只能在考试时间窗口内进入（Property 28）
        - 每个考试只能提交一次（Property 29）
        - 如果已有进行中的考试，返回该考试记录
        
        Requirements: 12.1, 12.2, 12.7, 12.8
        ''',
        request=StartExamSerializer,
        responses={
            201: SubmissionDetailSerializer,
            200: SubmissionDetailSerializer,
            400: OpenApiResponse(description='参数错误或不在考试时间窗口内'),
            404: OpenApiResponse(description='任务不存在'),
        },
        tags=['考试答题']
    )
    def post(self, request):
        serializer = StartExamSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        submission = serializer.save()
        
        response_serializer = SubmissionDetailSerializer(submission)
        
        # Return 200 if returning existing submission, 201 if new
        if serializer.validated_data.get('in_progress_submission'):
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class SubmitExamView(APIView):
    """
    Submit an exam.
    
    Requirements:
    - 12.3: 考试时间到达时自动提交试卷
    - 12.4: 学员手动提交试卷时记录提交时间并进行客观题自动评分
    - 12.5: 试卷包含主观题时将考试状态设为"待评分"
    - 12.6: 试卷仅包含客观题时直接计算最终成绩并完成考试
    
    Properties:
    - Property 30: 客观题自动评分
    - Property 31: 主观题待评分状态
    - Property 32: 纯客观题直接完成
    """
    permission_classes = [IsAuthenticated]
    serializer_class = SubmissionDetailSerializer
    
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
        summary='提交考试',
        description='''
        提交考试答卷。
        
        - 客观题自动评分（Property 30）
        - 包含主观题时状态设为"待评分"（Property 31）
        - 纯客观题直接完成（Property 32）
        
        Requirements: 12.3, 12.4, 12.5, 12.6
        ''',
        responses={
            200: SubmissionDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            404: OpenApiResponse(description='答题记录不存在'),
        },
        tags=['考试答题']
    )
    def post(self, request, pk):
        submission = self.get_submission(pk, request.user)
        
        # Check submission is in progress
        if submission.status != 'IN_PROGRESS':
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='此答卷已提交'
            )
        
        # Submit the exam (is_practice=False)
        submission.submit(is_practice=False)
        
        # Refresh to get updated data
        submission.refresh_from_db()
        
        response_serializer = SubmissionDetailSerializer(submission)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class ExamResultView(APIView):
    """
    View exam result.
    
    Requirements:
    - 12.1: 展示考试结果
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
        summary='查看考试结果',
        description='''
        查看考试结果。
        
        - 只有已提交的考试才能查看结果
        - 包含答案、得分和解析
        ''',
        responses={
            200: SubmissionDetailSerializer,
            400: OpenApiResponse(description='考试尚未提交'),
            404: OpenApiResponse(description='答题记录不存在'),
        },
        tags=['考试答题']
    )
    def get(self, request, pk):
        submission = self.get_submission(pk, request.user)
        
        # Check submission is completed
        if submission.status == 'IN_PROGRESS':
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='考试尚未提交'
            )
        
        response_serializer = SubmissionDetailSerializer(submission)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
