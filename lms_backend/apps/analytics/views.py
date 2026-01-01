"""
Views for analytics module.

Implements:
- Student dashboard API (Requirements: 15.1, 15.2, 15.3)
- Mentor/Department manager dashboard API (Requirements: 19.1, 19.2, 19.3, 19.4)
- Team manager data board API (Requirements: 21.1, 21.2, 21.3)
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse

from core.exceptions import BusinessError, ErrorCodes
from apps.tasks.models import TaskAssignment
from apps.knowledge.models import Knowledge
from django.db.models import Sum
from .serializers import (
    StudentPendingTaskSerializer,
    LatestKnowledgeSerializer,
    StudentDashboardSerializer,
    MentorDashboardSerializer,
    MentorDashboardSummarySerializer,
    MentorStudentStatSerializer,
)


class StudentDashboardView(APIView):
    """
    Student dashboard API endpoint.
    
    GET /api/analytics/dashboard/student/
    
    Returns:
    - pending_tasks: List of pending tasks (learning/practice/exam)
    - latest_knowledge: List of latest knowledge documents
    - task_summary: Summary of task counts by status
    
    Requirements:
    - 15.1: 学员访问仪表盘时展示待办任务列表（学习/练习/考试）
    - 15.2: 学员访问仪表盘时展示最新发布的知识文档
    - 15.3: 学员点击待办任务时跳转到对应任务详情页
    """
    permission_classes = [IsAuthenticated]
    
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
        """
        Get student dashboard data.
        
        Query Parameters:
        - pending_limit: Maximum number of pending tasks to return (default: 10)
        - knowledge_limit: Maximum number of latest knowledge to return (default: 5)
        """
        user = request.user
        
        # Get query parameters
        pending_limit = int(request.query_params.get('pending_limit', 10))
        knowledge_limit = int(request.query_params.get('knowledge_limit', 5))
        
        # Get pending tasks (IN_PROGRESS status)
        # Requirements 15.1: 展示待办任务列表（学习/练习/考试）
        pending_tasks = TaskAssignment.objects.filter(
            assignee=user,
            status='IN_PROGRESS',
            task__is_deleted=False,
            task__is_closed=False
        ).select_related(
            'task', 'task__created_by'
        ).prefetch_related(
            'task__task_knowledge',
            'task__task_quizzes',
            'knowledge_progress'
        ).order_by('task__deadline')[:pending_limit]
        
        # Get latest knowledge documents
        # Requirements 15.2: 展示最新发布的知识文档
        latest_knowledge = Knowledge.objects.filter(
            is_deleted=False
        ).select_related(
            'created_by', 'updated_by'
        ).order_by('-created_at')[:knowledge_limit]
        
        # Calculate task summary
        task_summary = self._get_task_summary(user)
        
        # Serialize data
        pending_tasks_data = StudentPendingTaskSerializer(pending_tasks, many=True).data
        latest_knowledge_data = LatestKnowledgeSerializer(latest_knowledge, many=True).data
        
        return Response({
            'pending_tasks': pending_tasks_data,
            'latest_knowledge': latest_knowledge_data,
            'task_summary': task_summary
        })
    
    def _get_task_summary(self, user):
        """
        Get summary of task counts by status.
        
        Returns counts for:
        - pending: Tasks in progress
        - completed: Completed tasks
        - overdue: Overdue tasks
        - total: Total assigned tasks
        """
        base_query = TaskAssignment.objects.filter(
            assignee=user,
            task__is_deleted=False
        )
        
        pending_count = base_query.filter(
            status='IN_PROGRESS'
        ).count()
        
        completed_count = base_query.filter(
            status='COMPLETED'
        ).count()
        
        overdue_count = base_query.filter(
            status='OVERDUE'
        ).count()
        
        total_count = base_query.count()
        
        return {
            'pending': pending_count,
            'completed': completed_count,
            'overdue': overdue_count,
            'total': total_count
        }



# ============ Student Personal Center Views ============
# Requirements: 18.1, 18.2, 18.3, 18.4


class StudentProfileView(APIView):
    """
    Student personal center - profile endpoint.
    
    GET /api/analytics/personal-center/profile/
    
    Returns student's personal information.
    
    Requirements:
    - 18.1: 学员访问个人中心时展示姓名、团队、导师信息
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='获取学员个人信息',
        description='获取当前登录学员的个人信息，包括姓名、团队、导师等',
        responses={200: 'StudentProfileSerializer'},
        tags=['学员个人中心']
    )
    def get(self, request):
        """
        Get student's personal information.
        
        Requirements:
        - 18.1: 学员访问个人中心时展示姓名、团队、导师信息
        """
        from .serializers import StudentProfileSerializer
        
        user = request.user
        serializer = StudentProfileSerializer(user)
        return Response(serializer.data)


