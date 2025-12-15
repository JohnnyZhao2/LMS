"""
Views for grading management.

Implements grading endpoints:
- Requirements: 13.1, 13.2, 13.3, 13.4, 13.5

Properties:
- Property 33: 评分完成状态转换
- Property 34: 未完成评分状态保持
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter

from core.exceptions import BusinessError, ErrorCodes
from apps.users.permissions import (
    IsMentorOrDeptManager,
    get_current_role,
)

from .models import Submission, Answer
from .serializers import (
    GradingListSerializer,
    GradingDetailSerializer,
    GradeAnswerSerializer,
)


class GradingListView(APIView):
    """
    List submissions pending grading.
    
    Requirements:
    - 13.1: 导师/室经理查看评分中心时展示所辖学员的待评分考试列表
    
    Properties:
    - Property 37: 导师数据范围限制
    - Property 38: 室经理数据范围限制
    """
    permission_classes = [IsAuthenticated, IsMentorOrDeptManager]
    
    @extend_schema(
        summary='待评分列表',
        description='''
        获取待评分的考试列表。
        
        - 导师只能看到名下学员的待评分考试
        - 室经理只能看到本室学员的待评分考试
        
        Requirements: 13.1
        ''',
        responses={200: GradingListSerializer(many=True)},
        tags=['评分管理']
    )
    def get(self, request):
        user = request.user
        current_role = get_current_role(user)
        
        # Base queryset: submissions in GRADING status
        queryset = Submission.objects.filter(
            status='GRADING'
        ).select_related(
            'quiz', 'user', 'task_assignment__task'
        )
        
        # Apply data scope filtering
        if current_role == 'ADMIN':
            # Admin can see all
            pass
        elif current_role == 'MENTOR':
            # Mentor can only see mentees' submissions
            queryset = queryset.filter(user__mentor=user)
        elif current_role == 'DEPT_MANAGER':
            # Dept manager can only see department members' submissions
            if user.department_id:
                queryset = queryset.filter(user__department_id=user.department_id)
            else:
                queryset = queryset.none()
        else:
            queryset = queryset.none()
        
        queryset = queryset.order_by('-submitted_at')
        serializer = GradingListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class GradingDetailView(APIView):
    """
    View submission details for grading.
    
    Requirements:
    - 13.2: 评分人查看待评分考试时展示学员答案和评分输入界面
    """
    permission_classes = [IsAuthenticated, IsMentorOrDeptManager]
    
    def get_submission(self, pk, user):
        """Get submission and verify access permission."""
        try:
            submission = Submission.objects.select_related(
                'quiz', 'user', 'task_assignment__task'
            ).prefetch_related(
                'answers__question', 'answers__graded_by'
            ).get(pk=pk)
        except Submission.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='答题记录不存在'
            )
        
        # Check access permission
        current_role = get_current_role(user)
        
        if current_role == 'ADMIN':
            return submission
        elif current_role == 'MENTOR':
            if submission.user.mentor != user:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='无权访问此答题记录'
                )
        elif current_role == 'DEPT_MANAGER':
            if submission.user.department_id != user.department_id:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='无权访问此答题记录'
                )
        else:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='无权访问此答题记录'
            )
        
        return submission
    
    @extend_schema(
        summary='待评分详情',
        description='''
        获取待评分考试的详细信息，包括学员答案。
        
        Requirements: 13.2
        ''',
        responses={
            200: GradingDetailSerializer,
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='答题记录不存在'),
        },
        tags=['评分管理']
    )
    def get(self, request, pk):
        submission = self.get_submission(pk, request.user)
        serializer = GradingDetailSerializer(submission)
        return Response(serializer.data, status=status.HTTP_200_OK)


class GradeAnswerView(APIView):
    """
    Grade a subjective answer.
    
    Requirements:
    - 13.3: 评分人提交主观题分数和评语时记录评分结果
    - 13.4: 所有主观题评分完成时计算最终成绩并将考试状态设为"已完成"
    - 13.5: 考试存在未评分的主观题时保持考试状态为"待评分"
    
    Properties:
    - Property 33: 评分完成状态转换
    - Property 34: 未完成评分状态保持
    """
    permission_classes = [IsAuthenticated, IsMentorOrDeptManager]
    
    def get_submission(self, pk, user):
        """Get submission and verify access permission."""
        try:
            submission = Submission.objects.select_related(
                'quiz', 'user', 'task_assignment__task'
            ).prefetch_related(
                'answers__question'
            ).get(pk=pk)
        except Submission.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='答题记录不存在'
            )
        
        # Check access permission
        current_role = get_current_role(user)
        
        if current_role == 'ADMIN':
            return submission
        elif current_role == 'MENTOR':
            if submission.user.mentor != user:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='无权评分此答题记录'
                )
        elif current_role == 'DEPT_MANAGER':
            if submission.user.department_id != user.department_id:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='无权评分此答题记录'
                )
        else:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='无权评分此答题记录'
            )
        
        return submission
    
    @extend_schema(
        summary='评分',
        description='''
        对主观题进行评分。
        
        - 记录评分结果和评语
        - 所有主观题评分完成后自动计算最终成绩（Property 33）
        - 存在未评分主观题时保持待评分状态（Property 34）
        
        Requirements: 13.3, 13.4, 13.5
        ''',
        request=GradeAnswerSerializer,
        responses={
            200: GradingDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='答题记录不存在'),
        },
        tags=['评分管理']
    )
    def post(self, request, pk):
        submission = self.get_submission(pk, request.user)
        
        # Check submission is in GRADING status
        if submission.status != 'GRADING':
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='此答卷不在待评分状态'
            )
        
        serializer = GradeAnswerSerializer(
            data=request.data,
            context={'request': request, 'submission': submission}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # Refresh submission to get updated data
        submission.refresh_from_db()
        
        response_serializer = GradingDetailSerializer(submission)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class BatchGradeView(APIView):
    """
    Batch grade multiple subjective answers.
    
    Requirements:
    - 13.3: 评分人提交主观题分数和评语时记录评分结果
    - 13.4: 所有主观题评分完成时计算最终成绩并将考试状态设为"已完成"
    """
    permission_classes = [IsAuthenticated, IsMentorOrDeptManager]
    
    def get_submission(self, pk, user):
        """Get submission and verify access permission."""
        try:
            submission = Submission.objects.select_related(
                'quiz', 'user', 'task_assignment__task'
            ).prefetch_related(
                'answers__question'
            ).get(pk=pk)
        except Submission.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='答题记录不存在'
            )
        
        # Check access permission
        current_role = get_current_role(user)
        
        if current_role == 'ADMIN':
            return submission
        elif current_role == 'MENTOR':
            if submission.user.mentor != user:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='无权评分此答题记录'
                )
        elif current_role == 'DEPT_MANAGER':
            if submission.user.department_id != user.department_id:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='无权评分此答题记录'
                )
        else:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='无权评分此答题记录'
            )
        
        return submission
    
    @extend_schema(
        summary='批量评分',
        description='''
        批量对多个主观题进行评分。
        
        请求体格式:
        ```json
        {
            "grades": [
                {"answer_id": 1, "score": 8.5, "comment": "回答较好"},
                {"answer_id": 2, "score": 5.0, "comment": "需要改进"}
            ]
        }
        ```
        
        Requirements: 13.3, 13.4
        ''',
        responses={
            200: GradingDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='答题记录不存在'),
        },
        tags=['评分管理']
    )
    def post(self, request, pk):
        submission = self.get_submission(pk, request.user)
        
        # Check submission is in GRADING status
        if submission.status != 'GRADING':
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='此答卷不在待评分状态'
            )
        
        grades = request.data.get('grades', [])
        if not grades:
            raise BusinessError(
                code=ErrorCodes.INVALID_PARAMS,
                message='请提供评分数据'
            )
        
        errors = []
        for grade_data in grades:
            serializer = GradeAnswerSerializer(
                data=grade_data,
                context={'request': request, 'submission': submission}
            )
            if serializer.is_valid():
                serializer.save()
            else:
                errors.append({
                    'answer_id': grade_data.get('answer_id'),
                    'errors': serializer.errors
                })
        
        if errors:
            return Response({
                'message': '部分评分失败',
                'errors': errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Refresh submission to get updated data
        submission.refresh_from_db()
        
        response_serializer = GradingDetailSerializer(submission)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
