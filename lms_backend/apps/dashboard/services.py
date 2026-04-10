"""
Dashboard 应用服务
提供业务逻辑：
- 仪表盘统计计算
- 学员进度跟踪
- 部门/团队分析
- 知识热度统计
"""
from typing import Any, Dict, List, Optional, Set

from django.db.models import Case, IntegerField, QuerySet, Value, When

from apps.knowledge.models import Knowledge
from apps.authorization.engine import scope_filter
from core.base_service import BaseService
from apps.users.models import Department, User

from .selectors import (
    calculate_average_completion_rate_by_students,
    calculate_avg_score,
    calculate_task_stats,
    get_assignments_by_students,
    get_latest_knowledge,
    get_monthly_active_user_ids,
    get_monthly_spot_check_stats,
    get_monthly_spot_check_stats_by_student,
    get_monthly_tasks_count,
    get_pending_grading_count,
    get_score_distribution,
    get_student_dashboard_metrics,
    get_student_all_tasks,
    get_student_assignments,
    get_student_exam_avg_score,
    get_task_participants_progress,
    get_urgent_tasks_count,
    get_weekly_active_users_count,
)

MENTOR_DASHBOARD_SCOPE_PERMISSION_CODE = 'task.analytics.view'
TEAM_MANAGER_DASHBOARD_SCOPE_PERMISSION_CODE = 'dashboard.team_manager.view'


class StudentDashboardService(BaseService):
    """
    学员仪表盘服务
    处理：
    - 统计数据获取
    - 任务列表获取
    - 最新知识获取
    - 同伴排名获取
    """

    def get_dashboard_data(
        self,
        user: User,
        task_limit: int = 10,
        knowledge_limit: int = 6
    ) -> Dict[str, Any]:
        """
        获取学员仪表盘完整数据
        """
        stats = self.get_stats(user)
        tasks = get_student_all_tasks(user.id, limit=task_limit)
        latest_knowledge = get_latest_knowledge(limit=knowledge_limit)

        return {
            'stats': stats,
            'tasks': tasks,
            'latest_knowledge': latest_knowledge,
        }

    def get_task_participants(
        self,
        user: User,
        task_id: int
    ) -> List[Dict[str, Any]]:
        """
        获取任务参与者进度
        """
        return get_task_participants_progress(task_id, user.id)

    def get_stats(self, user: User) -> Dict[str, Any]:
        """
        获取学员统计数据
        """
        assignments = get_student_assignments(user_id=user.id)
        task_stats = calculate_task_stats(assignments)
        urgent_count = get_urgent_tasks_count(user.id)
        exam_avg_score = get_student_exam_avg_score(user.id)

        return {
            'in_progress_count': task_stats['in_progress_tasks'],
            'urgent_count': urgent_count,
            'completion_rate': task_stats['completion_rate'],
            'exam_avg_score': round(exam_avg_score, 1) if exam_avg_score is not None else None,
            'total_tasks': task_stats['total_tasks'],
            'completed_count': task_stats['completed_tasks'],
            'overdue_count': task_stats['overdue_tasks']
        }



