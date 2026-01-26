"""
Task analytics views for admin preview.
Implements:
- Task analytics API
- Student executions API
"""
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse
from django.db.models import Sum

from core.responses import success_response, list_response
from apps.users.permissions import IsAdminOrMentorOrDeptManager
from core.base_view import BaseAPIView
from apps.tasks.models import KnowledgeLearningProgress
from apps.tasks.serializers import TaskAnalyticsSerializer, StudentExecutionSerializer
from apps.tasks.services import TaskService
from apps.submissions.models import Submission


class TaskAnalyticsView(BaseAPIView):
    """Task analytics endpoint for admin preview."""
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]
    service_class = TaskService

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
        self.service.check_task_read_permission(task)

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


class StudentExecutionsView(BaseAPIView):
    """Student executions endpoint for admin preview."""
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]
    service_class = TaskService

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
        self.service.check_task_read_permission(task)

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
