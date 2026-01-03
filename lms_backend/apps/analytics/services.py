"""
Analytics 应用服务

提供业务逻辑：
- 仪表盘统计计算
- 学员进度跟踪
- 部门/团队分析
- 知识热度统计

此服务层通过 Repository 访问数据，将业务逻辑与数据访问分离，
提高代码可重用性和可测试性。
"""
from typing import List, Optional, Dict, Any
from django.db.models import QuerySet

from core.base_service import BaseService
from apps.users.models import User
from apps.users.permissions import get_current_role, get_accessible_students
from .repositories import (
    TaskAssignmentAnalyticsRepository,
    KnowledgeAnalyticsRepository,
    SubmissionAnalyticsRepository,
    AnswerAnalyticsRepository,
    UserAnalyticsRepository,
    DepartmentAnalyticsRepository,
)


class StudentDashboardService(BaseService):
    """
    学员仪表盘服务
    
    处理：
    - 待办任务获取
    - 最新知识获取
    - 任务摘要统计
    """
    
    def __init__(self):
        self.task_assignment_repo = TaskAssignmentAnalyticsRepository()
        self.knowledge_repo = KnowledgeAnalyticsRepository()
    
    def get_pending_tasks(self, user: User, limit: int = 10) -> QuerySet:
        """
        获取学员的待办任务
        
        Args:
            user: 学员用户
            limit: 最大返回数量
            
        Returns:
            待办任务 QuerySet
        """
        return self.task_assignment_repo.get_pending_tasks(
            user_id=user.id,
            limit=limit
        )
    
    def get_latest_knowledge(self, limit: int = 5) -> QuerySet:
        """
        获取最新发布的知识文档
        
        Args:
            limit: 最大返回数量
            
        Returns:
            知识文档 QuerySet
        """
        return self.knowledge_repo.get_latest_knowledge(limit=limit)
    
    def get_task_summary(self, user: User) -> Dict[str, int]:
        """
        获取学员任务摘要统计
        
        Args:
            user: 学员用户
            
        Returns:
            包含待办、已完成、逾期、总数量的字典
        """
        assignments = self.task_assignment_repo.get_student_assignments(
            user_id=user.id
        )
        
        stats = self.task_assignment_repo.calculate_task_stats(assignments)
        
        return {
            'pending': stats['in_progress_tasks'],
            'completed': stats['completed_tasks'],
            'overdue': stats['overdue_tasks'],
            'total': stats['total_tasks']
        }


