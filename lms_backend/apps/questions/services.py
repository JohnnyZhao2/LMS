"""
题目应用服务

编排业务逻辑，协调 Repository 和 Domain Service。
"""
from typing import Optional, List
from django.db import transaction
from django.db.models import QuerySet
from django.utils import timezone

from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes
from .models import Question
from .repositories import QuestionRepository


class QuestionService(BaseService):
    """题目应用服务"""
    
    def __init__(self):
        self.repository = QuestionRepository()
    
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
        if user and not user.is_admin:
            if question.status != 'PUBLISHED' or not question.is_current:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='无权访问该题目'
                )
        
        return question
    
    def get_list(
        self,
        filters: dict = None,
        search: str = None,
        ordering: str = '-created_at',
        page: int = 1,
        page_size: int = 20,
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
        # 非管理员默认只显示已发布的题目
        if user and not user.is_admin:
            if not filters:
                filters = {}
            if 'status' not in filters:
                filters['status'] = 'PUBLISHED'
        
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
        
        Requirements: 5.3, 5.4, 5.5
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
        data.setdefault('status', 'PUBLISHED')
        data.setdefault('is_current', True)
        data.setdefault('published_at', timezone.now())
        
        # 处理版本号
        import uuid
        if not data.get('resource_uuid'):
            data['resource_uuid'] = uuid.uuid4()
        data['version_number'] = Question.next_version_number(data.get('resource_uuid'))
        
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
        
        # 已发布的题目需要创建新版本
        if question.status == 'PUBLISHED':
            return self._create_new_version(question, data, user)
        
        # 草稿直接更新
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
    def import_from_excel(self, file, user) -> dict:
        """
        从 Excel 文件批量导入题目
        
        Args:
            file: Excel 文件
            user: 导入用户
            
        Returns:
            导入结果字典
            
        Raises:
            BusinessError: 如果导入失败
        """
        try:
            import openpyxl
        except ImportError:
            raise BusinessError(
                code='IMPORT_ERROR',
                message='服务器未安装 openpyxl 库，无法处理 Excel 文件'
            )
        
        try:
            workbook = openpyxl.load_workbook(file)
            sheet = workbook.active
        except Exception as e:
            raise BusinessError(
                code='IMPORT_ERROR',
                message=f'无法读取 Excel 文件: {str(e)}'
            )
        
        # 解析题目数据
        questions_data = []
        errors = []
        
        # 跳过表头
        for row_num, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            if not row or not row[0]:  # 跳过空行
                continue
            
            try:
                question_data = self._parse_excel_row(row, row_num)
                questions_data.append(question_data)
            except ValueError as e:
                errors.append(f'第 {row_num} 行: {str(e)}')
        
        if errors:
            raise BusinessError(
                code='IMPORT_ERROR',
                message='导入数据存在错误',
                details={'errors': errors}
            )
        
        # 创建题目
        created_questions = []
        for data in questions_data:
            data['created_by'] = user
            data['status'] = 'PUBLISHED'
            data['is_current'] = True
            data['published_at'] = timezone.now()
            import uuid
            if not data.get('resource_uuid'):
                data['resource_uuid'] = uuid.uuid4()
            data.setdefault(
                'version_number',
                Question.next_version_number(data.get('resource_uuid'))
            )
            question = self.repository.create(**data)
            created_questions.append(question)
        
        return {
            'message': f'成功导入 {len(created_questions)} 道题目',
            'count': len(created_questions)
        }
    
    def _validate_question_data(self, data: dict, question_type: str = None) -> None:
        """验证题目数据"""
        question_type = question_type or data.get('question_type')
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
        """设置条线类型"""
        from apps.knowledge.models import Tag
        
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
    
    def _create_new_version(
        self,
        source: Question,
        data: dict,
        user
    ) -> Question:
        """基于已发布版本创建新版本"""
        # 使用 Model 的 clone_new_version 方法
        new_question = source.clone_new_version()
        
        # 更新字段
        for key, value in data.items():
            if hasattr(new_question, key) and key != 'line_type_id':
                setattr(new_question, key, value)
        
        new_question.save()
        
        # 更新条线类型
        line_type_id = data.get('line_type_id')
        if line_type_id is not None:
            if line_type_id:
                self._set_line_type(new_question, line_type_id)
            else:
                new_question.set_line_type(None)
        
        return new_question
    
    def _parse_excel_row(self, row, row_num) -> dict:
        """
        解析 Excel 行数据
        
        Expected columns:
        0: 题目内容
        1: 题目类型 (单选/多选/判断/简答)
        2-5: 选项A-D (for choice questions)
        6: 答案
        7: 解析
        8: 分值
        9: 难度 (简单/中等/困难)
        10: 标签 (逗号分隔)
        """
        content = row[0]
        if not content:
            raise ValueError('题目内容不能为空')
        
        # 解析题目类型
        type_map = {
            '单选': 'SINGLE_CHOICE',
            '单选题': 'SINGLE_CHOICE',
            '多选': 'MULTIPLE_CHOICE',
            '多选题': 'MULTIPLE_CHOICE',
            '判断': 'TRUE_FALSE',
            '判断题': 'TRUE_FALSE',
            '简答': 'SHORT_ANSWER',
            '简答题': 'SHORT_ANSWER',
        }
        question_type_str = str(row[1]).strip() if row[1] else ''
        question_type = type_map.get(question_type_str)
        if not question_type:
            raise ValueError(f'无效的题目类型: {question_type_str}')
        
        # 解析选项（选择题）
        options = []
        if question_type in ['SINGLE_CHOICE', 'MULTIPLE_CHOICE']:
            for i, key in enumerate(['A', 'B', 'C', 'D']):
                option_value = row[2 + i] if len(row) > 2 + i else None
                if option_value:
                    options.append({'key': key, 'value': str(option_value)})
            
            if not options:
                raise ValueError('选择题必须设置选项')
        
        # 解析答案
        answer_str = str(row[6]).strip() if len(row) > 6 and row[6] else ''
        if not answer_str:
            raise ValueError('答案不能为空')
        
        if question_type == 'SINGLE_CHOICE':
            answer = answer_str.upper()
            option_keys = [opt['key'] for opt in options]
            if answer not in option_keys:
                raise ValueError(f'单选题答案 {answer} 不在选项范围内')
        elif question_type == 'MULTIPLE_CHOICE':
            # 多个答案用逗号或空格分隔
            answer = [a.strip().upper() for a in answer_str.replace(',', ' ').replace('，', ' ').split()]
            option_keys = [opt['key'] for opt in options]
            for a in answer:
                if a not in option_keys:
                    raise ValueError(f'多选题答案 {a} 不在选项范围内')
        elif question_type == 'TRUE_FALSE':
            true_values = ['TRUE', '对', '正确', 'T', '是', '1']
            false_values = ['FALSE', '错', '错误', 'F', '否', '0']
            if answer_str.upper() in true_values:
                answer = 'TRUE'
            elif answer_str.upper() in false_values:
                answer = 'FALSE'
            else:
                raise ValueError(f'判断题答案无效: {answer_str}')
        else:  # SHORT_ANSWER
            answer = answer_str
        
        # 解析解析
        explanation = str(row[7]).strip() if len(row) > 7 and row[7] else ''
        
        # 解析分值
        score = 1.0
        if len(row) > 8 and row[8]:
            try:
                score = float(row[8])
            except (ValueError, TypeError):
                raise ValueError(f'分值格式错误: {row[8]}')
        
        # 解析难度
        difficulty_map = {
            '简单': 'EASY',
            '中等': 'MEDIUM',
            '困难': 'HARD',
            'EASY': 'EASY',
            'MEDIUM': 'MEDIUM',
            'HARD': 'HARD',
        }
        difficulty_str = str(row[9]).strip() if len(row) > 9 and row[9] else '中等'
        difficulty = difficulty_map.get(difficulty_str, 'MEDIUM')
        
        return {
            'content': str(content),
            'question_type': question_type,
            'options': options,
            'answer': answer,
            'explanation': explanation,
            'score': score,
            'difficulty': difficulty,
        }