class StudentScoreHistoryView(APIView):
    """
    Student personal center - score history endpoint.
    
    GET /api/analytics/personal-center/scores/
    
    Returns student's historical score records from practice and exam tasks.
    
    Requirements:
    - 18.2: 学员查看历史成绩时展示练习和考试的成绩记录
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='获取学员历史成绩',
        description='获取当前登录学员的练习和考试历史成绩记录',
        parameters=[
            OpenApiParameter(
                name='status',
                type=str,
                description='状态筛选（SUBMITTED/GRADING/GRADED）'
            ),
            OpenApiParameter(
                name='page',
                type=int,
                description='页码（默认1）'
            ),
            OpenApiParameter(
                name='page_size',
                type=int,
                description='每页数量（默认20）'
            ),
        ],
        responses={200: 'StudentScoreRecordSerializer(many=True)'},
        tags=['学员个人中心']
    )
    def get(self, request):
        """
        Get student's historical score records.
        
        Requirements:
        - 18.2: 学员查看历史成绩时展示练习和考试的成绩记录
        """
        from apps.submissions.models import Submission
        from .serializers import StudentScoreRecordSerializer
        
        user = request.user
        
        # Base queryset: submissions by the current user for practice/exam tasks
        queryset = Submission.objects.filter(
            user=user,
            task_assignment__task__is_deleted=False,
            status__in=['SUBMITTED', 'GRADING', 'GRADED']
        ).select_related(
            'task_assignment__task',
            'quiz'
        ).order_by('-submitted_at', '-created_at')

        
        # Filter by status
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        start = (page - 1) * page_size
        end = start + page_size
        
        total_count = queryset.count()
        submissions = queryset[start:end]
        
        serializer = StudentScoreRecordSerializer(submissions, many=True)
        
        # Calculate summary statistics
        summary = self._get_score_summary(user)
        
        return Response({
            'results': serializer.data,
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size if total_count > 0 else 0,
            'summary': summary
        })
    
    def _get_score_summary(self, user):
        """Calculate score summary statistics."""
        from apps.submissions.models import Submission
        from django.db.models import Avg, Max, Count
        
        # Quiz statistics (formerly practice/exam)
        quiz_stats = Submission.objects.filter(
            user=user,
            task_assignment__task__is_deleted=False,
            status='GRADED'
        ).aggregate(
            total_count=Count('id'),
            avg_score=Avg('obtained_score'),
            max_score=Max('obtained_score')
        )
        
        # We consolidate all into 'practice' for now, leaving exam empty as type is removed
        return {
            'practice': {
                'total_count': quiz_stats['total_count'] or 0,
                'avg_score': float(quiz_stats['avg_score']) if quiz_stats['avg_score'] else None,
                'max_score': float(quiz_stats['max_score']) if quiz_stats['max_score'] else None,
            },
            'exam': {
                'total_count': 0,
                'avg_score': None,
                'max_score': None,
                'passed_count': 0,
            }
        }


class StudentWrongAnswersView(APIView):
    """
    Student personal center - wrong answers book endpoint.
    
    GET /api/analytics/personal-center/wrong-answers/
    
    Returns student's wrong answers from practice and exam tasks.
    
    Requirements:
    - 18.3: 学员查看错题本时展示练习和考试中答错的题目
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='获取学员错题本',
        description='获取当前登录学员在练习和考试中答错的题目',
        parameters=[
            OpenApiParameter(
                name='question_type',
                type=str,
                description='题目类型筛选（SINGLE_CHOICE/MULTIPLE_CHOICE/TRUE_FALSE/SHORT_ANSWER）'
            ),
            OpenApiParameter(
                name='page',
                type=int,
                description='页码（默认1）'
            ),
            OpenApiParameter(
                name='page_size',
                type=int,
                description='每页数量（默认20）'
            ),
        ],
        responses={200: 'WrongAnswerSerializer(many=True)'},
        tags=['学员个人中心']
    )
    def get(self, request):
        """
        Get student's wrong answers book.
        
        Requirements:
        - 18.3: 学员查看错题本时展示练习和考试中答错的题目
        """
        from apps.submissions.models import Answer
        from .serializers import WrongAnswerSerializer
        
        user = request.user
        
        # Base queryset: wrong answers by the current user
        queryset = Answer.objects.filter(
            submission__user=user,
            submission__task_assignment__task__is_deleted=False,
            submission__status__in=['SUBMITTED', 'GRADING', 'GRADED'],
            is_correct=False
        ).select_related(
            'submission__task_assignment__task',
            'submission__quiz',
            'question'
        ).order_by('-submission__submitted_at', '-created_at')

        
        # Filter by question type
        question_type = request.query_params.get('question_type')
        if question_type:
            queryset = queryset.filter(question__question_type=question_type)
        
        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        start = (page - 1) * page_size
        end = start + page_size
        
        total_count = queryset.count()
        wrong_answers = queryset[start:end]
        
        serializer = WrongAnswerSerializer(wrong_answers, many=True)
        
        # Calculate summary
        summary = self._get_wrong_answer_summary(user)
        
        return Response({
            'results': serializer.data,
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size if total_count > 0 else 0,
            'summary': summary
        })
    
    def _get_wrong_answer_summary(self, user):
        """Calculate wrong answer summary statistics."""
        from apps.submissions.models import Answer
        from django.db.models import Count
        
        # Count by question type
        by_type = Answer.objects.filter(
            submission__user=user,
            submission__task_assignment__task__is_deleted=False,
            submission__status__in=['SUBMITTED', 'GRADING', 'GRADED'],
            is_correct=False
        ).values('question__question_type').annotate(
            count=Count('id')
        )
        
        type_counts = {
            'SINGLE_CHOICE': 0,
            'MULTIPLE_CHOICE': 0,
            'TRUE_FALSE': 0,
            'SHORT_ANSWER': 0,
        }
        for item in by_type:
            q_type = item['question__question_type']
            if q_type in type_counts:
                type_counts[q_type] = item['count']
        
        total_count = sum(type_counts.values())
        
        return {
            'total_count': total_count,
            'by_type': type_counts
        }