class StudentProfileService(BaseService):
    """
    学员个人中心服务
    
    处理：
    - 成绩历史获取
    - 错题本
    - 成绩统计
    """
    
    def __init__(self):
        self.submission_repo = SubmissionAnalyticsRepository()
        self.answer_repo = AnswerAnalyticsRepository()
    
    def get_score_history(
        self,
        user: User,
        status_filter: str = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        获取学员成绩历史（带分页）
        
        Args:
            user: 学员用户
            status_filter: 可选的状态过滤
            page: 页码
            page_size: 每页数量
            
        Returns:
            包含结果、数量、分页信息和摘要的字典
        """
        status_list = ['SUBMITTED', 'GRADING', 'GRADED']
        if status_filter:
            status_list = [status_filter]
        
        queryset = self.submission_repo.get_student_submissions(
            user_id=user.id,
            status_filter=status_list
        )
        
        total_count = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        submissions = queryset[start:end]
        
        summary = self.submission_repo.get_score_summary(user_id=user.id)
        
        return {
            'submissions': submissions,
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size if total_count > 0 else 0,
            'summary': summary
        }
    
    def get_wrong_answers(
        self,
        user: User,
        question_type: str = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        获取学员错题（带分页）
        
        Args:
            user: 学员用户
            question_type: 可选的题目类型过滤
            page: 页码
            page_size: 每页数量
            
        Returns:
            包含结果、数量、分页信息和摘要的字典
        """
        queryset = self.answer_repo.get_wrong_answers(
            user_id=user.id,
            question_type=question_type
        )
        
        total_count = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        wrong_answers = queryset[start:end]
        
        summary = self.answer_repo.get_wrong_answer_summary(user_id=user.id)
        
        return {
            'wrong_answers': wrong_answers,
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size if total_count > 0 else 0,
            'summary': summary
        }


class MentorDashboardService(BaseService):
    """
    导师/室经理仪表盘服务
    
    处理：
    - 可访问学员的摘要统计
    - 单个学员统计
    - 快捷链接生成
    """
    
    def __init__(self):
        self.task_assignment_repo = TaskAssignmentAnalyticsRepository()
        self.submission_repo = SubmissionAnalyticsRepository()
    
    def get_dashboard_data(self, user: User) -> Dict[str, Any]:
        """
        获取导师/室经理的完整仪表盘数据
        
        Args:
            user: 导师或室经理用户
            
        Returns:
            包含摘要、学员、快捷链接、当前角色的字典
        """
        current_role = get_current_role(user)
        students = get_accessible_students(user, current_role)
        student_ids = list(students.values_list('id', flat=True))
        
        summary = self._calculate_summary(student_ids, current_role)
        student_stats = self._calculate_student_stats(students)
        quick_links = self._generate_quick_links(current_role)
        
        return {
            'summary': summary,
            'students': student_stats,
            'quick_links': quick_links,
            'current_role': current_role
        }
    
    def _calculate_summary(
        self,
        student_ids: List[int],
        current_role: str
    ) -> Dict[str, Any]:
        """计算总体摘要统计"""
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
        
        assignments = self.task_assignment_repo.get_assignments_by_students(
            student_ids=student_ids
        )
        
        stats = self.task_assignment_repo.calculate_task_stats(assignments)
        
        overall_avg_score = self.submission_repo.calculate_avg_score(
            student_ids=student_ids
        )
        
        pending_grading_count = self.submission_repo.get_pending_grading_count(
            student_ids=student_ids
        )
        
        default_stats = {'total': 0, 'completed': 0, 'completion_rate': 0.0}
        
        return {
            'total_students': len(student_ids),
            'total_tasks': stats['total_tasks'],
            'completed_tasks': stats['completed_tasks'],
            'in_progress_tasks': stats['in_progress_tasks'],
            'overdue_tasks': stats['overdue_tasks'],
            'overall_completion_rate': round(stats['completion_rate'], 1),
            'overall_avg_score': round(overall_avg_score, 2) if overall_avg_score else None,
            'pending_grading_count': pending_grading_count,
            'learning_tasks': default_stats,
            'practice_tasks': default_stats,
            'exam_tasks': {**default_stats, 'avg_score': None}
        }
    
    def _calculate_student_stats(self, students: QuerySet) -> List[Dict[str, Any]]:
        """计算每个学员的统计"""
        student_stats = []
        
        for student in students.select_related('department'):
            assignments = self.task_assignment_repo.get_student_assignments(
                user_id=student.id
            )
            
            stats = self.task_assignment_repo.calculate_task_stats(assignments)
            
            avg_score = self.submission_repo.calculate_avg_score(
                user_id=student.id
            )
            
            student_stats.append({
                'id': student.id,
                'employee_id': student.employee_id,
                'username': student.username,
                'department_name': student.department.name if student.department else None,
                'total_tasks': stats['total_tasks'],
                'completed_tasks': stats['completed_tasks'],
                'in_progress_tasks': stats['in_progress_tasks'],
                'overdue_tasks': stats['overdue_tasks'],
                'completion_rate': stats['completion_rate'],
                'avg_score': round(avg_score, 2) if avg_score else None,
                'exam_count': 0,
                'exam_passed_count': 0,
                'exam_pass_rate': None
            })
        
        return student_stats
    
    @staticmethod
    def _generate_quick_links(current_role: str) -> Dict[str, str]:
        """生成快捷访问链接"""
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


class TeamManagerDashboardService(BaseService):
    """
    团队经理数据看板服务
    
    处理：
    - 跨部门的概览统计
    - 部门级别统计
    - 知识热度统计
    """
    
    def __init__(self):
        self.task_assignment_repo = TaskAssignmentAnalyticsRepository()
        self.submission_repo = SubmissionAnalyticsRepository()
        self.knowledge_repo = KnowledgeAnalyticsRepository()
        self.user_repo = UserAnalyticsRepository()
        self.department_repo = DepartmentAnalyticsRepository()
    
    def get_overview_data(self) -> Dict[str, Any]:
        """
        获取团队经理概览数据
        
        Returns:
            包含概览和部门统计的字典
        """
        departments = self.department_repo.get_all_departments()
        
        overview = self._calculate_overview()
        department_stats = self._calculate_department_stats(departments)
        
        return {
            'overview': overview,
            'departments': department_stats
        }
    
    def _calculate_overview(self) -> Dict[str, Any]:
        """计算跨部门的总体统计"""
        total_departments = self.department_repo.count_departments()
        total_students = self.user_repo.get_all_active_users().count()
        
        # 获取所有任务分配（不限制学生）
        from apps.tasks.models import TaskAssignment
        assignments = TaskAssignment.objects.filter(task__is_deleted=False)
        stats = self.task_assignment_repo.calculate_task_stats(assignments)
        
        overall_avg_score = self.submission_repo.calculate_avg_score()
        
        return {
            'total_departments': total_departments,
            'total_students': total_students,
            'total_tasks': stats['total_tasks'],
            'completed_tasks': stats['completed_tasks'],
            'in_progress_tasks': stats['in_progress_tasks'],
            'overdue_tasks': stats['overdue_tasks'],
            'overall_completion_rate': round(stats['completion_rate'], 1),
            'overall_avg_score': round(overall_avg_score, 2) if overall_avg_score else None,
            'learning_tasks': {'total': 0, 'completed': 0, 'completion_rate': 0.0},
            'practice_tasks': {'total': 0, 'completed': 0, 'completion_rate': 0.0},
            'exam_tasks': {'total': 0, 'completed': 0, 'completion_rate': 0.0, 'avg_score': None}
        }
    
    def _calculate_department_stats(self, departments: QuerySet) -> List[Dict[str, Any]]:
        """计算每个部门的统计"""
        department_stats = []
        
        for dept in departments:
            students = self.user_repo.get_users_by_department(dept.id)
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
            
            assignments = self.task_assignment_repo.get_assignments_by_students(
                student_ids=student_ids
            )
            
            stats = self.task_assignment_repo.calculate_task_stats(assignments)
            
            avg_score = self.submission_repo.calculate_avg_score(
                student_ids=student_ids
            )
            
            department_stats.append({
                'id': dept.id,
                'name': dept.name,
                'code': dept.code,
                'total_students': total_students,
                'total_tasks': stats['total_tasks'],
                'completed_tasks': stats['completed_tasks'],
                'in_progress_tasks': stats['in_progress_tasks'],
                'overdue_tasks': stats['overdue_tasks'],
                'completion_rate': stats['completion_rate'],
                'avg_score': round(avg_score, 2) if avg_score else None,
                'exam_count': 0,
                'exam_passed_count': 0,
                'exam_pass_rate': None
            })
        
        return department_stats
    
    def get_knowledge_heat(
        self,
        limit: int = 20,
        knowledge_type: str = None
    ) -> Dict[str, Any]:
        """
        获取知识热度统计
        
        Args:
            limit: 最大返回数量
            knowledge_type: 可选的知识类型过滤
            
        Returns:
            包含结果和摘要的字典
        """
        queryset = self.knowledge_repo.get_knowledge_heat(
            limit=limit,
            knowledge_type=knowledge_type
        )
        
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
        
        summary = self.knowledge_repo.get_knowledge_statistics()
        
        return {
            'results': heat_data,
            'summary': summary
        }
