"""
试卷应用服务

编排业务逻辑，协调 Repository 和 Domain Service。
"""
from typing import Optional, List
from django.db import transaction
from django.utils import timezone
import uuid

from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes
from .models import Quiz
from .repositories import QuizRepository, QuizQuestionRepository
from apps.questions.models import Question
from apps.questions.repositories import QuestionRepository
from apps.knowledge.repositories import TagRepository


class QuizService(BaseService):
    """试卷应用服务"""
    
    def __init__(self):
        self.repository = QuizRepository()
        self.quiz_question_repository = QuizQuestionRepository()
        self.question_repository = QuestionRepository()
        self.tag_repository = TagRepository()
    
    def get_by_id(self, pk: int) -> Quiz:
        """
        获取试卷
        
        Args:
            pk: 主键
            
        Returns:
            试卷对象
            
        Raises:
            BusinessError: 如果不存在
        """
        quiz = self.repository.get_by_id(pk)
        self.validate_not_none(
            quiz,
            f'试卷 {pk} 不存在'
        )
        return quiz
    
    def get_list(
        self,
        filters: dict = None,
        search: str = None,
        ordering: str = '-created_at',
        limit: int = None,
        offset: int = None
    ) -> List[Quiz]:
        """
        获取试卷列表
        
        Args:
            filters: 过滤条件
            search: 搜索关键词
            ordering: 排序字段
            limit: 限制数量
            offset: 偏移量
            
        Returns:
            试卷列表
        """
        return list(self.repository.get_list(
            filters=filters,
            search=search,
            ordering=ordering,
            limit=limit,
            offset=offset
        ))
    
    def check_edit_permission(self, user, quiz: Quiz) -> bool:
        """
        检查用户是否有编辑权限
        
        Requirements: 6.5, 6.6, 6.7
        Property 16: 试卷所有权编辑控制
        
        Args:
            user: 当前用户
            quiz: 试卷对象
            
        Returns:
            True 如果有权限
        """
        # Admin can edit/delete any quiz
        if user.is_admin:
            return True
        if hasattr(user, 'current_role') and user.current_role == 'ADMIN':
            return True
        
        # Others can only edit/delete their own quizzes
        return quiz.created_by_id == user.id
    
    @transaction.atomic
    def create(
        self,
        data: dict,
        user,
        existing_question_ids: List[int] = None,
        new_questions_data: List[dict] = None
    ) -> Quiz:
        """
        创建试卷
        
        Requirements: 6.1, 6.2, 6.3
        
        Args:
            data: 试卷数据
            user: 创建用户
            existing_question_ids: 已有题目 ID 列表
            new_questions_data: 新建题目数据列表
            
        Returns:
            创建的试卷对象
            
        Raises:
            BusinessError: 如果验证失败
        """
        # 1. 业务验证
        self._validate_quiz_data(data)
        
        # 2. 准备数据
        data['created_by'] = user
        data.setdefault('status', 'PUBLISHED')
        data.setdefault('is_current', True)
        data.setdefault('published_at', timezone.now())
        
        # 处理版本号
        self._prepare_quiz_version_data(data)
        
        # 3. 创建试卷
        quiz = self.repository.create(**data)
        
        # 4. 添加题目
        existing_question_ids = existing_question_ids or []
        new_questions_data = new_questions_data or []
        
        # 添加已有题目
        for question_id in existing_question_ids:
            self.quiz_question_repository.add_question(
                quiz_id=quiz.id,
                question_id=question_id
            )
        
        # 创建并添加新题目
        for question_data in new_questions_data:
            self._create_and_add_question(quiz, question_data, user)
        
        return quiz
    
    @transaction.atomic
    def update(
        self,
        pk: int,
        data: dict,
        user,
        question_ids: List[int] = None
    ) -> Quiz:
        """
        更新试卷
        
        Requirements: 6.5, 6.7
        Property 16: 试卷所有权编辑控制
        
        Args:
            pk: 主键
            data: 更新数据
            user: 更新用户
            question_ids: 新的题目 ID 顺序列表（可选）
            
        Returns:
            更新后的试卷对象
            
        Raises:
            BusinessError: 如果验证失败或无法更新
        """
        quiz = self.get_by_id(pk)
        
        # 检查权限
        self.validate_permission(
            self.check_edit_permission(user, quiz),
            '只有试卷创建者或管理员可以编辑此试卷'
        )
        
        # 已发布的试卷需要创建新版本
        if quiz.status == 'PUBLISHED':
            quiz = self._create_new_version(quiz, data, user)
        else:
            # 草稿直接更新
            self._validate_quiz_data(data)
            data['updated_by'] = user
            quiz = self.repository.update(quiz, **data)
        
        # 更新题目顺序（如果提供）
        if question_ids is not None:
            self._sync_question_order(quiz, question_ids)
        
        return quiz
    
    @transaction.atomic
    def delete(self, pk: int, user) -> None:
        """
        删除试卷
        
        Requirements: 6.6, 6.7, 6.8
        Property 14: 被引用试卷删除保护
        Property 16: 试卷所有权编辑控制
        
        Args:
            pk: 主键
            user: 删除用户
            
        Raises:
            BusinessError: 如果被引用无法删除或无权限
        """
        quiz = self.get_by_id(pk)
        
        # 检查权限
        self.validate_permission(
            self.check_edit_permission(user, quiz),
            '只有试卷创建者或管理员可以删除此试卷'
        )
        
        # 检查是否被引用
        if self.repository.is_referenced_by_task(quiz.id):
            raise BusinessError(
                code=ErrorCodes.RESOURCE_REFERENCED,
                message='该试卷已被任务引用，无法删除'
            )
        
        # 软删除
        self.repository.delete(quiz, soft=True)
    
    @transaction.atomic
    def add_questions(
        self,
        pk: int,
        user,
        existing_question_ids: List[int] = None,
        new_questions_data: List[dict] = None
    ) -> Quiz:
        """
        向试卷添加题目
        
        Requirements: 6.2, 6.3
        
        Args:
            pk: 试卷 ID
            user: 当前用户
            existing_question_ids: 已有题目 ID 列表
            new_questions_data: 新建题目数据列表
            
        Returns:
            更新后的试卷对象
            
        Raises:
            BusinessError: 如果验证失败或无权限
        """
        quiz = self.get_by_id(pk)
        
        # 检查权限
        self.validate_permission(
            self.check_edit_permission(user, quiz),
            '只有试卷创建者或管理员可以编辑此试卷'
        )
        
        # 已发布的试卷需要创建新版本
        if quiz.status == 'PUBLISHED':
            quiz = self._create_new_version(quiz, {}, user)
        
        existing_question_ids = existing_question_ids or []
        new_questions_data = new_questions_data or []
        
        # 获取当前试卷中已有的题目 ID
        existing_quiz_question_ids = set(
            self.quiz_question_repository.get_question_ids(quiz.id)
        )
        
        # 添加已有题目
        for question_id in existing_question_ids:
            if question_id not in existing_quiz_question_ids:
                # 验证题目存在
                question = self.question_repository.get_by_id(question_id)
                if not question:
                    raise BusinessError(
                        code=ErrorCodes.RESOURCE_NOT_FOUND,
                        message=f'题目 {question_id} 不存在'
                    )
                self.quiz_question_repository.add_question(
                    quiz_id=quiz.id,
                    question_id=question_id
                )
        
        # 创建并添加新题目
        for question_data in new_questions_data:
            self._create_and_add_question(quiz, question_data, user)
        
        return quiz
    
    @transaction.atomic
    def remove_questions(
        self,
        pk: int,
        user,
        question_ids: List[int]
    ) -> Quiz:
        """
        从试卷移除题目
        
        Args:
            pk: 试卷 ID
            user: 当前用户
            question_ids: 要移除的题目 ID 列表
            
        Returns:
            更新后的试卷对象
            
        Raises:
            BusinessError: 如果验证失败或无权限
        """
        quiz = self.get_by_id(pk)
        
        # 检查权限
        self.validate_permission(
            self.check_edit_permission(user, quiz),
            '只有试卷创建者或管理员可以编辑此试卷'
        )
        
        # 已发布的试卷需要创建新版本
        if quiz.status == 'PUBLISHED':
            quiz = self._create_new_version(quiz, {}, user)
        
        # 移除题目
        self.quiz_question_repository.remove_questions(
            quiz_id=quiz.id,
            question_ids=question_ids
        )
        
        return quiz
    
    @transaction.atomic
    def reorder_questions(
        self,
        pk: int,
        user,
        question_ids: List[int]
    ) -> Quiz:
        """
        重新排序试卷中的题目
        
        Args:
            pk: 试卷 ID
            user: 当前用户
            question_ids: 按新顺序排列的题目 ID 列表
            
        Returns:
            更新后的试卷对象
            
        Raises:
            BusinessError: 如果验证失败或无权限
        """
        quiz = self.get_by_id(pk)
        
        # 检查权限
        self.validate_permission(
            self.check_edit_permission(user, quiz),
            '只有试卷创建者或管理员可以编辑此试卷'
        )
        
        # 已发布的试卷需要创建新版本
        if quiz.status == 'PUBLISHED':
            quiz = self._create_new_version(quiz, {}, user)
        
        # 重新排序
        self.quiz_question_repository.reorder_questions(
            quiz_id=quiz.id,
            question_ids=question_ids
        )
        
        return quiz
    
    @transaction.atomic
    def create_from_questions(
        self,
        title: str,
        description: str,
        user,
        question_ids: List[int]
    ) -> Quiz:
        """
        从题目创建试卷
        
        Requirements: 6.1, 6.2
        
        Args:
            title: 试卷名称
            description: 试卷描述
            user: 创建用户
            question_ids: 题目 ID 列表
            
        Returns:
            创建的试卷对象
            
        Raises:
            BusinessError: 如果验证失败
        """
        if not title:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='试卷名称不能为空'
            )
        
        if not question_ids:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='必须选择至少一道题目'
            )
        
        # 验证所有题目存在
        invalid_ids = []
        for question_id in question_ids:
            question = self.question_repository.get_by_id(question_id)
            if not question:
                invalid_ids.append(question_id)
        if invalid_ids:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message=f'题目不存在: {invalid_ids}'
            )
        
        # 创建试卷
        quiz_data = {
            'title': title,
            'description': description,
            'created_by': user,
            'status': 'PUBLISHED',
            'is_current': True,
            'published_at': timezone.now(),
        }
        self._prepare_quiz_version_data(quiz_data)
        quiz = self.repository.create(**quiz_data)
        
        # 添加题目
        for order, question_id in enumerate(question_ids, start=1):
            self.quiz_question_repository.add_question(
                quiz_id=quiz.id,
                question_id=question_id,
                order=order
            )
        
        return quiz
    
    def _create_and_add_question(
        self,
        quiz: Quiz,
        question_data: dict,
        user
    ) -> Question:
        """
        创建题目并添加到试卷
        
        Args:
            quiz: 试卷对象
            question_data: 题目数据字典（会被修改，line_type_id 会被弹出）
            user: 创建用户
            
        Returns:
            创建的题目对象
        """
        line_type_id = question_data.pop('line_type_id', None)
        
        # 准备版本数据
        self._prepare_question_version_data(question_data)
        
        # 准备题目属性
        question_attrs = {
            'created_by': user,
            'status': 'PUBLISHED',
            'is_current': True,
            'published_at': timezone.now(),
            **question_data,
        }
        
        # 创建题目
        question = self.question_repository.create(**question_attrs)
        
        # 设置条线类型
        if line_type_id:
            self._set_question_line_type(question, line_type_id)
        
        # 添加到试卷
        self.quiz_question_repository.add_question(
            quiz_id=quiz.id,
            question_id=question.id
        )
        
        return question
    
    def _prepare_quiz_version_data(self, data: dict) -> None:
        """
        准备试卷版本号相关数据
        
        Args:
            data: 试卷数据字典（会被修改）
        """
        if not data.get('resource_uuid'):
            data['resource_uuid'] = uuid.uuid4()
        data['version_number'] = self.repository.next_version_number(
            data.get('resource_uuid')
        )
    
    def _prepare_question_version_data(self, data: dict) -> None:
        """
        准备题目版本号相关数据
        
        Args:
            data: 题目数据字典（会被修改）
        """
        if not data.get('resource_uuid'):
            data['resource_uuid'] = uuid.uuid4()
        data['version_number'] = Question.next_version_number(
            data.get('resource_uuid')
        )
    
    def _set_question_line_type(self, question: Question, line_type_id: int) -> None:
        """
        设置题目的条线类型
        
        Args:
            question: 题目对象
            line_type_id: 条线类型ID
            
        Raises:
            BusinessError: 如果条线类型无效
        """
        line_type = self.tag_repository.get_all(
            filters={'id': line_type_id, 'tag_type': 'LINE', 'is_active': True}
        ).first()
        
        if not line_type:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='无效的条线类型ID'
            )
        
        question.set_line_type(line_type)
    
    def _validate_quiz_data(self, data: dict) -> None:
        """验证试卷数据"""
        quiz_type = data.get('quiz_type', 'PRACTICE')
        
        if quiz_type == 'EXAM':
            if not data.get('duration'):
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='考试类型必须设置考试时长'
                )
            if not data.get('pass_score'):
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='考试类型必须设置及格分数'
                )
    
    def _create_new_version(
        self,
        source: Quiz,
        data: dict,
        user
    ) -> Quiz:
        """
        基于已发布版本创建新版本
        
        Args:
            source: 源试卷
            data: 更新数据
            user: 更新用户
            
        Returns:
            新版本的试卷对象
        """
        # 创建新版本
        new_quiz_data = {
            'title': source.title,
            'description': source.description,
            'created_by': source.created_by,
            'status': 'PUBLISHED',
            'resource_uuid': source.resource_uuid,
            'version_number': self.repository.next_version_number(
                source.resource_uuid
            ),
            'source_version': source,
            'published_at': timezone.now(),
            'is_current': True,
            'quiz_type': source.quiz_type,
            'duration': source.duration,
            'pass_score': source.pass_score,
        }
        
        # 应用更新数据
        new_quiz_data.update(data)
        
        new_quiz = self.repository.create(**new_quiz_data)
        
        # 复制题目顺序
        source_questions = self.quiz_question_repository.get_ordered_questions(
            source.id
        )
        for relation in source_questions:
            self.quiz_question_repository.add_question(
                quiz_id=new_quiz.id,
                question_id=relation.question_id,
                order=relation.order
            )
        
        # 取消其他版本的 is_current 标志
        self.repository.unset_current_flag_for_others(
            resource_uuid=source.resource_uuid,
            exclude_pk=new_quiz.pk
        )
        
        return new_quiz
    
    def _sync_question_order(
        self,
        quiz: Quiz,
        question_ids: List[int]
    ) -> None:
        """
        同步题目顺序
        
        Args:
            quiz: 试卷对象
            question_ids: 新的题目 ID 顺序列表
        """
        current_relations = {
            qq.question_id: qq
            for qq in self.quiz_question_repository.get_by_quiz(quiz.id)
        }
        new_id_set = set(question_ids)
        
        # 移除不再存在的题目
        to_remove = [
            qid for qid in current_relations.keys()
            if qid not in new_id_set
        ]
        if to_remove:
            self.quiz_question_repository.remove_questions(
                quiz_id=quiz.id,
                question_ids=to_remove
            )
        
        # 重新排序/添加缺失的题目
        for order, question_id in enumerate(question_ids, start=1):
            relation = current_relations.get(question_id)
            if relation:
                if relation.order != order:
                    relation.order = order
                    relation.save(update_fields=['order'])
            else:
                # 验证题目存在
                question = self.question_repository.get_by_id(question_id)
                if not question:
                    raise BusinessError(
                        code=ErrorCodes.RESOURCE_NOT_FOUND,
                        message=f'题目 {question_id} 不存在'
                    )
                self.quiz_question_repository.add_question(
                    quiz_id=quiz.id,
                    question_id=question_id,
                    order=order
                )
