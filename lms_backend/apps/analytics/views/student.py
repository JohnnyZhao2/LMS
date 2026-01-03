"""
Student analytics views.

Implements:
- Student dashboard API (Requirements: 15.1, 15.2, 15.3)
- Student personal center (Requirements: 18.1, 18.2, 18.3, 18.4)
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Avg, Max
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse

from apps.tasks.models import TaskAssignment
from apps.knowledge.models import Knowledge
from apps.analytics.serializers import (
    StudentPendingTaskSerializer,
    LatestKnowledgeSerializer,
    StudentDashboardSerializer,
    StudentProfileSerializer,
    StudentScoreRecordSerializer,
    WrongAnswerSerializer,
)
from apps.analytics.services import StudentDashboardService, StudentProfileService


class StudentDashboardView(APIView):
    """
    学员仪表盘 API 端点
    
    GET /api/analytics/dashboard/student/
    
    Requirements:
    - 15.1: 学员访问仪表盘时展示待办任务列表（学习/练习/考试）
    - 15.2: 学员访问仪表盘时展示最新发布的知识文档
    - 15.3: 学员点击待办任务时跳转到对应任务详情页
    """
    permission_classes = [IsAuthenticated]
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = StudentDashboardService()
    
    @extend_schema(
        summary='获取学员仪表盘数据',
        description='获取学员仪表盘数据，包括待办任务、最新知识和任务统计',
        parameters=[
            OpenApiParameter(name='pending_limit', type=int, description='待办任务数量限制（默认10）'),
            OpenApiParameter(name='knowledge_limit', type=int, description='最新知识数量限制（默认5）'),
        ],
        responses={200: StudentDashboardSerializer},
        tags=['学员仪表盘']
    )
    def get(self, request):
        user = request.user
        
        pending_limit = int(request.query_params.get('pending_limit', 10))
        knowledge_limit = int(request.query_params.get('knowledge_limit', 5))
        
        # 调用 Service
        pending_tasks = self.service.get_pending_tasks(user, pending_limit)
        latest_knowledge = self.service.get_latest_knowledge(knowledge_limit)
        task_summary = self.service.get_task_summary(user)
        
        pending_tasks_data = StudentPendingTaskSerializer(pending_tasks, many=True).data
        latest_knowledge_data = LatestKnowledgeSerializer(latest_knowledge, many=True).data
        
        return Response({
            'pending_tasks': pending_tasks_data,
            'latest_knowledge': latest_knowledge_data,
            'task_summary': task_summary
        })


class StudentProfileView(APIView):
    """
    Student personal center - profile endpoint.
    
    Requirements:
    - 18.1: 学员访问个人中心时展示姓名、团队、导师信息
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='获取学员个人信息',
        description='获取当前登录学员的个人信息，包括姓名、团队、导师等',
        responses={200: StudentProfileSerializer},
        tags=['学员个人中心']
    )
    def get(self, request):
        serializer = StudentProfileSerializer(request.user)
        return Response(serializer.data)


class StudentScoreHistoryView(APIView):
    """
    学员个人中心 - 历史成绩端点
    
    Requirements:
    - 18.2: 学员查看历史成绩时展示练习和考试的成绩记录
    """
    permission_classes = [IsAuthenticated]
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = StudentProfileService()
    
    @extend_schema(
        summary='获取学员历史成绩',
        description='获取当前登录学员的练习和考试历史成绩记录',
        parameters=[
            OpenApiParameter(name='status', type=str, description='状态筛选（SUBMITTED/GRADING/GRADED）'),
            OpenApiParameter(name='page', type=int, description='页码（默认1）'),
            OpenApiParameter(name='page_size', type=int, description='每页数量（默认20）'),
        ],
        responses={200: StudentScoreRecordSerializer(many=True)},
        tags=['学员个人中心']
    )
    def get(self, request):
        user = request.user
        
        status_filter = request.query_params.get('status')
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        
        # 调用 Service
        result = self.service.get_score_history(
            user=user,
            status_filter=status_filter,
            page=page,
            page_size=page_size
        )
        
        serializer = StudentScoreRecordSerializer(result['submissions'], many=True)
        
        return Response({
            'results': serializer.data,
            'count': result['count'],
            'page': result['page'],
            'page_size': result['page_size'],
            'total_pages': result['total_pages'],
            'summary': result['summary']
        })