class StudentScoreExportView(APIView):
    """
    Student personal center - score export endpoint.
    
    GET /api/analytics/personal-center/scores/export/
    
    Exports student's historical score records as CSV.
    
    Requirements:
    - 18.4: 学员导出记录时生成包含历史成绩的导出文件
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='导出学员历史成绩',
        description='导出当前登录学员的练习和考试历史成绩记录为CSV文件',
        parameters=[
            OpenApiParameter(
                name='task_type',
                type=str,
                description='任务类型筛选（PRACTICE/EXAM）'
            ),
        ],
        responses={200: OpenApiResponse(description='CSV文件')},
        tags=['学员个人中心']
    )
    def get(self, request):
        """
        Export student's historical score records as CSV.
        
        Requirements:
        - 18.4: 学员导出记录时生成包含历史成绩的导出文件
        """
        import csv
        from django.http import HttpResponse
        from apps.submissions.models import Submission
        
        user = request.user
        
        # Base queryset
        queryset = Submission.objects.filter(
            user=user,
            task_assignment__task__task_type__in=['PRACTICE', 'EXAM'],
            task_assignment__task__is_deleted=False,
            status__in=['SUBMITTED', 'GRADING', 'GRADED']
        ).select_related(
            'task_assignment__task',
            'quiz'
        ).order_by('-submitted_at', '-created_at')
        
        # Filter by task type
        task_type = request.query_params.get('task_type')
        if task_type:
            queryset = queryset.filter(task_assignment__task__task_type=task_type)
        
        # Create CSV response
        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = f'attachment; filename="score_history_{user.employee_id}.csv"'
        
        # Write BOM for Excel compatibility
        response.write('\ufeff')
        
        writer = csv.writer(response)
        
        # Write header
        writer.writerow([
            '任务名称', '任务类型', '试卷名称', '答题次数',
            '试卷总分', '获得分数', '状态', '是否及格', '提交时间'
        ])
        
        # Write data rows
        task_type_display = {'PRACTICE': '练习', 'EXAM': '考试'}
        status_display = {'SUBMITTED': '已提交', 'GRADING': '待评分', 'GRADED': '已评分'}
        
        for submission in queryset:
            task = submission.task_assignment.task
            
            # Determine if passed (for exam)
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



# ============ Mentor/Department Manager Dashboard Views ============
# Requirements: 19.1, 19.2, 19.3, 19.4


class MentorDashboardView(APIView):
    """
    Mentor/Department Manager dashboard API endpoint.
    
    GET /api/analytics/dashboard/mentor/
    
    Returns:
    - summary: Overall statistics for all students in scope
    - students: List of students with individual statistics
    - quick_links: Quick access links for common actions
    
    Requirements:
    - 19.1: 导师访问仪表盘时展示名下学员的完成率和平均分
    - 19.2: 室经理访问仪表盘时展示本室学员的完成率和平均分
    - 19.3: 用户访问仪表盘时展示待评分考试数量
    - 19.4: 用户访问仪表盘时提供新建任务、测试中心、抽查的快捷入口
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='获取导师/室经理仪表盘数据',
        description='获取导师或室经理的仪表盘数据，包括所辖学员的完成率、平均分和待评分考试数量',
        responses={
            200: OpenApiResponse(description='仪表盘数据'),
            403: OpenApiResponse(description='无权限访问')
        },
        tags=['导师/室经理仪表盘']
    )
    def get(self, request):
        """
        Get mentor/department manager dashboard data.
        
        Requirements:
        - 19.1: 导师访问仪表盘时展示名下学员的完成率和平均分
        - 19.2: 室经理访问仪表盘时展示本室学员的完成率和平均分
        - 19.3: 用户访问仪表盘时展示待评分考试数量
        - 19.4: 用户访问仪表盘时提供新建任务、测试中心、抽查的快捷入口
        """
        from apps.users.permissions import get_current_role, get_accessible_students
        from apps.submissions.models import Submission
        from django.db.models import Avg, Sum, Case, When, IntegerField, F
        
        user = request.user
        current_role = get_current_role(user)
        
        # Check permission - only mentors, department managers, and admins can access
        if current_role not in ['MENTOR', 'DEPT_MANAGER', 'ADMIN']:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有导师、室经理或管理员可以访问此仪表盘'
            )
        
        # Get accessible students based on role
        students = get_accessible_students(user, current_role)
        student_ids = list(students.values_list('id', flat=True))
        
        # Calculate summary statistics
        summary = self._calculate_summary(student_ids, user, current_role)
        
        # Calculate per-student statistics
        student_stats = self._calculate_student_stats(students)
        
        # Generate quick links
        quick_links = self._generate_quick_links(current_role)
        
        return Response({
            'summary': summary,
            'students': student_stats,
            'quick_links': quick_links,
            'current_role': current_role
        })
    
    def _calculate_summary(self, student_ids, user, current_role):
        """
        Calculate overall summary statistics for all students in scope.
        
        Requirements:
        - 19.1: 导师访问仪表盘时展示名下学员的完成率和平均分
        - 19.2: 室经理访问仪表盘时展示本室学员的完成率和平均分
        - 19.3: 用户访问仪表盘时展示待评分考试数量
        """
        from apps.submissions.models import Submission
        from django.db.models import Avg
        
        if not student_ids:
            return {
                'total_students': 0,
                'total_tasks': 0,
                'completed_tasks': 0,
                'in_progress_tasks': 0,
                'overdue_tasks': 0,
                'overall_completion_rate': 0.0,
                'overall_avg_score': None,
                'pending_grading_count': 0,
                'learning_tasks': {'total': 0, 'completed': 0, 'completion_rate': 0.0},
                'practice_tasks': {'total': 0, 'completed': 0, 'completion_rate': 0.0},
                'exam_tasks': {'total': 0, 'completed': 0, 'completion_rate': 0.0, 'avg_score': None}
            }
        
        # Get all task assignments for students in scope
        assignments = TaskAssignment.objects.filter(
            assignee_id__in=student_ids,
            task__is_deleted=False
        ).select_related('task')
        
        # Count by status
        total_tasks = assignments.count()
        completed_tasks = assignments.filter(status='COMPLETED').count()
        in_progress_tasks = assignments.filter(status='IN_PROGRESS').count()
        overdue_tasks = assignments.filter(status='OVERDUE').count()
        
        # Calculate completion rate
        overall_completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0.0
        
        # Calculate average score from graded submissions
        avg_score_result = Submission.objects.filter(
            user_id__in=student_ids,
            status='GRADED',
            task_assignment__task__is_deleted=False
        ).aggregate(avg_score=Avg('obtained_score'))
        overall_avg_score = float(avg_score_result['avg_score']) if avg_score_result['avg_score'] else None
        
        # Count pending grading submissions (Requirements 19.3)
        pending_grading_count = Submission.objects.filter(
            user_id__in=student_ids,
            status='GRADING',
            task_assignment__task__is_deleted=False
        ).count()
        
        # Task type breakdown - DEPRECATED: Returns placeholder data
        default_stats = {'total': 0, 'completed': 0, 'completion_rate': 0.0}
        
        return {
            'total_students': len(student_ids),
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'in_progress_tasks': in_progress_tasks,
            'overdue_tasks': overdue_tasks,
            'overall_completion_rate': round(overall_completion_rate, 1),
            'overall_avg_score': round(overall_avg_score, 2) if overall_avg_score else None,
            'pending_grading_count': pending_grading_count,
            'learning_tasks': default_stats,
            'practice_tasks': default_stats,
            'exam_tasks': {**default_stats, 'avg_score': None}
        }
    
    def _calculate_student_stats(self, students):
        """
        Calculate statistics for each student.
        
        Requirements:
        - 19.1: 导师访问仪表盘时展示名下学员的完成率和平均分
        - 19.2: 室经理访问仪表盘时展示本室学员的完成率和平均分
        """
        from apps.submissions.models import Submission
        from django.db.models import Avg, Count
        
        student_stats = []
        
        for student in students.select_related('department'):
            # Get task assignments for this student
            assignments = TaskAssignment.objects.filter(
                assignee=student,
                task__is_deleted=False
            )
            
            total_tasks = assignments.count()
            completed_tasks = assignments.filter(status='COMPLETED').count()
            in_progress_tasks = assignments.filter(status='IN_PROGRESS').count()
            overdue_tasks = assignments.filter(status='OVERDUE').count()
            completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0.0
            
            # Calculate average score
            avg_score_result = Submission.objects.filter(
                user=student,
                status='GRADED',
                task_assignment__task__is_deleted=False
            ).aggregate(avg_score=Avg('obtained_score'))
            avg_score = float(avg_score_result['avg_score']) if avg_score_result['avg_score'] else None
            
            # Exam statistics - DEPRECATED
            exam_count = 0
            exam_passed_count = 0
            exam_pass_rate = None
            
            student_stats.append({
                'id': student.id,
                'employee_id': student.employee_id,
                'username': student.username,
                'department_name': student.department.name if student.department else None,
                'total_tasks': total_tasks,
                'completed_tasks': completed_tasks,
                'in_progress_tasks': in_progress_tasks,
                'overdue_tasks': overdue_tasks,
                'completion_rate': round(completion_rate, 1),
                'avg_score': round(avg_score, 2) if avg_score else None,
                'exam_count': exam_count,
                'exam_passed_count': exam_passed_count,
                'exam_pass_rate': round(exam_pass_rate, 1) if exam_pass_rate is not None else None
            })
        
        return student_stats
    
    def _generate_quick_links(self, current_role):
        """
        Generate quick access links for common actions.
        
        Requirements:
        - 19.4: 用户访问仪表盘时提供新建任务、测试中心、抽查的快捷入口
        """
        return {
            'create_learning_task': '/tasks/learning/create',
            'create_practice_task': '/tasks/practice/create',
            'create_exam_task': '/tasks/exam/create',
            'test_center': '/test-center',
            'spot_checks': '/spot-checks',
            'grading_center': '/grading',
            'question_bank': '/questions',
            'quiz_management': '/quizzes'
        }



