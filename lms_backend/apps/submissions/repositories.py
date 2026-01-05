"""
答题记录相关仓储实现

负责所有答题记录和答案相关的数据访问操作。
"""
from typing import Optional, List
from django.db.models import QuerySet, Q

from core.base_repository import BaseRepository
from .models import Submission, Answer


class SubmissionRepository(BaseRepository[Submission]):
    """答题记录仓储"""
    
    model = Submission
    
    def get_by_id(
        self,
        pk: int,
        user: Optional['User'] = None,
        include_deleted: bool = False
    ) -> Optional[Submission]:
        """
        根据 ID 获取答题记录
        
        Args:
            pk: 主键
            user: 可选的用户，用于验证所有权
            include_deleted: 是否包含已删除的记录（Submission 模型没有软删除，此参数暂不使用）
            
        Returns:
            答题记录对象或 None
        """
        qs = self.model.objects.select_related(
            'task_assignment__task',
            'quiz',
            'user'
        ).prefetch_related(
            'answers__question',
            'answers__graded_by'
        )
        
        if user:
            qs = qs.filter(user=user)
        
        return qs.filter(pk=pk).first()
    
    def get_for_grading(
        self,
        pk: int
    ) -> Optional[Submission]:
        """
        获取用于评分的答题记录（包含完整的关联数据）
        
        Args:
            pk: 主键
            
        Returns:
            答题记录对象或 None
        """
        return self.model.objects.select_related(
            'quiz',
            'user',
            'task_assignment__task'
        ).prefetch_related(
            'answers__question',
            'answers__graded_by'
        ).filter(pk=pk).first()
    
    def get_in_progress(
        self,
        task_assignment_id: int,
        quiz_id: int
    ) -> Optional[Submission]:
        """
        获取进行中的答题记录
        
        Args:
            task_assignment_id: 任务分配 ID
            quiz_id: 试卷 ID
            
        Returns:
            进行中的答题记录或 None
        """
        return self.model.objects.filter(
            task_assignment_id=task_assignment_id,
            quiz_id=quiz_id,
            status='IN_PROGRESS'
        ).first()
    
    def get_existing_submitted(
        self,
        task_assignment_id: int,
        quiz_id: int
    ) -> Optional[Submission]:
        """
        获取已提交的答题记录（用于考试的单次提交限制）
        
        Args:
            task_assignment_id: 任务分配 ID
            quiz_id: 试卷 ID
            
        Returns:
            已提交的答题记录或 None
        """
        return self.model.objects.filter(
            task_assignment_id=task_assignment_id,
            quiz_id=quiz_id,
            status__in=['SUBMITTED', 'GRADING', 'GRADED']
        ).first()
    
    def get_by_user_and_task(
        self,
        user_id: int,
        task_id: int = None,
        status: str = None,
        ordering: str = '-created_at'
    ) -> QuerySet[Submission]:
        """
        获取用户的答题记录列表
        
        Args:
            user_id: 用户 ID
            task_id: 可选的任务 ID
            status: 可选的状态过滤
            ordering: 排序字段
            
        Returns:
            QuerySet
        """
        qs = self.model.objects.filter(
            user_id=user_id
        ).select_related(
            'quiz',
            'task_assignment__task'
        )
        
        if task_id:
            qs = qs.filter(task_assignment__task_id=task_id)
        
        if status:
            qs = qs.filter(status=status)
        
        if ordering:
            qs = qs.order_by(ordering)
        
        return qs
    
    def get_practice_history(
        self,
        task_assignment_id: int,
        quiz_id: int
    ) -> QuerySet[Submission]:
        """
        获取练习历史记录（已提交的记录）
        
        Args:
            task_assignment_id: 任务分配 ID
            quiz_id: 试卷 ID
            
        Returns:
            QuerySet
        """
        return self.model.objects.filter(
            task_assignment_id=task_assignment_id,
            quiz_id=quiz_id,
            status__in=['SUBMITTED', 'GRADING', 'GRADED']
        ).order_by('-submitted_at')
    
    def get_grading_queryset(
        self,
        user_id: int = None,
        department_id: int = None,
        mentor_id: int = None
    ) -> QuerySet[Submission]:
        """
        获取待评分的答题记录查询集
        
        Args:
            user_id: 可选的用户 ID（用于限制到特定学员）
            department_id: 可选的部门 ID（用于限制到特定部门）
            mentor_id: 可选的导师 ID（用于限制到特定导师的学员）
            
        Returns:
            QuerySet
        """
        qs = self.model.objects.filter(
            status='GRADING'
        ).select_related(
            'quiz',
            'user',
            'task_assignment__task'
        )
        
        if user_id:
            qs = qs.filter(user_id=user_id)
        
        if department_id:
            qs = qs.filter(user__department_id=department_id)
        
        if mentor_id:
            qs = qs.filter(user__mentor_id=mentor_id)
        
        return qs.order_by('-submitted_at')
    
    def count_attempts(
        self,
        task_assignment_id: int,
        quiz_id: int
    ) -> int:
        """
        统计答题次数
        
        Args:
            task_assignment_id: 任务分配 ID
            quiz_id: 试卷 ID
            
        Returns:
            答题次数
        """
        return self.model.objects.filter(
            task_assignment_id=task_assignment_id,
            quiz_id=quiz_id
        ).count()
    
    def create_with_answers(
        self,
        answers_data: List[dict],
        **submission_data
    ) -> Submission:
        """
        创建答题记录及其答案记录
        
        Args:
            answers_data: 答案数据列表，每个元素包含:
                - question_id: 题目ID
                - question_resource_uuid: 题目资源UUID (可选)
                - question_version_number: 题目版本号 (可选)
            **submission_data: 答题记录数据
            
        Returns:
            创建的答题记录对象
        """
        submission = self.create(**submission_data)
        
        # 批量创建答案记录，记录题目版本信息
        Answer.objects.bulk_create([
            Answer(
                submission=submission,
                question_id=answer_data['question_id'],
                question_resource_uuid=answer_data.get('question_resource_uuid'),
                question_version_number=answer_data.get('question_version_number')
            )
            for answer_data in answers_data
        ])
        
        return submission


