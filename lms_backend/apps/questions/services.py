"""
题目应用服务
编排业务逻辑。

使用方式（构造器注入）:
    service = QuestionService(request)
    question = service.get_by_id(pk=123)
"""
from typing import Optional

from django.db import transaction

from apps.authorization.policies import can_manage_owned_resource
from apps.authorization.services import AuthorizationService
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
        # 非管理员默认只显示当前版本的题目
        if self.user and not is_admin_like_role(self.get_current_role()):
            if not filters:
                filters = {}
            if 'is_current' not in filters:
                filters['is_current'] = True

        queryset = question_base_queryset(include_deleted=False)
        queryset = apply_question_filters(queryset, filters, search)

        # 排序
        if ordering:
            queryset = queryset.order_by(ordering)

        return queryset

    def check_edit_permission(
        self,
        question: Question,
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
        authorization_service = AuthorizationService(self.request)
        if can_manage_owned_resource(
            current_role=self.get_current_role(),
            actor_user_id=getattr(self.user, 'id', None),
            owner_user_id=question.created_by_id,
            has_allow_override=authorization_service.has_allow_override(permission_code),
        ):
            return True
        raise BusinessError(
            code=ErrorCodes.PERMISSION_DENIED,
            message=error_message,
        )

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
        # 1. 业务验证
        self._validate_question_data(data)
        # 2. 准备数据
        data['created_by'] = self.user
        data['updated_by'] = self.user
        # 处理版本号
        self._prepare_version_data(data)
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
        # 检查编辑权限
        self.check_edit_permission(
            question,
            permission_code='question.update',
            error_message='只有题目创建者或管理员可以操作此题目',
        )
        if not question.is_current:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='历史版本不可修改'
            )
        # 合并现有数据以进行验证
        merged_data = {
            'question_type': question.question_type,
            'options': data.get('options', question.options),
            'answer': data.get('answer', question.answer),
        }
        self._validate_question_data(merged_data)
        # 提取space数据
        space_tag_provided = 'space_tag_id' in data
        space_tag_id = data.pop('space_tag_id', None) if space_tag_provided else None
        tag_ids_provided = 'tag_ids' in data
        tag_ids = data.pop('tag_ids', None) if tag_ids_provided else None

        changed_fields = {
            key: value
            for key, value in data.items()
            if getattr(question, key, None) != value
        }
        normalized_tag_ids = (
            self._get_tag_ids_or_error(tag_ids or [])
            if tag_ids_provided
            else list(question.tags.values_list('id', flat=True))
        )
        space_changed = space_tag_provided and space_tag_id != question.space_tag_id
        tags_changed = (
            tag_ids_provided
            and set(normalized_tag_ids) != set(question.tags.values_list('id', flat=True))
        )
        has_changes = bool(changed_fields or space_changed or tags_changed)
        if not has_changes:
            return question

        # 当前版本且已被试卷引用时，分叉新版本；否则原地更新
        if question.is_current and self._is_referenced_by_quiz(question.id):
            new_version_data = dict(changed_fields)
            if space_tag_provided:
                new_version_data['space_tag_id'] = space_tag_id
            if tag_ids_provided:
                new_version_data['tag_ids'] = normalized_tag_ids
            return self._create_new_version(question, new_version_data)

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
            error_message='只有题目创建者或管理员可以操作此题目',
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
        """
        设置space
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

    def _get_tag_ids_or_error(self, tag_ids: list[int]) -> list[int]:
        if not tag_ids:
            return []

        valid_tag_ids = set(
            Tag.objects.filter(
                id__in=tag_ids,
                tag_type='TAG',
                allow_question=True,
            ).values_list('id', flat=True)
        )
        invalid_tag_ids = [tag_id for tag_id in tag_ids if tag_id not in valid_tag_ids]
        if invalid_tag_ids:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='包含无效的题目标签ID',
                details={'invalid_tag_ids': invalid_tag_ids},
            )

        deduped_tag_ids = []
        seen_ids = set()
        for tag_id in tag_ids:
            if tag_id in seen_ids:
                continue
            seen_ids.add(tag_id)
            deduped_tag_ids.append(tag_id)
        return deduped_tag_ids

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

    def _prepare_version_data(self, data: dict) -> None:
        """
        准备版本号相关数据
        Args:
            data: 题目数据字典（会被修改）
        """
        initialize_new_resource_version(data)

    def _create_new_version(
        self,
        source: Question,
        data: dict
    ) -> Question:
        """基于已发布版本创建新版本"""
        # 提取space数据
        space_tag_provided = 'space_tag_id' in data
        space_tag_id = data.pop('space_tag_id', None)
        tag_ids_provided = 'tag_ids' in data
        tag_ids = data.pop('tag_ids', None)
        new_question_data = build_next_version_data(
            source,
            actor=self.user,
            copy_fields=self.VERSION_COPY_FIELDS,
            overrides=data,
        )
        deactivate_current_version(Question, source.resource_uuid)
        new_question = Question.objects.create(**new_question_data)
        # 设置space
        if space_tag_provided:
            self._apply_space_tag_change(new_question, space_tag_id, True)
        elif source.space_tag:
            new_question.space_tag = source.space_tag
            new_question.save(update_fields=['space_tag'])
        inherited_tag_ids = (
            tag_ids
            if tag_ids_provided
            else list(source.tags.values_list('id', flat=True))
        )
        new_question.tags.set(self._get_tag_ids_or_error(inherited_tag_ids))
        return new_question

    def _is_referenced_by_quiz(self, question_id: int) -> bool:
        """检查题目是否被试卷引用"""
        try:
            from apps.quizzes.models import QuizQuestion
            return QuizQuestion.objects.filter(
                question_id=question_id,
                quiz__is_deleted=False
            ).exists()
        except ImportError:
            return False
