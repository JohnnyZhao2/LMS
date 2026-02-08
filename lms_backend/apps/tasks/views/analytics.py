"""
Task analytics views for admin preview.
Implements:
- Task analytics API
- Student executions API
"""
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from apps.tasks.selectors import (
    analytics_assignment_queryset,
    task_exam_highest_scores,
    task_exam_submissions_queryset,
    task_knowledge_completion_counts,
    task_knowledge_queryset,
    task_quiz_completion_counts,
    task_quiz_queryset,
    task_submission_score_totals,
)
from apps.tasks.serializers import StudentExecutionSerializer, TaskAnalyticsSerializer
from apps.tasks.task_service import TaskService
from apps.users.permissions import IsAdminOrMentorOrDeptManager
from core.base_view import BaseAPIView
from core.responses import list_response, success_response


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
        assignments = analytics_assignment_queryset(task_id=task.id)
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
            score_totals = task_submission_score_totals(task.id)
            total_score = score_totals['total_score']
            obtained_score = score_totals['obtained_score']
            if score_totals['submission_count'] > 0 and total_score > 0:
                accuracy_percentage = round(float(obtained_score) / float(total_score) * 100, 1)

        # 计算异常人数
        abnormal_count = self._count_abnormal(assignments)

        # 计算节点进度
        node_progress = self._compute_node_progress(task.id, total_count)

        # 计算时间分布
        time_distribution = self._compute_time_distribution(completed_assignments)

        # 计算分数分布和通过率
        score_distribution = None
        pass_rate = None
        if has_quiz:
            score_distribution = self._compute_score_distribution(task.id)
            pass_rate = self._compute_pass_rate(task.id)

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

    def _count_abnormal(self, assignments):
        """
        计算异常人数
        异常规则：
        - 文章阅读时长 < 5分钟
        - 测验完成时长 < 5分钟
        - 考试完成时长 < 30分钟
        """
        abnormal_ids = set()

        for assignment in assignments.filter(status='COMPLETED'):
            # 检查知识学习时长（使用预加载的 knowledge_progress）
            for progress in assignment.knowledge_progress.all():
                if not progress.is_completed:
                    continue
                if progress.completed_at and progress.created_at:
                    duration = (progress.completed_at - progress.created_at).total_seconds() / 60
                    if duration < 5:
                        abnormal_ids.add(assignment.assignee_id)
                        break

            # 检查测验/考试时长（使用预加载的 submissions）
            for sub in assignment.submissions.all():
                if sub.submitted_at and sub.started_at:
                    duration = (sub.submitted_at - sub.started_at).total_seconds() / 60
                    is_exam = sub.quiz.quiz_type == 'EXAM'
                    threshold = 30 if is_exam else 5
                    if duration < threshold:
                        abnormal_ids.add(assignment.assignee_id)
                        break

        return len(abnormal_ids)

    def _compute_node_progress(self, task_id, total_count):
        """计算各节点完成进度"""
        nodes = []
        knowledge_counts = task_knowledge_completion_counts(task_id)
        quiz_counts = task_quiz_completion_counts(task_id)

        # 知识节点
        for tk in task_knowledge_queryset(task_id):
            completed = knowledge_counts.get(tk.id, 0)
            nodes.append({
                'node_id': tk.id,
                'node_name': tk.knowledge.title,
                'category': 'KNOWLEDGE',
                'completed_count': completed,
                'total_count': total_count,
                'percentage': round(completed / total_count * 100, 1) if total_count > 0 else 0,
            })

        # 试卷节点
        for tq in task_quiz_queryset(task_id):
            completed = quiz_counts.get(tq.quiz_id, 0)
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

    def _compute_score_distribution(self, task_id):
        """计算分数分布（仅考试，按实际分数统计）"""
        ranges = [
            ('0-60', 0, 60),
            ('60-70', 60, 70),
            ('70-80', 70, 80),
            ('80-90', 80, 90),
            ('90-100', 90, 101),
        ]
        distribution = {r[0]: 0 for r in ranges}

        # 获取达到最高分的那些提交记录，并按实际分数统计
        for max_score in task_exam_highest_scores(task_id):
            score = float(max_score)  # 直接使用实际分数，不计算百分比
            for label, min_val, max_val in ranges:
                if min_val <= score < max_val:
                    distribution[label] += 1
                    break

        return [{'range': k, 'count': v} for k, v in distribution.items()]

    def _compute_pass_rate(self, task_id):
        """计算通过率（仅考试任务）"""
        # 1. 首先检查任务是否包含考试类型的试卷
        has_exam = task_quiz_queryset(task_id).filter(quiz__quiz_type='EXAM').exists()
        if not has_exam:
            return None

        # 2. 获取所有已完成的考试提交
        exam_submissions = task_exam_submissions_queryset(task_id)

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
        assignments = analytics_assignment_queryset(task_id=task.id, order_desc=True)
        total_nodes = task_knowledge_queryset(task.id).count() + task_quiz_queryset(task.id).count()
        results = []
        now = timezone.now()

        for assignment in assignments:
            # 计算完成节点数（使用预加载的数据）
            completed_knowledge = sum(
                1 for p in assignment.knowledge_progress.all() if p.is_completed
            )
            completed_quiz_ids = set(
                sub.quiz_id for sub in assignment.submissions.all()
            )
            completed_nodes = completed_knowledge + len(completed_quiz_ids)

            # 计算用时
            time_spent = 0
            if assignment.completed_at and assignment.created_at:
                time_spent = int((assignment.completed_at - assignment.created_at).total_seconds() / 60)

            # 获取分数（只显示考试分数，使用预加载的数据）
            score = None
            exam_submissions = [
                sub for sub in assignment.submissions.all()
                if sub.quiz.quiz_type == 'EXAM' and sub.obtained_score is not None
            ]
            if exam_submissions:
                best_submission = max(exam_submissions, key=lambda s: s.obtained_score)
                score = float(best_submission.obtained_score)

            # 检查是否异常（使用预加载的数据）
            is_abnormal = self._check_abnormal_from_prefetched(assignment)

            # 确定状态
            status = assignment.status
            if status != 'COMPLETED' and assignment.task.deadline < now:
                status = 'OVERDUE'
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

    def _check_abnormal_from_prefetched(self, assignment):
        """检查学员是否异常（使用预加载的数据）"""
        # 检查知识学习时长
        for progress in assignment.knowledge_progress.all():
            if not progress.is_completed:
                continue
            if progress.completed_at and progress.created_at:
                duration = (progress.completed_at - progress.created_at).total_seconds() / 60
                if duration < 5:
                    return True

        # 检查测验/考试时长
        for sub in assignment.submissions.all():
            if sub.submitted_at and sub.started_at:
                duration = (sub.submitted_at - sub.started_at).total_seconds() / 60
                is_exam = sub.quiz.quiz_type == 'EXAM'
                threshold = 30 if is_exam else 5
                if duration < threshold:
                    return True

        return False