class MentorDashboardService(BaseService):
    """
    导师/室经理仪表盘服务
    处理：
    - 可访问学员的摘要统计
    - 单个学员统计
    """
    def get_dashboard_data(self) -> Dict[str, Any]:
        """
        获取导师/室经理的完整仪表盘数据
        """
        students = scope_filter(
            MENTOR_DASHBOARD_SCOPE_PERMISSION_CODE,
            self.request,
            resource_model=User,
        )
        student_ids = list(students.values_list('id', flat=True))
        monthly_active_ids = get_monthly_active_user_ids(student_ids)
        spot_check_map = get_monthly_spot_check_stats_by_student(student_ids)
        summary = self._calculate_summary(student_ids)
        student_stats = self._calculate_student_stats(
            students=students,
            monthly_active_ids=monthly_active_ids,
            spot_check_map=spot_check_map
        )
        pending_grading_count = get_pending_grading_count(student_ids)
        spot_check_stats = get_monthly_spot_check_stats(student_ids)
        score_distribution = get_score_distribution(student_ids)
        return {
            'summary': summary,
            'students': student_stats,
            'pending_grading': {
                'count': pending_grading_count
            },
            'spot_check_stats': spot_check_stats,
            'score_distribution': score_distribution
        }

    def _calculate_summary(
        self,
        student_ids: List[int]
    ) -> Dict[str, Any]:
        """计算总体摘要统计"""
        monthly_tasks = get_monthly_tasks_count()
        if not student_ids:
            return {
                'total_students': 0,
                'weekly_active_users': 0,
                'monthly_tasks': monthly_tasks,
                'total_tasks': 0,
                'completed_tasks': 0,
                'in_progress_tasks': 0,
                'overdue_tasks': 0,
                'overall_completion_rate': 0.0,
                'overall_avg_score': None,
                'learning_tasks': {'total': 0, 'completed': 0, 'completion_rate': 0.0},
                'practice_tasks': {'total': 0, 'completed': 0, 'completion_rate': 0.0},
                'exam_tasks': {'total': 0, 'completed': 0, 'completion_rate': 0.0, 'avg_score': None}
            }
        assignments = get_assignments_by_students(student_ids=student_ids)
        stats = calculate_task_stats(assignments)
        overall_avg_score = calculate_avg_score(student_ids=student_ids)
        weekly_active_users = get_weekly_active_users_count(user_ids=student_ids)
        default_stats = {'total': 0, 'completed': 0, 'completion_rate': 0.0}
        return {
            'total_students': len(student_ids),
            'weekly_active_users': weekly_active_users,
            'monthly_tasks': monthly_tasks,
            'total_tasks': stats['total_tasks'],
            'completed_tasks': stats['completed_tasks'],
            'in_progress_tasks': stats['in_progress_tasks'],
            'overdue_tasks': stats['overdue_tasks'],
            'overall_completion_rate': round(stats['completion_rate'], 1),
            'overall_avg_score': round(overall_avg_score, 2) if overall_avg_score is not None else None,
            'learning_tasks': default_stats,
            'practice_tasks': default_stats,
            'exam_tasks': {**default_stats, 'avg_score': None}
        }

    def _calculate_student_stats(
        self,
        students: QuerySet,
        monthly_active_ids: Set[int],
        spot_check_map: Dict[int, Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """计算每个学员的统计"""
        student_ids = list(students.values_list('id', flat=True))
        student_metrics_map = get_student_dashboard_metrics(student_ids)
        student_stats = []
        for student in students.select_related('department'):
            metrics = student_metrics_map.get(
                student.id,
                {
                    'total_tasks': 0,
                    'completed_tasks': 0,
                    'in_progress_tasks': 0,
                    'overdue_tasks': 0,
                    'completion_rate': 0.0,
                    'avg_score': None,
                }
            )
            avg_score = metrics['avg_score']
            total_tasks = metrics['total_tasks']
            overdue_rate = (metrics['overdue_tasks'] / total_tasks * 100) if total_tasks > 0 else 0.0
            spot_check_info = spot_check_map.get(student.id, {'count': 0, 'avg_score': None})
            monthly_active = student.id in monthly_active_ids
            student_stats.append({
                'id': student.id,
                'employee_id': student.employee_id or '',
                'username': student.username,
                'department_name': student.department.name if student.department else None,
                'total_tasks': metrics['total_tasks'],
                'completed_tasks': metrics['completed_tasks'],
                'in_progress_tasks': metrics['in_progress_tasks'],
                'overdue_tasks': metrics['overdue_tasks'],
                'completion_rate': metrics['completion_rate'],
                'overdue_rate': round(overdue_rate, 1),
                'avg_score': round(avg_score, 2) if avg_score is not None else None,
                'exam_count': 0,
                'exam_passed_count': 0,
                'exam_pass_rate': None,
                'monthly_active': monthly_active,
                'spot_check_count_month': spot_check_info['count'],
                'spot_check_avg_score_month': spot_check_info['avg_score'],
                'radar_metrics': {
                    'completion_rate': metrics['completion_rate'],
                    'overdue_rate': round(overdue_rate, 1),
                    'avg_score': round(avg_score, 2) if avg_score is not None else 0,
                    'monthly_active': 100 if monthly_active else 0,
                    'spot_check_avg_score': spot_check_info['avg_score'] or 0,
                }
            })
        return student_stats


class TeamManagerDashboardService(BaseService):
    """
    团队经理仪表盘服务
    处理：
    - 核心摘要（学员/导师/平台知识）
    - 团队数据对比（一室 vs 二室）
    - 部门-学员层级视图
    """

    def get_dashboard_data(self) -> Dict[str, Any]:
        """
        获取团队经理的完整仪表盘数据
        """
        students = scope_filter(
            TEAM_MANAGER_DASHBOARD_SCOPE_PERMISSION_CODE,
            self.request,
            resource_model=User,
        )
        student_ids = list(students.values_list('id', flat=True))
        mentors = User.objects.filter(
            is_active=True,
            roles__code='MENTOR'
        ).exclude(
            is_superuser=True
        ).exclude(
            roles__code='DEPT_MANAGER'
        ).distinct().count()
        platform_knowledge_count = Knowledge.objects.filter(is_current=True).count()

        return {
            'summary': {
                'total_students': len(student_ids),
                'total_mentors': mentors,
                'total_knowledge': platform_knowledge_count,
            },
            'department_comparison': self._build_department_comparison(students),
            'department_student_view': self._build_department_student_view(students),
        }

    def _build_comparison_metrics(
        self,
        student_ids: List[int],
        mentor_count: int
    ) -> Dict[str, Any]:
        """构建对比指标"""
        if not student_ids:
            return {
                'student_count': 0,
                'mentor_count': mentor_count,
                'avg_completion_rate': 0.0,
                'avg_score': None,
                'weekly_active_users': 0,
                'weekly_active_rate': 0.0,
            }

        avg_completion_rate = calculate_average_completion_rate_by_students(student_ids)
        avg_score = calculate_avg_score(student_ids=student_ids)
        weekly_active_users = get_weekly_active_users_count(user_ids=student_ids)
        weekly_active_rate = round((weekly_active_users / len(student_ids)) * 100, 1)

        return {
            'student_count': len(student_ids),
            'mentor_count': mentor_count,
            'avg_completion_rate': avg_completion_rate,
            'avg_score': round(avg_score, 1) if avg_score is not None else None,
            'weekly_active_users': weekly_active_users,
            'weekly_active_rate': weekly_active_rate,
        }

    def _get_department_mentor_count(self, department_id: Optional[int]) -> int:
        """获取部门导师数量"""
        if department_id is None:
            return 0
        return User.objects.filter(
            is_active=True,
            department_id=department_id,
            roles__code='MENTOR'
        ).exclude(
            is_superuser=True
        ).exclude(
            roles__code='DEPT_MANAGER'
        ).distinct().count()

    def _build_department_metric(
        self,
        students: QuerySet,
        department: Optional[Department]
    ) -> Dict[str, Any]:
        """构建单个部门指标"""
        if not department:
            base_metrics = self._build_comparison_metrics(student_ids=[], mentor_count=0)
            return {
                'department_id': None,
                'department_name': '未设置部门',
                **base_metrics,
            }

        student_ids = list(students.filter(department_id=department.id).values_list('id', flat=True))
        mentor_count = self._get_department_mentor_count(department.id)
        base_metrics = self._build_comparison_metrics(student_ids=student_ids, mentor_count=mentor_count)
        return {
            'department_id': department.id,
            'department_name': department.name,
            **base_metrics,
        }

    def _get_comparison_departments(self, students: QuerySet) -> List[Department]:
        """获取对比用部门：优先一室/二室，不足则回退到现有部门"""
        preferred_departments = list(
            Department.objects.filter(name__in=['一室', '二室']).order_by(
                Case(
                    When(name='一室', then=Value(0)),
                    When(name='二室', then=Value(1)),
                    default=Value(99),
                    output_field=IntegerField(),
                ),
                'id'
            )[:2]
        )

        if len(preferred_departments) == 2:
            return preferred_departments

        fallback_department_ids = list(
            students.exclude(department_id__isnull=True)
            .values_list('department_id', flat=True)
            .distinct()
        )
        fallback_departments = list(
            Department.objects.filter(id__in=fallback_department_ids).order_by('code', 'id')[:2]
        )

        merged_departments: List[Department] = []
        seen_department_ids: set[int] = set()

        for department in preferred_departments + fallback_departments:
            if department.id in seen_department_ids:
                continue
            seen_department_ids.add(department.id)
            merged_departments.append(department)
            if len(merged_departments) == 2:
                break

        return merged_departments

    @staticmethod
    def _build_department_gap(
        left_department: Dict[str, Any],
        right_department: Dict[str, Any]
    ) -> Dict[str, Any]:
        """构建部门差值指标（左侧 - 右侧）"""
        avg_score_gap = None
        if (
            left_department['avg_score'] is not None and
            right_department['avg_score'] is not None
        ):
            avg_score_gap = round(
                left_department['avg_score'] - right_department['avg_score'],
                1
            )

        return {
            'student_count': left_department['student_count'] - right_department['student_count'],
            'mentor_count': left_department['mentor_count'] - right_department['mentor_count'],
            'completion_rate': round(left_department['avg_completion_rate'] - right_department['avg_completion_rate'], 1),
            'avg_score': avg_score_gap,
            'weekly_active_rate': round(left_department['weekly_active_rate'] - right_department['weekly_active_rate'], 1),
        }

    def _build_department_comparison(self, students: QuerySet) -> Dict[str, Any]:
        """构建部门对比（一室 vs 二室）"""
        departments = self._get_comparison_departments(students)
        left_department = self._build_department_metric(students, departments[0] if len(departments) > 0 else None)
        right_department = self._build_department_metric(students, departments[1] if len(departments) > 1 else None)

        return {
            'left_department': left_department,
            'right_department': right_department,
            'gap': self._build_department_gap(left_department, right_department),
        }

    @staticmethod
    def _build_student_metrics_map(student_ids: List[int]) -> Dict[int, Dict[str, Any]]:
        """批量构建学员指标映射（完成率 + 平均分）"""
        dashboard_metrics_map = get_student_dashboard_metrics(student_ids)
        return {
            student_id: {
                'completion_rate': metrics['completion_rate'],
                'avg_score': (
                    round(metrics['avg_score'], 1)
                    if metrics['avg_score'] is not None
                    else None
                ),
            }
            for student_id, metrics in dashboard_metrics_map.items()
        }

    def _build_department_student_view(
        self,
        students: QuerySet
    ) -> List[Dict[str, Any]]:
        """构建部门-学员层级视图"""
        department_ids = list(
            students.exclude(department_id__isnull=True).values_list('department_id', flat=True).distinct()
        )
        if not department_ids:
            return []

        departments = Department.objects.filter(id__in=department_ids).order_by('code', 'id')
        all_student_ids = list(students.values_list('id', flat=True))
        student_metrics_map = self._build_student_metrics_map(all_student_ids)

        view_data: List[Dict[str, Any]] = []
        for department in departments:
            department_students = list(
                students.filter(department_id=department.id).select_related('mentor').order_by('employee_id')
            )
            department_student_ids = [student.id for student in department_students]
            mentor_count = self._get_department_mentor_count(department.id)
            department_metrics = self._build_comparison_metrics(
                student_ids=department_student_ids,
                mentor_count=mentor_count
            )

            students_data: List[Dict[str, Any]] = []
            at_risk_students = 0
            for student in department_students:
                student_metrics = student_metrics_map.get(
                    student.id,
                    {'completion_rate': 0.0, 'avg_score': None}
                )
                is_at_risk = (
                    student_metrics['completion_rate'] < 60 or
                    (
                        student_metrics['avg_score'] is not None and
                        student_metrics['avg_score'] < 60
                    )
                )
                if is_at_risk:
                    at_risk_students += 1

                students_data.append({
                    'student_id': student.id,
                    'student_name': student.username,
                    'mentor_name': student.mentor.username if student.mentor_id else None,
                    'completion_rate': student_metrics['completion_rate'],
                    'avg_score': student_metrics['avg_score'],
                    'is_at_risk': is_at_risk,
                })

            students_data.sort(
                key=lambda item: (
                    not item['is_at_risk'],
                    item['completion_rate'],
                    item['student_name'],
                )
            )

            view_data.append({
                'department_id': department.id,
                'department_name': department.name,
                'mentor_count': department_metrics['mentor_count'],
                'student_count': department_metrics['student_count'],
                'avg_completion_rate': department_metrics['avg_completion_rate'],
                'avg_score': department_metrics['avg_score'],
                'weekly_active_users': department_metrics['weekly_active_users'],
                'weekly_active_rate': department_metrics['weekly_active_rate'],
                'at_risk_students': at_risk_students,
                'students': students_data,
            })

        return view_data
