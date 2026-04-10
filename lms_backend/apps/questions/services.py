"""
题目应用服务
编排业务逻辑。

使用方式（构造器注入）:
    service = QuestionService(request)
    question = service.get_by_id(pk=123)
"""
from typing import Optional

from django.db import transaction
from apps.authorization.engine import enforce
from apps.tags.validators import get_space_tag_or_error, get_tag_ids_or_error
from core.base_service import BaseService
from core.decorators import log_content_action
from core.exceptions import BusinessError, ErrorCodes
from core.versioning import (
    build_next_version_data,
    deactivate_current_version,
    initialize_new_resource_version,
    is_referenced,
)

from .models import Question
from .selectors import (
    apply_question_filters,
    get_question_by_id,
    question_base_queryset,
)


class QuestionService(BaseService):
    """题目应用服务"""

    # 创建新版本时需要复制的内容字段
    # 添加新的内容字段时，只需在此列表中添加即可
    VERSION_COPY_FIELDS = [
        'content', 'question_type', 'options', 'answer',
        'explanation', 'score',
    ]

    def get_by_id(self, pk: int) -> Question:
        """
        获取题目
        Args:
            pk: 主键
        Returns:
            题目对象
        Raises:
            BusinessError: 如果不存在或无权限
        """
        question = get_question_by_id(pk)
        self.validate_not_none(question, f'题目 {pk} 不存在')
        # 权限检查：非管理员只能访问已发布的题目
        self.check_published_resource_access(question, resource_name='题目')
        return question

    def get_queryset(
        self,
        filters: dict = None,
        search: str = None,
        ordering: str = '-created_at'
    ):
        """
        获取题目 QuerySet（用于分页）
        Args:
            filters: 过滤条件
            search: 搜索关键词
            ordering: 排序字段
        Returns:
            QuerySet
        """
        # 题目管理默认只显示当前版本
        filters = dict(filters or {})
        filters.setdefault('is_current', True)

        queryset = question_base_queryset(include_deleted=False)
        queryset = apply_question_filters(queryset, filters, search)

        # 排序
        if ordering:
            queryset = queryset.order_by(ordering)

        return queryset

    def check_edit_permission(
        self,
        _question: Question,
        *,
        permission_code: str,
        error_message: str,
    ) -> bool:
        """
        检查用户是否有编辑/删除权限
        Property 15: 题目所有权编辑控制
        Args:
            question: 题目对象
        Returns:
            True 如果有权限
        Raises:
            BusinessError: 如果权限不足
        """
        enforce(permission_code, self.request, error_message=error_message)
        return True

    @transaction.atomic
    @log_content_action('question', 'create', '{question_type_label}，{score_text} 分')
    def create(self, data: dict) -> Question:
        """
        创建题目
        Args:
            data: 题目数据
        Returns:
            创建的题目对象
        Raises:
            BusinessError: 如果验证失败
        """
        source_question_id = data.pop('source_question_id', None)
        sync_to_bank = data.pop('sync_to_bank', True)
        if source_question_id is not None:
            source = get_question_by_id(source_question_id)
            self.validate_not_none(source, f'题目 {source_question_id} 不存在')
            self._validate_merged_question_data(source, data)
            return self._spawn_question_version(
                source,
                data,
                sync_to_bank=sync_to_bank,
            )

        # 1. 业务验证
        self._validate_question_data(data)
        # 2. 准备数据
        data['created_by'] = self.user
        data['updated_by'] = self.user
        # 处理版本号
        self._prepare_version_data(data, sync_to_bank=sync_to_bank)
        # 提取space数据
        space_tag_id = data.pop('space_tag_id', None)
        tag_ids = data.pop('tag_ids', [])
        # 3. 创建题目
        question = Question.objects.create(**data)
        # 4. 设置space
        if space_tag_id is not None:
            self._set_space_tag(question, space_tag_id)
        if tag_ids is not None:
            question.tags.set(self._get_tag_ids_or_error(tag_ids))

        return question

    @transaction.atomic
    @log_content_action(
        'question',
        'update',
        '{question_identity}，{question_update_summary}',
    )
    def update(self, pk: int, data: dict) -> Question:
        """
        更新题目
        Args:
            pk: 主键
            data: 更新数据
        Returns:
            更新后的题目对象
        Raises:
            BusinessError: 如果验证失败或无法更新
        """
        question = self.get_by_id(pk)
        sync_to_bank = data.pop('sync_to_bank', True)
        # 检查编辑权限
        self.check_edit_permission(
            question,
            permission_code='question.update',
            error_message='无权编辑此题目',
        )
        if not question.is_current:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='历史版本不可修改'
            )
        self._validate_merged_question_data(question, data)
        # 提取space数据
        space_tag_provided = 'space_tag_id' in data
        space_tag_id = data.pop('space_tag_id', None) if space_tag_provided else None
        tag_ids_provided = 'tag_ids' in data
        tag_ids = data.pop('tag_ids', None) if tag_ids_provided else None
        current_tag_ids = self._list_question_tag_ids(question)

        changed_fields = {
            key: value
            for key, value in data.items()
            if getattr(question, key, None) != value
        }
        normalized_tag_ids = (
            self._get_tag_ids_or_error(tag_ids or [])
            if tag_ids_provided
            else current_tag_ids
        )
        space_changed = space_tag_provided and space_tag_id != question.space_tag_id
        tags_changed = (
            tag_ids_provided
            and set(normalized_tag_ids) != set(current_tag_ids)
        )
        has_changes = bool(changed_fields or space_changed or tags_changed)
        if not has_changes:
            return question

        if self._should_fork_question_version(question, sync_to_bank=sync_to_bank):
            new_version_data = dict(changed_fields)
            if space_tag_provided:
                new_version_data['space_tag_id'] = space_tag_id
            if tag_ids_provided:
                new_version_data['tag_ids'] = normalized_tag_ids
            return self._spawn_question_version(
                question,
                new_version_data,
                sync_to_bank=sync_to_bank,
            )

        changed_fields['updated_by'] = self.user
        for key, value in changed_fields.items():
            setattr(question, key, value)
        question.save(update_fields=list(changed_fields.keys()))
        self._apply_space_tag_change(question, space_tag_id, space_changed)
        if tags_changed:
            question.tags.set(normalized_tag_ids)
        return question

    @transaction.atomic
    @log_content_action('question', 'delete', '{question_type_label}，{score_text} 分')
    def delete(self, pk: int) -> Question:
        """
        删除题目
        Args:
            pk: 主键
        Returns:
            删除前的题目对象
        Raises:
            BusinessError: 如果被引用无法删除
        """
        question = get_question_by_id(pk)
        self.validate_not_none(question, f'题目 {pk} 不存在')
        # 检查编辑权限
        self.check_edit_permission(
            question,
            permission_code='question.delete',
            error_message='无权删除此题目',
        )
        # 检查是否被引用
        if self._is_referenced_by_quiz(pk):
            raise BusinessError(
                code=ErrorCodes.RESOURCE_REFERENCED,
                message='该题目已被试卷引用，无法删除'
            )

        # 软删除
        question.soft_delete()
        return question

    def _validate_question_data(self, data: dict) -> None:
        """验证题目数据"""
        question_type = data.get('question_type')
        options = data.get('options', [])
        answer = data.get('answer')
        
        # 选择题验证
        if question_type in ['SINGLE_CHOICE', 'MULTIPLE_CHOICE']:
            if not options:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='选择题必须设置选项'
                )
            # 验证选项格式
            option_keys = []
            for opt in options:
                if not isinstance(opt, dict) or 'key' not in opt or 'value' not in opt:
                    raise BusinessError(
                        code=ErrorCodes.VALIDATION_ERROR,
                        message='选项格式错误，必须包含 key 和 value'
                    )
                option_keys.append(opt['key'])
            # 验证答案在选项范围内
            if question_type == 'SINGLE_CHOICE':
                if not isinstance(answer, str):
                    raise BusinessError(
                        code=ErrorCodes.VALIDATION_ERROR,
                        message='单选题答案必须是字符串'
                    )
                if answer not in option_keys:
                    raise BusinessError(
                        code=ErrorCodes.VALIDATION_ERROR,
                        message='单选题答案必须是有效的选项'
                    )
            else:  # MULTIPLE_CHOICE
                if not isinstance(answer, list):
                    raise BusinessError(
                        code=ErrorCodes.VALIDATION_ERROR,
                        message='多选题答案必须是列表'
                    )
                for ans in answer:
                    if ans not in option_keys:
                        raise BusinessError(
                            code=ErrorCodes.VALIDATION_ERROR,
                            message=f'多选题答案 {ans} 不是有效的选项'
                        )
        # 判断题验证
        elif question_type == 'TRUE_FALSE':
            if answer not in ['TRUE', 'FALSE']:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='判断题答案必须是 TRUE 或 FALSE'
                )
        # 简答题验证
        elif question_type == 'SHORT_ANSWER':
            if not isinstance(answer, str):
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='简答题答案必须是字符串'
                )

    def _set_space_tag(self, question: Question, space_tag_id: int) -> None:
        question.space_tag = get_space_tag_or_error(space_tag_id)
        question.save(update_fields=['space_tag'])

    def _get_tag_ids_or_error(self, tag_ids: list[int]) -> list[int]:
        return get_tag_ids_or_error(
            tag_ids,
            applicable_field='allow_question',
            invalid_message='包含无效的题目标签ID',
        )

    def _apply_space_tag_change(
        self,
        question: Question,
        space_tag_id: Optional[int],
        space_tag_provided: bool,
    ) -> None:
        """根据请求显式设置或清空space。"""
        if not space_tag_provided:
            return
        if space_tag_id is None:
            if question.space_tag_id is None:
                return
            question.space_tag = None
            question.save(update_fields=['space_tag'])
            return
        self._set_space_tag(question, space_tag_id)

    def _prepare_version_data(self, data: dict, *, sync_to_bank: bool = True) -> None:
        """
        准备版本号相关数据
        Args:
            data: 题目数据字典（会被修改）
        """
        initialize_new_resource_version(data)
        if not sync_to_bank:
            data['is_current'] = False

    def _validate_merged_question_data(self, source: Question, data: dict) -> None:
        """校验 source 叠加本次改动后的题目数据。"""
        merged_data = {
            'question_type': data.get('question_type', source.question_type),
            'options': data.get('options', source.options),
            'answer': data.get('answer', source.answer),
        }
        self._validate_question_data(merged_data)

    def _spawn_question_version(
        self,
        source: Question,
        data: dict,
        *,
        sync_to_bank: bool = True,
    ) -> Question:
        """基于 source 派生题目版本。"""
        version_data, space_tag_id, tag_ids = self._extract_version_payload(source, data)
        new_question_data = build_next_version_data(
            source,
            actor=self.user,
            copy_fields=self.VERSION_COPY_FIELDS,
            overrides=version_data,
        )
        new_question_data['is_current'] = sync_to_bank
        if sync_to_bank:
            deactivate_current_version(Question, source.resource_uuid)
        new_question = Question.objects.create(**new_question_data)
        self._apply_space_tag_change(new_question, space_tag_id, True)
        new_question.tags.set(tag_ids)
        return new_question

    def _extract_version_payload(
        self,
        source: Question,
        data: dict,
    ) -> tuple[dict, Optional[int], list[int]]:
        """拆分版本字段与标签字段，并补齐继承值。"""
        version_data = dict(data)
        space_tag_id = version_data.pop('space_tag_id', source.space_tag_id)
        tag_ids = version_data.pop('tag_ids', self._list_question_tag_ids(source))
        return version_data, space_tag_id, self._get_tag_ids_or_error(tag_ids)

    def _list_question_tag_ids(self, question: Question) -> list[int]:
        return list(question.tags.values_list('id', flat=True))

    def _is_referenced_by_quiz(self, question_id: int) -> bool:
        """检查题目是否被试卷引用"""
        from apps.quizzes.models import QuizQuestion

        return is_referenced(question_id, QuizQuestion, 'question_id')

    def _should_fork_question_version(
        self,
        question: Question,
        *,
        sync_to_bank: bool,
    ) -> bool:
        if not sync_to_bank:
            return True
        return self._has_frozen_version_boundary(question)

    def _has_frozen_version_boundary(self, question: Question) -> bool:
        """题目进入共享或任务快照边界后，必须派生新版本。"""
        from apps.quizzes.models import QuizQuestion
        from apps.tasks.models import TaskQuiz

        quiz_ids = list(
            QuizQuestion.objects.filter(question_id=question.id)
            .values_list('quiz_id', flat=True)
        )
        if not quiz_ids:
            return False
        if len(quiz_ids) > 1:
            return True
        return TaskQuiz.objects.filter(quiz_id__in=quiz_ids).exists()
