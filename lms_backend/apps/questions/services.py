"""
题目应用服务
编排业务逻辑。

使用方式（构造器注入）:
    service = QuestionService(request)
    question = service.get_by_id(pk=123)
"""
import uuid

from django.db import transaction

from apps.knowledge.models import Tag
from core.base_service import BaseService
from core.decorators import log_content_action
from core.exceptions import BusinessError, ErrorCodes

from .models import Question
from .selectors import (
    apply_question_filters,
    get_question_by_id,
    question_base_queryset,
)


class QuestionService(BaseService):
    """题目应用服务"""

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
        if self.user and self.get_current_role() != 'ADMIN':
            if not filters:
                filters = {}
            if 'is_current' not in filters:
                filters['is_current'] = True

        queryset = question_base_queryset(include_deleted=False).filter(is_current=True)
        queryset = apply_question_filters(queryset, filters, search)

        # 排序
        if ordering:
            queryset = queryset.order_by(ordering)

        return queryset

    def get_list(
        self,
        filters: dict = None,
        search: str = None,
        ordering: str = '-created_at',
        page: int = 1,
        page_size: int = 10
    ) -> dict:
        """
        获取题目列表（已废弃，请使用 get_queryset）
        Args:
            filters: 过滤条件
            search: 搜索关键词
            ordering: 排序字段
            page: 页码
            page_size: 每页数量
        Returns:
            包含题目列表和分页信息的字典
        """
        queryset = self.get_queryset(filters, search, ordering)

        # 分页处理
        total_count = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        questions = queryset[start:end]

        return {
            'count': total_count,
            'results': list(questions),
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size
        }

    def check_edit_permission(self, question: Question) -> bool:
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
        # 管理员可以编辑/删除任何题目
        if self.get_current_role() == 'ADMIN':
            return True
        # 其他人只能编辑/删除自己创建的题目
        if question.created_by_id != self.user.id:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有题目创建者或管理员可以操作此题目'
            )
        return True

    @transaction.atomic
    @log_content_action('question', 'create', '创建题目：{result.question_type}')
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
        data.setdefault('is_current', True)
        # 处理版本号
        self._prepare_version_data(data)
        # 提取条线类型数据
        line_type_id = data.pop('line_type_id', None)
        # 3. 创建题目
        question = Question.objects.create(**data)
        Question.objects.filter(
            resource_uuid=question.resource_uuid
        ).exclude(pk=question.pk).update(is_current=False)
        # 4. 设置条线类型
        if line_type_id:
            self._set_line_type(question, line_type_id)

        return question

    @transaction.atomic
    @log_content_action('question', 'update', '更新题目：{result.question_type}（版本 {result.version_number}）')
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
        self.check_edit_permission(question)
        # 当前版本需要创建新版本
        if question.is_current:
            return self._create_new_version(question, data)
        # 非当前版本直接更新
        # 合并现有数据以进行验证
        merged_data = {
            'question_type': question.question_type,
            'options': data.get('options', question.options),
            'answer': data.get('answer', question.answer),
        }
        self._validate_question_data(merged_data)
        # 提取条线类型数据
        line_type_id = data.pop('line_type_id', None)
        # 更新题目
        data['updated_by'] = self.user
        if data:
            for key, value in data.items():
                setattr(question, key, value)
            question.save(update_fields=list(data.keys()))
        # 更新条线类型
        if line_type_id is not None:
            self._set_line_type(question, line_type_id)
        return question

    @transaction.atomic
    @log_content_action('question', 'delete', '删除题目：{result.question_type}')
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
        self.check_edit_permission(question)
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

    def _set_line_type(self, question: Question, line_type_id: int) -> None:
        """
        设置条线类型
        Args:
            question: 题目对象
            line_type_id: 条线类型ID
        Raises:
            BusinessError: 如果条线类型无效
        """
        line_type = Tag.objects.filter(
            id=line_type_id,
            tag_type='LINE',
            is_active=True
        ).first()
        if not line_type:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='无效的条线类型ID'
            )
        question.set_line_type(line_type)

    def _prepare_version_data(self, data: dict) -> None:
        """
        准备版本号相关数据
        Args:
            data: 题目数据字典（会被修改）
        """
        data.pop('resource_uuid', None)
        data['resource_uuid'] = uuid.uuid4()
        data['version_number'] = 1

    def _create_new_version(
        self,
        source: Question,
        data: dict
    ) -> Question:
        """基于已发布版本创建新版本"""
        # 计算新版本号
        existing_versions = list(
            Question.objects.filter(
                resource_uuid=source.resource_uuid,
                is_deleted=False
            ).values_list('version_number', flat=True)
        )
        new_version_number = max(existing_versions) + 1 if existing_versions else 1
        # 提取条线类型数据
        line_type_id = data.pop('line_type_id', None)
        # 准备新版本数据
        new_question_data = {
            'resource_uuid': source.resource_uuid,
            'version_number': new_version_number,
            'content': data.get('content', source.content),
            'question_type': data.get('question_type', source.question_type),
            'options': data.get('options', source.options),
            'answer': data.get('answer', source.answer),
            'explanation': data.get('explanation', source.explanation),
            'score': data.get('score', source.score),
            'is_current': True,
            'created_by': self.user,
            'updated_by': self.user,
        }
        new_question = Question.objects.create(**new_question_data)
        # 设置条线类型
        if line_type_id:
            self._set_line_type(new_question, line_type_id)
        elif source.line_type:
            new_question.set_line_type(source.line_type)
        # 取消其他版本的 is_current 标志
        Question.objects.filter(
            resource_uuid=source.resource_uuid
        ).exclude(pk=new_question.pk).update(is_current=False)

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
