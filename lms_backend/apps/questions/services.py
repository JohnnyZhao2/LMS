"""
题目应用服务
编排业务逻辑，协调 Repository。
"""
import uuid
from typing import List
from django.db import transaction
from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes
from .models import Question
from .repositories import QuestionRepository
from apps.knowledge.repositories import TagRepository
class QuestionService(BaseService):
    """题目应用服务"""
    def __init__(self):
        self.repository = QuestionRepository()
        self.tag_repository = TagRepository()
    def get_by_id(self, pk: int, user=None) -> Question:
        """
        获取题目
        Args:
            pk: 主键
            user: 当前用户（用于权限检查）
        Returns:
            题目对象
        Raises:
            BusinessError: 如果不存在或无权限
        """
        question = self.repository.get_by_id(pk)
        self.validate_not_none(
            question,
            f'题目 {pk} 不存在'
        )
        # 权限检查：非管理员只能访问已发布的题目
        self.check_published_resource_access(question, user, '题目')
        return question
    def get_list(
        self,
        filters: dict = None,
        search: str = None,
        ordering: str = '-created_at',
        page: int = 1,
        page_size: int = 10,
        user=None
    ) -> dict:
        """
        获取题目列表
        Args:
            filters: 过滤条件
            search: 搜索关键词
            ordering: 排序字段
            page: 页码
            page_size: 每页数量
            user: 当前用户（用于权限检查）
        Returns:
            包含题目列表和分页信息的字典
        """
        # 非管理员默认只显示当前版本的题目
        if user and not user.is_admin:
            if not filters:
                filters = {}
            if 'is_current' not in filters:
                filters['is_current'] = True
        queryset = self.repository.get_all_with_filters(
            filters=filters,
            search=search,
            ordering=ordering
        )
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
    def check_edit_permission(self, question: Question, user) -> bool:
        """
        检查用户是否有编辑/删除权限
        Property 15: 题目所有权编辑控制
        Args:
            question: 题目对象
            user: 当前用户
        Returns:
            True 如果有权限
        Raises:
            BusinessError: 如果权限不足
        """
        # 管理员可以编辑/删除任何题目
        if user.is_admin or (hasattr(user, 'current_role') and user.current_role == 'ADMIN'):
            return True
        # 其他人只能编辑/删除自己创建的题目
        if question.created_by_id != user.id:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有题目创建者或管理员可以操作此题目'
            )
        return True
    @transaction.atomic
    def create(self, data: dict, user) -> Question:
        """
        创建题目
        Args:
            data: 题目数据
            user: 创建用户
        Returns:
            创建的题目对象
        Raises:
            BusinessError: 如果验证失败
        """
        # 1. 业务验证
        self._validate_question_data(data)
        # 2. 准备数据
        data['created_by'] = user
        data.setdefault('is_current', True)
        # 处理版本号
        self._prepare_version_data(data)
        # 提取条线类型数据
        line_type_id = data.pop('line_type_id', None)
        # 3. 创建题目
        question = self.repository.create(**data)
        # 4. 设置条线类型
        if line_type_id:
            self._set_line_type(question, line_type_id)
        return question
    @transaction.atomic
    def update(self, pk: int, data: dict, user) -> Question:
        """
        更新题目
        Args:
            pk: 主键
            data: 更新数据
            user: 更新用户
        Returns:
            更新后的题目对象
        Raises:
            BusinessError: 如果验证失败或无法更新
        """
        question = self.get_by_id(pk, user)
        # 检查编辑权限
        self.check_edit_permission(question, user)
        # 当前版本需要创建新版本
        if question.is_current:
            return self._create_new_version(question, data, user)
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
        question = self.repository.update(question, **data)
        # 更新条线类型
        if line_type_id is not None:
            self._set_line_type(question, line_type_id)
        return question
    @transaction.atomic
    def delete(self, pk: int, user) -> None:
        """
        删除题目
        Args:
            pk: 主键
            user: 操作用户
        Raises:
            BusinessError: 如果被引用无法删除
        """
        question = self.repository.get_by_id(pk)
        self.validate_not_none(
            question,
            f'题目 {pk} 不存在'
        )
        # 检查编辑权限
        self.check_edit_permission(question, user)
        # 检查是否被引用
        if self.repository.is_referenced_by_quiz(pk):
            raise BusinessError(
                code=ErrorCodes.RESOURCE_REFERENCED,
                message='该题目已被试卷引用，无法删除'
            )
        # 软删除
        self.repository.delete(question, soft=True)
    @transaction.atomic
    def publish(self, pk: int, user) -> Question:
        """
        发布题目
        Args:
            pk: 主键
            user: 发布用户
        Returns:
            发布后的题目对象
        Raises:
            BusinessError: 如果无法发布
        """
        question = self.get_by_id(pk, user)
        # 检查是否已经是当前版本
        if question.is_current:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='题目已经是当前版本'
            )
        # 验证题目内容
        if not question.content.strip():
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='题目内容不能为空'
            )
        # 设置为当前版本
        question.is_current = True
        question.save()
        # 取消其他版本的 is_current 标志
        Question.objects.filter(
            resource_uuid=question.resource_uuid
        ).exclude(pk=pk).update(is_current=False)
        return question
    @transaction.atomic
    def unpublish(self, pk: int, user) -> Question:
        """
        取消发布题目
        Args:
            pk: 主键
            user: 操作用户
        Returns:
            取消发布后的题目对象
        Raises:
            BusinessError: 如果无法取消发布
        """
        question = self.get_by_id(pk, user)
        # 检查是否是当前版本
        if not question.is_current:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='题目不是当前版本'
            )
        # 检查是否被引用
        if self.repository.is_referenced_by_quiz(pk):
            raise BusinessError(
                code=ErrorCodes.RESOURCE_REFERENCED,
                message='该题目已被试卷引用，无法取消发布'
            )
        # 取消当前版本标志
        question.is_current = False
        question.save()
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
        # 通过Repository获取条线类型标签
        line_type = self.tag_repository.get_all(
            filters={'id': line_type_id, 'tag_type': 'LINE', 'is_active': True}
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
        if not data.get('resource_uuid'):
            data['resource_uuid'] = uuid.uuid4()
        data['version_number'] = Question.next_version_number(data.get('resource_uuid'))
    def _create_new_version(
        self,
        source: Question,
        data: dict,
        user
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
            'difficulty': data.get('difficulty', source.difficulty),
            'source_version_id': source.id,
            'is_current': True,
            'created_by': user,
        }
        new_question = self.repository.create(**new_question_data)
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