# ============ Team Manager Data Board Views ============
# Requirements: 21.1, 21.2, 21.3


class TeamManagerOverviewView(APIView):
    """
    Team Manager data board - overview endpoint.
    
    GET /api/analytics/team-overview/
    
    Returns cross-department statistics for team managers.
    
    Requirements:
    - 21.1: 团队经理访问数据看板时展示各室完成率与成绩对比
    - 21.3: 团队经理查看数据时仅提供只读访问，禁止任何修改操作
    
    Property 41: 团队经理只读访问
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='获取团队经理数据看板概览',
        description='获取各室完成率与成绩对比数据，仅团队经理可访问',
        responses={
            200: OpenApiResponse(description='数据看板概览'),
            403: OpenApiResponse(description='无权限访问')
        },
        tags=['团队经理数据看板']
    )
    def get(self, request):
        """
        Get team manager data board overview.
        
        Requirements:
        - 21.1: 团队经理访问数据看板时展示各室完成率与成绩对比
        - 21.3: 团队经理查看数据时仅提供只读访问
        """
        from apps.users.permissions import get_current_role
        from apps.users.models import User, Department
        from apps.submissions.models import Submission
        from django.db.models import Avg
        
        user = request.user
        current_role = get_current_role(user)
        
        # Check permission - only team managers and admins can access
        # Property 41: 团队经理只读访问
        if current_role not in ['TEAM_MANAGER', 'ADMIN']:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有团队经理或管理员可以访问此数据看板'
            )
        
        # Get all departments
        departments = Department.objects.all()
        
        # Calculate overall statistics
        overview = self._calculate_overview()
        
        # Calculate per-department statistics
        department_stats = self._calculate_department_stats(departments)
        
        # Get knowledge heat statistics
        knowledge_heat = self._get_knowledge_heat()
        
        return Response({
            'overview': overview,
            'departments': department_stats,
            'knowledge_heat': knowledge_heat,
            'current_role': current_role
        })
    
    def _calculate_overview(self):
        """
        Calculate overall statistics across all departments.
        
        Requirements:
        - 21.1: 团队经理访问数据看板时展示各室完成率与成绩对比
        """
        from apps.users.models import User, Department
        from apps.submissions.models import Submission
        from django.db.models import Avg
        
        # Count departments and students
        total_departments = Department.objects.count()
        total_students = User.objects.filter(is_active=True).count()
        
        # Get all task assignments
        assignments = TaskAssignment.objects.filter(
            task__is_deleted=False
        )
        
        total_tasks = assignments.count()
        completed_tasks = assignments.filter(status='COMPLETED').count()
        in_progress_tasks = assignments.filter(status='IN_PROGRESS').count()
        overdue_tasks = assignments.filter(status='OVERDUE').count()
        
        # Calculate completion rate
        overall_completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0.0
        
        # Calculate average score
        avg_score_result = Submission.objects.filter(
            status='GRADED',
            task_assignment__task__is_deleted=False
        ).aggregate(avg_score=Avg('obtained_score'))
        overall_avg_score = float(avg_score_result['avg_score']) if avg_score_result['avg_score'] else None
        
        # Task type breakdown
        learning_tasks = self._get_task_type_stats(assignments, 'LEARNING')
        practice_tasks = self._get_task_type_stats(assignments, 'PRACTICE')
        exam_tasks = self._get_exam_task_stats(assignments)
        
        return {
            'total_departments': total_departments,
            'total_students': total_students,
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'in_progress_tasks': in_progress_tasks,
            'overdue_tasks': overdue_tasks,
            'overall_completion_rate': round(overall_completion_rate, 1),
            'overall_avg_score': round(overall_avg_score, 2) if overall_avg_score else None,
            'learning_tasks': learning_tasks,
            'practice_tasks': practice_tasks,
            'exam_tasks': exam_tasks
        }
    
    def _get_task_type_stats(self, assignments, task_type):
        """Get statistics for a specific task type."""
        type_assignments = assignments.filter(task__task_type=task_type)
        total = type_assignments.count()
        completed = type_assignments.filter(status='COMPLETED').count()
        completion_rate = (completed / total * 100) if total > 0 else 0.0
        
        return {
            'total': total,
            'completed': completed,
            'completion_rate': round(completion_rate, 1)
        }
    
    def _get_exam_task_stats(self, assignments):
        """Get statistics for exam tasks including average score."""
        from apps.submissions.models import Submission
        from django.db.models import Avg
        
        exam_assignments = assignments.filter(task__task_type='EXAM')
        total = exam_assignments.count()
        completed = exam_assignments.filter(status='COMPLETED').count()
        completion_rate = (completed / total * 100) if total > 0 else 0.0
        
        # Calculate average exam score
        avg_score_result = Submission.objects.filter(
            task_assignment__task__task_type='EXAM',
            task_assignment__task__is_deleted=False,
            status='GRADED'
        ).aggregate(avg_score=Avg('obtained_score'))
        avg_score = float(avg_score_result['avg_score']) if avg_score_result['avg_score'] else None
        
        return {
            'total': total,
            'completed': completed,
            'completion_rate': round(completion_rate, 1),
            'avg_score': round(avg_score, 2) if avg_score else None
        }
    
    def _calculate_department_stats(self, departments):
        """
        Calculate statistics for each department.
        
        Requirements:
        - 21.1: 团队经理访问数据看板时展示各室完成率与成绩对比
        """
        from apps.users.models import User
        from apps.submissions.models import Submission
        from django.db.models import Avg
        
        department_stats = []
        
        for dept in departments:
            # Get students in this department
            students = User.objects.filter(department=dept, is_active=True)
            student_ids = list(students.values_list('id', flat=True))
            total_students = len(student_ids)
            
            if total_students == 0:
                department_stats.append({
                    'id': dept.id,
                    'name': dept.name,
                    'code': dept.code,
                    'total_students': 0,
                    'total_tasks': 0,
                    'completed_tasks': 0,
                    'in_progress_tasks': 0,
                    'overdue_tasks': 0,
                    'completion_rate': 0.0,
                    'avg_score': None,
                    'exam_count': 0,
                    'exam_passed_count': 0,
                    'exam_pass_rate': None
                })
                continue
            
            # Get task assignments for students in this department
            assignments = TaskAssignment.objects.filter(
                assignee_id__in=student_ids,
                task__is_deleted=False
            )
            
            total_tasks = assignments.count()
            completed_tasks = assignments.filter(status='COMPLETED').count()
            in_progress_tasks = assignments.filter(status='IN_PROGRESS').count()
            overdue_tasks = assignments.filter(status='OVERDUE').count()
            completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0.0
            
            # Calculate average score
            avg_score_result = Submission.objects.filter(
                user_id__in=student_ids,
                status='GRADED',
                task_assignment__task__is_deleted=False
            ).aggregate(avg_score=Avg('obtained_score'))
            avg_score = float(avg_score_result['avg_score']) if avg_score_result['avg_score'] else None
            
            # Exam statistics
            exam_submissions = Submission.objects.filter(
                user_id__in=student_ids,
                task_assignment__task__task_type='EXAM',
                task_assignment__task__is_deleted=False,
                status='GRADED'
            ).select_related('task_assignment__task')
            
            exam_count = exam_submissions.count()
            exam_passed_count = 0
            for submission in exam_submissions:
                if submission.obtained_score and submission.task_assignment.task.pass_score:
                    if submission.obtained_score >= submission.task_assignment.task.pass_score:
                        exam_passed_count += 1
            
            exam_pass_rate = (exam_passed_count / exam_count * 100) if exam_count > 0 else None
            
            department_stats.append({
                'id': dept.id,
                'name': dept.name,
                'code': dept.code,
                'total_students': total_students,
                'total_tasks': total_tasks,
                'completed_tasks': completed_tasks,
                'in_progress_tasks': in_progress_tasks,
                'overdue_tasks': overdue_tasks,
                'completion_rate': round(completion_rate, 1),
                'avg_score': round(avg_score, 2) if avg_score else None,
                'exam_count': exam_count,
                'exam_passed_count': exam_passed_count,
                'exam_pass_rate': round(exam_pass_rate, 1) if exam_pass_rate is not None else None
            })
        
        return department_stats
    
    def _get_knowledge_heat(self, limit=20):
        """
        Get knowledge heat statistics (most viewed knowledge documents).
        
        Requirements:
        - 21.2: 团队经理查看知识热度时展示知识文档的阅读统计
        """
        knowledge_list = Knowledge.objects.filter(
            is_deleted=False
        ).select_related(
            'created_by'
        ).order_by('-view_count')[:limit]
        
        heat_data = []
        for knowledge in knowledge_list:
            line_type = knowledge.line_type
            heat_data.append({
                'id': knowledge.id,
                'title': knowledge.title,
                'knowledge_type': knowledge.knowledge_type,
                'knowledge_type_display': knowledge.get_knowledge_type_display(),
                'line_type': line_type.id if line_type else None,
                'line_type_display': line_type.name if line_type else None,
                'system_tags': [tag.name for tag in knowledge.system_tags.all()],
                'view_count': knowledge.view_count,
                'created_by_name': knowledge.created_by.username if knowledge.created_by else None,
                'created_at': knowledge.created_at,
                'updated_at': knowledge.updated_at
            })
        
        return heat_data


class KnowledgeHeatView(APIView):
    """
    Team Manager data board - knowledge heat endpoint.
    
    GET /api/analytics/knowledge-heat/
    
    Returns knowledge document view statistics for team managers.
    
    Requirements:
    - 21.2: 团队经理查看知识热度时展示知识文档的阅读统计
    - 21.3: 团队经理查看数据时仅提供只读访问，禁止任何修改操作
    
    Property 41: 团队经理只读访问
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='获取知识热度统计',
        description='获取知识文档的阅读统计数据，仅团队经理可访问',
        parameters=[
            OpenApiParameter(
                name='limit',
                type=int,
                description='返回数量限制（默认20）'
            ),
            OpenApiParameter(
                name='knowledge_type',
                type=str,
                description='知识类型筛选（EMERGENCY/OTHER）'
            ),
            OpenApiParameter(
                name='category_id',
                type=int,
                description='分类ID筛选'
            ),
        ],
        responses={
            200: OpenApiResponse(description='知识热度统计'),
            403: OpenApiResponse(description='无权限访问')
        },
        tags=['团队经理数据看板']
    )
    def get(self, request):
        """
        Get knowledge heat statistics.
        
        Requirements:
        - 21.2: 团队经理查看知识热度时展示知识文档的阅读统计
        - 21.3: 团队经理查看数据时仅提供只读访问
        """
        from apps.users.permissions import get_current_role
        
        user = request.user
        current_role = get_current_role(user)
        
        # Check permission - only team managers and admins can access
        # Property 41: 团队经理只读访问
        if current_role not in ['TEAM_MANAGER', 'ADMIN']:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有团队经理或管理员可以访问此数据看板'
            )
        
        # Get query parameters
        limit = int(request.query_params.get('limit', 20))
        knowledge_type = request.query_params.get('knowledge_type')
        category_id = request.query_params.get('category_id')
        
        # Build queryset
        queryset = Knowledge.objects.filter(
            is_deleted=False
        ).select_related(
            'created_by'
        )
        
        # Filter by knowledge type
        if knowledge_type:
            queryset = queryset.filter(knowledge_type=knowledge_type)
        
        # Filter by category (deprecated, kept for backward compatibility)
        if category_id:
            # This filter is no longer meaningful without category system
            pass
        
        # Order by view count and limit
        queryset = queryset.order_by('-view_count')[:limit]
        
        # Build response data
        heat_data = []
        for knowledge in queryset:
            line_type = knowledge.line_type
            heat_data.append({
                'id': knowledge.id,
                'title': knowledge.title,
                'knowledge_type': knowledge.knowledge_type,
                'knowledge_type_display': knowledge.get_knowledge_type_display(),
                'line_type': line_type.id if line_type else None,
                'line_type_display': line_type.name if line_type else None,
                'system_tags': [tag.name for tag in knowledge.system_tags.all()],
                'view_count': knowledge.view_count,
                'created_by_name': knowledge.created_by.username if knowledge.created_by else None,
                'created_at': knowledge.created_at,
                'updated_at': knowledge.updated_at
            })
        
        # Calculate summary statistics
        total_views = Knowledge.objects.filter(is_deleted=False).aggregate(
            total=Sum('view_count')
        )['total'] or 0
        
        total_knowledge = Knowledge.objects.filter(is_deleted=False).count()
        
        return Response({
            'results': heat_data,
            'summary': {
                'total_knowledge': total_knowledge,
                'total_views': total_views,
                'avg_views': round(total_views / total_knowledge, 1) if total_knowledge > 0 else 0
            }
        })
