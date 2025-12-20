"""
Views for question management.

Implements question CRUD endpoints with ownership control.

Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
Properties:
- Property 13: 被引用题目删除保护
- Property 15: 题目所有权编辑控制
"""
from django.db import models
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter

from core.exceptions import BusinessError, ErrorCodes
from apps.users.permissions import IsAdminOrMentorOrDeptManager, IsAdmin

from .models import Question
from .serializers import (
    QuestionListSerializer,
    QuestionDetailSerializer,
    QuestionCreateSerializer,
    QuestionUpdateSerializer,
    QuestionImportSerializer,
)


class QuestionListCreateView(APIView):
    """
    Question list and create endpoint.
    
    Requirements: 5.1, 5.2
    """
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]
    
    @extend_schema(
        summary='获取题目列表',
        description='获取所有题目，支持类型、难度、标签筛选',
        parameters=[
            OpenApiParameter(name='question_type', type=str, description='题目类型'),
            OpenApiParameter(name='difficulty', type=str, description='难度等级'),
            OpenApiParameter(name='tag', type=str, description='标签'),
            OpenApiParameter(name='search', type=str, description='搜索题目内容'),
            OpenApiParameter(name='created_by', type=int, description='创建者ID'),
            OpenApiParameter(name='line_type_id', type=int, description='条线类型ID'),
        ],
        responses={200: QuestionListSerializer(many=True)},
        tags=['题库管理']
    )
    def get(self, request):
        """
        Get question list.
        
        Requirements: 5.2 - 导师或室经理查看题库时展示所有题目
        """
        queryset = Question.objects.filter(
            is_deleted=False
        ).select_related('created_by')
        
        # Filter by question type
        question_type = request.query_params.get('question_type')
        if question_type:
            queryset = queryset.filter(question_type=question_type)
        
        # Filter by difficulty
        difficulty = request.query_params.get('difficulty')
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)
        
        # Filter by creator
        created_by = request.query_params.get('created_by')
        if created_by:
            queryset = queryset.filter(created_by_id=created_by)
        
        # Search by content
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(content__icontains=search)
        
        # Filter by line_type (通过ResourceLineType关系表)
        line_type_id = request.query_params.get('line_type_id')
        if line_type_id:
            from django.contrib.contenttypes.models import ContentType
            from apps.knowledge.models import ResourceLineType
            question_content_type = ContentType.objects.get_for_model(Question)
            queryset = queryset.filter(
                id__in=ResourceLineType.objects.filter(
                    content_type=question_content_type,
                    line_type_id=line_type_id
                ).values_list('object_id', flat=True)
            )
        
        queryset = queryset.select_related('created_by').order_by('-created_at')
        
        # 分页处理
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        total_count = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        
        questions = queryset[start:end]
        serializer = QuestionListSerializer(questions, many=True)
        
        return Response({
            'count': total_count,
            'results': serializer.data,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size
        }, status=status.HTTP_200_OK)
    
    @extend_schema(
        summary='创建题目',
        description='创建新题目（导师/室经理/管理员）',
        request=QuestionCreateSerializer,
        responses={
            201: QuestionDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['题库管理']
    )
    def post(self, request):
        """
        Create a new question.
        
        Requirements: 5.1 - 创建题目时存储题目内容、类型、答案和解析，并记录创建者
        """
        serializer = QuestionCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        question = serializer.save()
        
        response_serializer = QuestionDetailSerializer(question)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class QuestionDetailView(APIView):
    """
    Question detail, update, delete endpoint.
    
    Requirements: 5.3, 5.4, 5.5, 5.7
    Properties:
    - Property 13: 被引用题目删除保护
    - Property 15: 题目所有权编辑控制
    """
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]
    
    def get_object(self, pk):
        """Get question by ID."""
        try:
            return Question.objects.select_related('created_by').get(
                pk=pk, is_deleted=False
            )
        except Question.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='题目不存在'
            )
    
    def check_edit_permission(self, request, question):
        """
        Check if user can edit/delete the question.
        
        Requirements: 5.3, 5.4, 5.5
        Property 15: 题目所有权编辑控制
        
        - Admin can edit/delete any question
        - Mentor/DeptManager can only edit/delete their own questions
        """
        # Admin can edit/delete any question
        if request.user.is_admin:
            return True
        if hasattr(request.user, 'current_role') and request.user.current_role == 'ADMIN':
            return True
        
        # Others can only edit/delete their own questions
        return question.created_by_id == request.user.id
    
    @extend_schema(
        summary='获取题目详情',
        description='获取指定题目的详细信息',
        responses={
            200: QuestionDetailSerializer,
            404: OpenApiResponse(description='题目不存在'),
        },
        tags=['题库管理']
    )
    def get(self, request, pk):
        """Get question detail."""
        question = self.get_object(pk)
        serializer = QuestionDetailSerializer(question)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @extend_schema(
        summary='更新题目',
        description='更新题目信息（仅创建者或管理员）',
        request=QuestionUpdateSerializer,
        responses={
            200: QuestionDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='题目不存在'),
        },
        tags=['题库管理']
    )
    def patch(self, request, pk):
        """
        Update question.
        
        Requirements: 5.3, 5.5
        Property 15: 题目所有权编辑控制
        """
        question = self.get_object(pk)
        
        # Check edit permission
        if not self.check_edit_permission(request, question):
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有题目创建者或管理员可以编辑此题目'
            )
        
        serializer = QuestionUpdateSerializer(
            question, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        question = serializer.save()
        
        response_serializer = QuestionDetailSerializer(question)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
    
    @extend_schema(
        summary='删除题目',
        description='删除题目（仅创建者或管理员，被试卷引用时禁止删除）',
        responses={
            204: OpenApiResponse(description='删除成功'),
            400: OpenApiResponse(description='题目被试卷引用，无法删除'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='题目不存在'),
        },
        tags=['题库管理']
    )
    def delete(self, request, pk):
        """
        Delete question.
        
        Requirements: 5.4, 5.5, 5.7
        Property 13: 被引用题目删除保护
        Property 15: 题目所有权编辑控制
        """
        question = self.get_object(pk)
        
        # Check edit permission
        if not self.check_edit_permission(request, question):
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有题目创建者或管理员可以删除此题目'
            )
        
        # Check if referenced by quiz (Property 13)
        if question.is_referenced_by_quiz():
            raise BusinessError(
                code=ErrorCodes.RESOURCE_REFERENCED,
                message='该题目已被试卷引用，无法删除'
            )
        
        # Soft delete
        question.soft_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class QuestionImportView(APIView):
    """
    Bulk import questions from Excel.
    
    Requirements: 5.6 - 管理员批量导入题目
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser]
    
    @extend_schema(
        summary='批量导入题目',
        description='从 Excel 文件批量导入题目（仅管理员）',
        request=QuestionImportSerializer,
        responses={
            201: OpenApiResponse(description='导入成功'),
            400: OpenApiResponse(description='文件格式错误或数据无效'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['题库管理']
    )
    def post(self, request):
        """
        Import questions from Excel file.
        
        Requirements: 5.6 - 管理员批量导入题目时解析 Excel 模板并创建题目记录
        
        Expected Excel format:
        | 题目内容 | 题目类型 | 选项A | 选项B | 选项C | 选项D | 答案 | 解析 | 分值 | 难度 | 标签 |
        """
        serializer = QuestionImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        file = serializer.validated_data['file']
        
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
        
        # Parse questions from Excel
        questions_data = []
        errors = []
        
        # Skip header row
        for row_num, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            if not row or not row[0]:  # Skip empty rows
                continue
            
            try:
                question_data = self._parse_row(row, row_num)
                questions_data.append(question_data)
            except ValueError as e:
                errors.append(f'第 {row_num} 行: {str(e)}')
        
        if errors:
            raise BusinessError(
                code='IMPORT_ERROR',
                message='导入数据存在错误',
                details={'errors': errors}
            )
        
        # Create questions
        created_questions = []
        for data in questions_data:
            data['created_by'] = request.user
            question = Question.objects.create(**data)
            created_questions.append(question)
        
        return Response(
            {
                'message': f'成功导入 {len(created_questions)} 道题目',
                'count': len(created_questions)
            },
            status=status.HTTP_201_CREATED
        )
    
    def _parse_row(self, row, row_num):
        """
        Parse a single row from Excel.
        
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
        
        # Parse question type
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
        
        # Parse options for choice questions
        options = []
        if question_type in ['SINGLE_CHOICE', 'MULTIPLE_CHOICE']:
            for i, key in enumerate(['A', 'B', 'C', 'D']):
                option_value = row[2 + i] if len(row) > 2 + i else None
                if option_value:
                    options.append({'key': key, 'value': str(option_value)})
            
            if not options:
                raise ValueError('选择题必须设置选项')
        
        # Parse answer
        answer_str = str(row[6]).strip() if len(row) > 6 and row[6] else ''
        if not answer_str:
            raise ValueError('答案不能为空')
        
        if question_type == 'SINGLE_CHOICE':
            answer = answer_str.upper()
            option_keys = [opt['key'] for opt in options]
            if answer not in option_keys:
                raise ValueError(f'单选题答案 {answer} 不在选项范围内')
        elif question_type == 'MULTIPLE_CHOICE':
            # Multiple answers separated by comma or space
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
        
        # Parse explanation
        explanation = str(row[7]).strip() if len(row) > 7 and row[7] else ''
        
        # Parse score
        score = 1.0
        if len(row) > 8 and row[8]:
            try:
                score = float(row[8])
            except (ValueError, TypeError):
                raise ValueError(f'分值格式错误: {row[8]}')
        
        # Parse difficulty
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