class AnswerRepository(BaseRepository[Answer]):
    """答案记录仓储"""
    
    model = Answer
    
    def get_by_id(
        self,
        pk: int,
        include_deleted: bool = False
    ) -> Optional[Answer]:
        """
        根据 ID 获取答案记录
        
        Args:
            pk: 主键
            include_deleted: 是否包含已删除的记录（Answer 模型没有软删除，此参数暂不使用）
            
        Returns:
            答案记录对象或 None
        """
        return self.model.objects.select_related(
            'question',
            'submission',
            'graded_by'
        ).filter(pk=pk).first()
    
    def get_by_submission_and_question(
        self,
        submission_id: int,
        question_id: int
    ) -> Optional[Answer]:
        """
        根据答题记录和题目获取答案
        
        Args:
            submission_id: 答题记录 ID
            question_id: 题目 ID
            
        Returns:
            答案记录对象或 None
        """
        return self.model.objects.select_related(
            'question'
        ).filter(
            submission_id=submission_id,
            question_id=question_id
        ).first()
    
    def get_by_submission(
        self,
        submission_id: int
    ) -> QuerySet[Answer]:
        """
        获取答题记录的所有答案
        
        Args:
            submission_id: 答题记录 ID
            
        Returns:
            QuerySet
        """
        return self.model.objects.filter(
            submission_id=submission_id
        ).select_related('question', 'graded_by')
    
    def get_objective_answers(
        self,
        submission_id: int
    ) -> QuerySet[Answer]:
        """
        获取客观题答案
        
        Args:
            submission_id: 答题记录 ID
            
        Returns:
            QuerySet
        """
        return self.model.objects.filter(
            submission_id=submission_id,
            question__question_type__in=['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE']
        ).select_related('question')
    
    def get_subjective_answers(
        self,
        submission_id: int
    ) -> QuerySet[Answer]:
        """
        获取主观题答案
        
        Args:
            submission_id: 答题记录 ID
            
        Returns:
            QuerySet
        """
        return self.model.objects.filter(
            submission_id=submission_id,
            question__question_type='SHORT_ANSWER'
        ).select_related('question', 'graded_by')