class StudentWrongAnswersView(APIView):
    """
    学员个人中心 - 错题本端点
    
    Requirements:
    - 18.3: 学员查看错题本时展示练习和考试中答错的题目
    """
    permission_classes = [IsAuthenticated]
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = StudentProfileService()
    
    @extend_schema(
        summary='获取学员错题本',
        description='获取当前登录学员在练习和考试中答错的题目',
        parameters=[
            OpenApiParameter(name='question_type', type=str, description='题目类型筛选'),
            OpenApiParameter(name='page', type=int, description='页码（默认1）'),
            OpenApiParameter(name='page_size', type=int, description='每页数量（默认20）'),
        ],
        responses={200: WrongAnswerSerializer(many=True)},
        tags=['学员个人中心']
    )
    def get(self, request):
        user = request.user
        
        question_type = request.query_params.get('question_type')
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        
        # 调用 Service
        result = self.service.get_wrong_answers(
            user=user,
            question_type=question_type,
            page=page,
            page_size=page_size
        )
        
        serializer = WrongAnswerSerializer(result['wrong_answers'], many=True)
        
        return Response({
            'results': serializer.data,
            'count': result['count'],
            'page': result['page'],
            'page_size': result['page_size'],
            'total_pages': result['total_pages'],
            'summary': result['summary']
        })


class StudentScoreExportView(APIView):
    """
    学员个人中心 - 成绩导出端点
    
    Requirements:
    - 18.4: 学员导出记录时生成包含历史成绩的导出文件
    """
    permission_classes = [IsAuthenticated]
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = StudentProfileService()
    
    @extend_schema(
        summary='导出学员历史成绩',
        description='导出当前登录学员的练习和考试历史成绩记录为CSV文件',
        parameters=[
            OpenApiParameter(name='task_type', type=str, description='任务类型筛选（PRACTICE/EXAM）'),
        ],
        responses={200: OpenApiResponse(description='CSV文件')},
        tags=['学员个人中心']
    )
    def get(self, request):
        import csv
        from django.http import HttpResponse
        from apps.submissions.repositories import SubmissionRepository
        
        user = request.user
        task_type = request.query_params.get('task_type')
        
        # 使用 Repository 获取数据
        submission_repo = SubmissionRepository()
        queryset = submission_repo.get_by_user_and_task(
            user_id=user.id,
            status=None,
            ordering='-submitted_at'
        ).filter(
            task_assignment__task__task_type__in=['PRACTICE', 'EXAM'],
            task_assignment__task__is_deleted=False,
            status__in=['SUBMITTED', 'GRADING', 'GRADED']
        ).select_related(
            'task_assignment__task',
            'quiz'
        )
        
        if task_type:
            queryset = queryset.filter(task_assignment__task__task_type=task_type)
        
        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = f'attachment; filename="score_history_{user.employee_id}.csv"'
        response.write('\ufeff')
        
        writer = csv.writer(response)
        writer.writerow([
            '任务名称', '任务类型', '试卷名称', '答题次数',
            '试卷总分', '获得分数', '状态', '是否及格', '提交时间'
        ])
        
        task_type_display = {'PRACTICE': '练习', 'EXAM': '考试'}
        status_display = {'SUBMITTED': '已提交', 'GRADING': '待评分', 'GRADED': '已评分'}
        
        for submission in queryset:
            task = submission.task_assignment.task
            
            is_passed = ''
            if task.task_type == 'EXAM' and submission.obtained_score is not None:
                if task.pass_score:
                    is_passed = '是' if submission.obtained_score >= task.pass_score else '否'
            
            writer.writerow([
                task.title,
                task_type_display.get(task.task_type, task.task_type),
                submission.quiz.title,
                submission.attempt_number,
                submission.total_score,
                submission.obtained_score if submission.obtained_score is not None else '',
                status_display.get(submission.status, submission.status),
                is_passed,
                submission.submitted_at.strftime('%Y-%m-%d %H:%M:%S') if submission.submitted_at else ''
            ])
        
        return response
