"""
试卷应用服务
编排业务逻辑。

使用方式（构造器注入）:
    service = QuizService(request)
    quiz = service.get_by_id(pk=123)
"""
from typing import Any, List

from django.db import transaction
from django.db.models import Max

from apps.questions.models import Question
from core.base_service import BaseService
from core.decorators import log_content_action
from core.exceptions import BusinessError, ErrorCodes
from core.versioning import (
    derive_resource_version,
    initialize_new_resource_version,
    is_referenced,
)

from .models import Quiz, QuizQuestion


class QuizService(BaseService):
    """试卷应用服务"""

    # 创建新版本时需要复制的内容字段
    # 添加新的内容字段时，只需在此列表中添加即可
    VERSION_COPY_FIELDS = [
        'title', 'quiz_type',
        'duration', 'pass_score',
    ]

    def _add_question(
        self,
        quiz_id: int,
        question_id: int,
        order: int = None,
        score=None,
    ) -> QuizQuestion:
        if order is None:
            max_order = QuizQuestion.objects.filter(
                quiz_id=quiz_id
            ).aggregate(
                max_order=Max('order')
            )['max_order']
            order = (max_order or 0) + 1
        if score is None:
            question = Question.objects.filter(pk=question_id).only('score').first()
            score = question.score if question else 1
        return QuizQuestion.objects.create(
            quiz_id=quiz_id,
            question_id=question_id,
            order=order,
            score=score,
        )

    def _remove_questions(self, quiz_id: int, question_ids: List[int]) -> None:
        QuizQuestion.objects.filter(
            quiz_id=quiz_id,
            question_id__in=question_ids
        ).delete()

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
        quiz = Quiz.objects.select_related('created_by', 'updated_by').filter(
            pk=pk,
        ).first()
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

    @transaction.atomic
    @log_content_action(
        'quiz',
        'create',
        '{quiz_type_label}，{question_count} 题，{total_score_text} 分',
    )
    def create(
        self,
        data: dict,
        question_versions: List[dict] = None,
    ) -> Quiz:
        """
        创建试卷
        Args:
            data: 试卷数据
            question_versions: 已有题目与分值列表
        Returns:
            创建的试卷对象
        Raises:
            BusinessError: 如果验证失败
        """
        # 1. 准备数据
        data['created_by'] = self.user
        data['updated_by'] = self.user
        # 处理版本号
        initialize_new_resource_version(data)
        # 2. 创建试卷
        quiz = Quiz.objects.create(**data)
        # 3. 添加题目
        question_versions = question_versions or []
        for binding in question_versions:
            self._add_question(
                quiz_id=quiz.id,
                question_id=binding['question_id'],
                score=binding['score'],
            )
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
        question_versions: List[dict] = None,
    ) -> Quiz:
        """
        更新试卷（支持原子性操作）
        Property 16: 试卷所有权编辑控制
        Args:
            pk: 主键
            data: 更新数据
            question_versions: 新的题目与分值列表（可选，会覆盖现有顺序）
        Returns:
            更新后的试卷对象
        Raises:
            BusinessError: 如果验证失败或无法更新
        """
        quiz = self.get_by_id(pk)
        if not quiz.is_current:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='历史版本不可修改'
            )
        has_question_changes = question_versions is not None
        changed_fields = {
            field: value
            for field, value in data.items()
            if field in self.VERSION_COPY_FIELDS and getattr(quiz, field, None) != value
        }
        has_base_changes = bool(changed_fields)
        if not has_base_changes and not has_question_changes:
            return quiz

        should_create_new_version = quiz.is_current and self._is_referenced_by_task(quiz.id)
        if should_create_new_version:
            quiz = self._create_new_version(quiz, dict(changed_fields))
        elif has_base_changes:
            changed_fields['updated_by'] = self.user
            for key, value in changed_fields.items():
                setattr(quiz, key, value)
            quiz.save(update_fields=list(changed_fields.keys()))

        if question_versions is not None:
            self._sync_question_bindings(quiz, question_versions)

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
        # 检查是否被引用
        if self._is_referenced_by_task(quiz.id):
            raise BusinessError(
                code=ErrorCodes.RESOURCE_REFERENCED,
                message='该试卷已被任务引用，无法删除'
            )

        quiz.delete()
        return quiz

    def _create_new_version(
        self,
        source: Quiz,
        data: dict,
    ) -> Quiz:
        """
        基于已发布版本创建新版本
        Args:
            source: 源试卷
            data: 更新数据
        Returns:
            新版本的试卷对象
        """
        def finalize_new_quiz(new_quiz: Quiz) -> None:
            source_questions = source.quiz_questions.select_related('question', 'quiz').order_by('order')
            for relation in source_questions:
                self._add_question(
                    quiz_id=new_quiz.id,
                    question_id=relation.question_id,
                    order=relation.order,
                    score=relation.score,
                )

        return derive_resource_version(
            source,
            actor=self.user,
            copy_fields=self.VERSION_COPY_FIELDS,
            overrides=data,
            finalize=finalize_new_quiz,
        )

    def _sync_question_bindings(
        self,
        quiz: Quiz,
        question_versions: List[dict[str, Any]]
    ) -> None:
        """
        同步题目顺序与分值（按 resource_uuid 去重）
        Args:
            quiz: 试卷对象
            question_versions: 新的题目与分值列表
        """
        question_ids = [item['question_id'] for item in question_versions]
        questions = Question.objects.filter(pk__in=question_ids).values('id', 'resource_uuid')
        question_map = {q['id']: q['resource_uuid'] for q in questions}

        # 按 resource_uuid 去重，保留最后出现的题目和分值
        seen_uuids: dict[Any, dict[str, Any]] = {}
        for item in question_versions:
            qid = item['question_id']
            uuid = question_map.get(qid)
            if uuid:
                seen_uuids[uuid] = item
        deduped_question_versions = [
            seen_uuids[question_map[item['question_id']]]
            for item in question_versions
            if item['question_id'] in question_map
            and seen_uuids.get(question_map[item['question_id']]) == item
        ]

        current_relations = {
            qq.question_id: qq
            for qq in quiz.quiz_questions.select_related('question', 'quiz').order_by('order')
        }
        new_id_set = {item['question_id'] for item in deduped_question_versions}
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
        for order, item in enumerate(deduped_question_versions, start=1):
            question_id = item['question_id']
            score = item['score']
            relation = current_relations.get(question_id)
            if relation:
                changed_fields = []
                if relation.order != order:
                    relation.order = order
                    changed_fields.append('order')
                if relation.score != score:
                    relation.score = score
                    changed_fields.append('score')
                if changed_fields:
                    relation.save(update_fields=changed_fields)
            else:
                if question_id not in question_map:
                    raise BusinessError(
                        code=ErrorCodes.RESOURCE_NOT_FOUND,
                        message=f'题目 {question_id} 不存在'
                    )
                self._add_question(
                    quiz_id=quiz.id,
                    question_id=question_id,
                    order=order,
                    score=score,
                )

    def _is_referenced_by_task(self, quiz_id: int) -> bool:
        """检查试卷是否被任务引用"""
        from apps.tasks.models import TaskQuiz
        return is_referenced(quiz_id, TaskQuiz, 'quiz_id')
