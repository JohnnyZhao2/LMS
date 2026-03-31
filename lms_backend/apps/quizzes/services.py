"""
试卷应用服务
编排业务逻辑。

使用方式（构造器注入）:
    service = QuizService(request)
    quiz = service.get_by_id(pk=123)
"""
from typing import List, Optional

from django.db import transaction
from django.db.models import Max

from apps.questions.models import Question
from apps.tags.models import Tag
from apps.users.permissions import is_admin_like_role
from core.base_service import BaseService
from core.decorators import log_content_action
from core.exceptions import BusinessError, ErrorCodes
from core.versioning import (
    build_next_version_data,
    deactivate_current_version,
    initialize_new_resource_version,
)

from .models import Quiz, QuizQuestion
from .selectors import get_question_ids, get_quiz_by_id, list_quiz_questions


class QuizService(BaseService):
    """试卷应用服务"""

    # 创建新版本时需要复制的内容字段
    # 添加新的内容字段时，只需在此列表中添加即可
    VERSION_COPY_FIELDS = [
        'title', 'quiz_type',
        'duration', 'pass_score',
    ]

    def _add_question(self, quiz_id: int, question_id: int, order: int = None) -> QuizQuestion:
        if order is None:
            max_order = QuizQuestion.objects.filter(
                quiz_id=quiz_id
            ).aggregate(
                max_order=Max('order')
            )['max_order']
            order = (max_order or 0) + 1
        return QuizQuestion.objects.create(
            quiz_id=quiz_id,
            question_id=question_id,
            order=order
        )

    def _remove_questions(self, quiz_id: int, question_ids: List[int]) -> int:
        deleted_count, _ = QuizQuestion.objects.filter(
            quiz_id=quiz_id,
            question_id__in=question_ids
        ).delete()
        return deleted_count

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
        quiz = get_quiz_by_id(pk)
        self.validate_not_none(quiz, f'试卷 {pk} 不存在')
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
        qs = Quiz.objects.filter(
            is_deleted=False,
            is_current=True
        ).select_related('created_by', 'updated_by')
        # 应用过滤条件
        if filters:
            if filters.get('created_by_id'):
                qs = qs.filter(created_by_id=filters['created_by_id'])
            if filters.get('quiz_type'):
                qs = qs.filter(quiz_type=filters['quiz_type'])
        # 搜索
        if search:
            qs = qs.filter(title__icontains=search)
        # 排序
        if ordering:
            qs = qs.order_by(ordering)
        # 分页
        if limit:
            qs = qs[offset:offset+limit] if offset else qs[:limit]
        return list(qs)

    def check_edit_permission(self, quiz: Quiz) -> bool:
        """
        检查用户是否有编辑权限
        Property 16: 试卷所有权编辑控制
        Args:
            quiz: 试卷对象
        Returns:
            True 如果有权限
        """
        # Admin can edit/delete any quiz
        if is_admin_like_role(self.get_current_role()):
            return True
        # Others can only edit/delete their own quizzes
        return quiz.created_by_id == self.user.id

    @transaction.atomic
    @log_content_action(
        'quiz',
        'create',
        '{quiz_type_label}，{question_count} 题，{total_score_text} 分',
    )
    def create(
        self,
        data: dict,
        existing_question_ids: List[int] = None,
        new_questions_data: List[dict] = None
    ) -> Quiz:
        """
        创建试卷
        Args:
            data: 试卷数据
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
        data['created_by'] = self.user
        data['updated_by'] = self.user
        # 处理版本号
        self._prepare_quiz_version_data(data)
        # 3. 创建试卷
        quiz = Quiz.objects.create(**data)
        # 4. 添加题目
        existing_question_ids = existing_question_ids or []
        new_questions_data = new_questions_data or []
        # 添加已有题目
        for question_id in existing_question_ids:
            self._add_question(
                quiz_id=quiz.id,
                question_id=question_id
            )
        # 创建并添加新题目
        for question_data in new_questions_data:
            self._create_and_add_question(quiz, question_data)
        quiz.updated_by = self.user
        quiz.save(update_fields=['updated_by'])

        return quiz

    @transaction.atomic
    @log_content_action(
        'quiz',
        'update',
        'v{version_number}，{quiz_type_label}，{question_count} 题，{total_score_text} 分',
    )
    def update(
        self,
        pk: int,
        data: dict,
        question_ids: List[int] = None,
        add_question_ids: List[int] = None,
        new_questions_data: List[dict] = None,
        remove_question_ids: List[int] = None
    ) -> Quiz:
        """
        更新试卷（支持原子性操作）
        Property 16: 试卷所有权编辑控制
        Args:
            pk: 主键
            data: 更新数据
            question_ids: 新的题目 ID 顺序列表（可选，会覆盖现有顺序）
            add_question_ids: 要添加的已有题目 ID 列表
            new_questions_data: 要新建的题目数据列表
            remove_question_ids: 要移除的题目 ID 列表
        Returns:
            更新后的试卷对象
        Raises:
            BusinessError: 如果验证失败或无法更新
        """
        quiz = self.get_by_id(pk)
        # 检查权限
        self.validate_permission(
            self.check_edit_permission(quiz),
            '只有试卷创建者或管理员可以编辑此试卷'
        )
        if not quiz.is_current:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='历史版本不可修改'
            )
        # 处理题目操作（在同一个事务中）
        add_question_ids = add_question_ids or []
        new_questions_data = new_questions_data or []
        remove_question_ids = remove_question_ids or []
        has_question_changes = (
            question_ids is not None
            or bool(add_question_ids)
            or bool(new_questions_data)
            or bool(remove_question_ids)
        )
        changed_fields = {
            field: value
            for field, value in data.items()
            if field in self.VERSION_COPY_FIELDS and getattr(quiz, field, None) != value
        }
        has_base_changes = bool(changed_fields)
        if not has_base_changes and not has_question_changes:
            return quiz
        if has_base_changes:
            merged_quiz_data = {
                'quiz_type': changed_fields.get('quiz_type', quiz.quiz_type),
                'duration': changed_fields.get('duration', quiz.duration),
                'pass_score': changed_fields.get('pass_score', quiz.pass_score),
            }
            self._validate_quiz_data(merged_quiz_data)

        should_create_new_version = quiz.is_current and self._is_referenced_by_task(quiz.id)
        if should_create_new_version:
            quiz = self._create_new_version(quiz, dict(changed_fields))
        elif has_base_changes:
            changed_fields['updated_by'] = self.user
            for key, value in changed_fields.items():
                setattr(quiz, key, value)
            quiz.save(update_fields=list(changed_fields.keys()))

        # 1. 先移除题目
        if remove_question_ids:
            self._remove_questions(quiz_id=quiz.id, question_ids=remove_question_ids)

        # 2. 添加已有题目
        existing_quiz_question_ids = set(get_question_ids(quiz.id))
        for question_id in add_question_ids:
            if question_id not in existing_quiz_question_ids:
                question = Question.objects.filter(pk=question_id).first()
                if not question:
                    raise BusinessError(
                        code=ErrorCodes.RESOURCE_NOT_FOUND,
                        message=f'题目 {question_id} 不存在'
                    )
                self._add_question(quiz_id=quiz.id, question_id=question_id)

        # 3. 创建并添加新题目
        for question_data in new_questions_data:
            self._create_and_add_question(quiz, question_data)

        # 4. 更新题目顺序（如果提供）
        if question_ids is not None:
            self._sync_question_order(quiz, question_ids)

        if has_question_changes and not should_create_new_version and not has_base_changes:
            quiz.updated_by = self.user
            quiz.save(update_fields=['updated_by'])
        return quiz

    @transaction.atomic
    @log_content_action(
        'quiz',
        'delete',
        '{quiz_type_label}，{question_count} 题，{total_score_text} 分',
    )
    def delete(self, pk: int) -> Quiz:
        """
        删除试卷
        Property 14: 被引用试卷删除保护
        Property 16: 试卷所有权编辑控制
        Args:
            pk: 主键
        Returns:
            删除前的试卷对象
        Raises:
            BusinessError: 如果被引用无法删除或无权限
        """
        quiz = self.get_by_id(pk)
        # 检查权限
        self.validate_permission(
            self.check_edit_permission(quiz),
            '只有试卷创建者或管理员可以删除此试卷'
        )
        # 检查是否被引用
        if self._is_referenced_by_task(quiz.id):
            raise BusinessError(
                code=ErrorCodes.RESOURCE_REFERENCED,
                message='该试卷已被任务引用，无法删除'
            )

        # 软删除
        quiz.soft_delete()
        return quiz

    def _create_and_add_question(
        self,
        quiz: Quiz,
        question_data: dict
    ) -> Question:
        """
        创建题目并添加到试卷
        Args:
            quiz: 试卷对象
            question_data: 题目数据字典（会被修改，space_tag_id 会被弹出）
        Returns:
            创建的题目对象
        """
        space_tag_id = question_data.pop('space_tag_id', None)
        # 准备版本数据
        self._prepare_question_version_data(question_data)
        # 准备题目属性
        question_attrs = {
            'created_by': self.user,
            **question_data,
        }
        # 创建题目
        question = Question.objects.create(**question_attrs)
        # 设置space
        if space_tag_id is not None:
            self._set_question_space_tag(question, space_tag_id)
        # 添加到试卷
        self._add_question(
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
        initialize_new_resource_version(data)

    def _prepare_question_version_data(self, data: dict) -> None:
        """
        准备题目版本号相关数据
        Args:
            data: 题目数据字典（会被修改）
        """
        initialize_new_resource_version(data)

    def _set_question_space_tag(self, question: Question, space_tag_id: int) -> None:
        """
        设置题目的space
        Args:
            question: 题目对象
            space_tag_id: space ID
        Raises:
            BusinessError: 如果space无效
        """
        space_tag = Tag.objects.filter(
            id=space_tag_id,
            tag_type='SPACE',
        ).first()
        if not space_tag:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='无效的 space ID'
            )
        question.space_tag = space_tag
        question.save(update_fields=['space_tag'])

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
        question_ids: Optional[List[int]] = None
    ) -> Quiz:
        """
        基于已发布版本创建新版本
        Args:
            source: 源试卷
            data: 更新数据
        Returns:
            新版本的试卷对象
        """
        new_quiz_data = build_next_version_data(
            source,
            actor=self.user,
            copy_fields=self.VERSION_COPY_FIELDS,
            overrides=data,
        )
        deactivate_current_version(Quiz, source.resource_uuid)
        new_quiz = Quiz.objects.create(**new_quiz_data)
        # 复制题目顺序
        if question_ids is None:
            source_questions = list_quiz_questions(source.id)
            for relation in source_questions:
                self._add_question(
                    quiz_id=new_quiz.id,
                    question_id=relation.question_id,
                    order=relation.order
                )
        else:
            for order, question_id in enumerate(question_ids, start=1):
                self._add_question(
                    quiz_id=new_quiz.id,
                    question_id=question_id,
                    order=order
                )
        return new_quiz

    def _sync_question_order(
        self,
        quiz: Quiz,
        question_ids: List[int]
    ) -> None:
        """
        同步题目顺序（按 resource_uuid 去重）
        Args:
            quiz: 试卷对象
            question_ids: 新的题目 ID 顺序列表
        """
        # 获取提交的题目信息，按 resource_uuid 去重（保留最后出现的）
        questions = Question.objects.filter(pk__in=question_ids).values('id', 'resource_uuid')
        question_map = {q['id']: q['resource_uuid'] for q in questions}
        
        # 按 resource_uuid 去重，保留最后出现的 id
        seen_uuids = {}
        for qid in question_ids:
            uuid = question_map.get(qid)
            if uuid:
                seen_uuids[uuid] = qid
        deduped_question_ids = [seen_uuids[question_map[qid]] for qid in question_ids 
                                if qid in question_map and seen_uuids.get(question_map[qid]) == qid]
        
        current_relations = {
            qq.question_id: qq
            for qq in list_quiz_questions(quiz.id)
        }
        new_id_set = set(deduped_question_ids)
        # 移除不再存在的题目
        to_remove = [
            qid for qid in current_relations.keys()
            if qid not in new_id_set
        ]
        if to_remove:
            self._remove_questions(
                quiz_id=quiz.id,
                question_ids=to_remove
            )
        # 重新排序/添加缺失的题目
        for order, question_id in enumerate(deduped_question_ids, start=1):
            relation = current_relations.get(question_id)
            if relation:
                if relation.order != order:
                    relation.order = order
                    relation.save(update_fields=['order'])
            else:
                # 验证题目存在
                question = Question.objects.filter(pk=question_id).first()
                if not question:
                    raise BusinessError(
                        code=ErrorCodes.RESOURCE_NOT_FOUND,
                        message=f'题目 {question_id} 不存在'
                    )
                self._add_question(
                    quiz_id=quiz.id,
                    question_id=question_id,
                    order=order
                )

    def _is_referenced_by_task(self, quiz_id: int) -> bool:
        """检查试卷是否被任务引用"""
        try:
            from apps.tasks.models import TaskQuiz
            return TaskQuiz.objects.filter(quiz_id=quiz_id).exists()
        except ImportError:
            return False
