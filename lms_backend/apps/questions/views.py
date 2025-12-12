"""
Views for questions app.
"""
import os
import tempfile
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.db import transaction
from django.db.models import Q
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes

from .models import Question, Quiz, QuizQuestion
from .serializers import (
    QuestionSerializer,
    QuestionListSerializer,
    QuizSerializer,
    QuizListSerializer,
    QuizQuestionSerializer,
    AddQuestionsSerializer,
    ReorderQuestionsSerializer,
    QuestionImportSerializer
)
from .services import QuestionImportService
from lms_backend.utils.permissions import IsManagementRole


class QuestionViewSet(viewsets.ModelViewSet):
    """题目视图集"""
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['type', 'difficulty', 'is_public', 'created_by']
    search_fields = ['content']
    ordering_fields = ['difficulty', 'created_at', 'updated_at']
    
    def get_queryset(self):
        """根据用户角色过滤查询集"""
        queryset = super().get_queryset()
        user = self.request.user
        
        # 管理员可以看到所有题目（包括已删除的）
        if user.has_role('ADMIN'):
            return queryset
        
        # 导师和室经理可以看到自己创建的题目和公开题目
        if user.has_role('MENTOR') or user.has_role('DEPT_MANAGER'):
            return queryset.filter(
                Q(created_by=user) | Q(is_public=True),
                is_deleted=False
            )
        
        # 学员只能看到公开题目
        return queryset.filter(is_public=True, is_deleted=False)
    
    def get_serializer_class(self):
        """根据 action 返回不同的序列化器"""
        if self.action == 'list':
            return QuestionListSerializer
        return QuestionSerializer
    
    def get_permissions(self):
        """根据 action 返回不同的权限"""
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'import_questions']:
            return [IsAuthenticated(), IsManagementRole()]
        return [IsAuthenticated()]
    
    def destroy(self, request, *args, **kwargs):
        """软删除题目"""
        instance = self.get_object()
        
        # 检查题目是否被测验使用
        if instance.quiz_questions.filter(quiz__is_deleted=False).exists():
            return Response({
                'success': False,
                'message': '该题目已被测验使用，无法删除',
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
        
        instance.soft_delete()
        
        return Response({
            'success': True,
            'message': '删除成功',
            'data': None
        })
    
    def create(self, request, *args, **kwargs):
        """创建题目"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        return Response({
            'success': True,
            'message': '创建成功',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """更新题目"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response({
            'success': True,
            'message': '更新成功',
            'data': serializer.data
        })
    
    def retrieve(self, request, *args, **kwargs):
        """获取题目详情"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        
        return Response({
            'success': True,
            'message': '获取成功',
            'data': serializer.data
        })
    
    def list(self, request, *args, **kwargs):
        """获取题目列表"""
        queryset = self.filter_queryset(self.get_queryset())
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated_response = self.get_paginated_response(serializer.data)
            # Wrap paginated response in standard format
            return Response({
                'success': True,
                'message': '获取成功',
                'data': paginated_response.data
            })
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'message': '获取成功',
            'data': serializer.data
        })
    
    @extend_schema(
        summary="批量导入题目",
        description="通过Excel文件批量导入题目。Excel格式：列A=题目类型，列B=题目内容，列C=选项(JSON)，列D=正确答案(JSON)，列E=题目解析，列F=难度(1-5)，列G=是否公开",
        request={
            'multipart/form-data': {
                'type': 'object',
                'properties': {
                    'file': {
                        'type': 'string',
                        'format': 'binary',
                        'description': 'Excel文件 (.xlsx)'
                    }
                }
            }
        },
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'success': {'type': 'boolean'},
                    'message': {'type': 'string'},
                    'data': {
                        'type': 'object',
                        'properties': {
                            'success_count': {'type': 'integer', 'description': '成功导入数量'},
                            'error_count': {'type': 'integer', 'description': '失败数量'},
                            'errors': {
                                'type': 'array',
                                'items': {
                                    'type': 'object',
                                    'properties': {
                                        'row': {'type': 'integer', 'description': '行号'},
                                        'error': {'type': 'string', 'description': '错误信息'}
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    )
    @action(
        detail=False,
        methods=['post'],
        url_path='import',
        parser_classes=[MultiPartParser, FormParser],
        permission_classes=[IsAuthenticated, IsManagementRole]
    )
    def import_questions(self, request):
        """批量导入题目"""
        serializer = QuestionImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        uploaded_file = serializer.validated_data['file']
        
        # 验证文件扩展名
        if not uploaded_file.name.endswith('.xlsx'):
            return Response({
                'success': False,
                'message': '只支持.xlsx格式的Excel文件',
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 保存临时文件
        temp_file = None
        try:
            # 创建临时文件
            with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as temp_file:
                for chunk in uploaded_file.chunks():
                    temp_file.write(chunk)
                temp_file_path = temp_file.name
            
            # 执行导入
            import_service = QuestionImportService(user=request.user)
            
            # 打开临时文件进行处理
            with open(temp_file_path, 'rb') as f:
                result = import_service.process_import(f)
            
            # 构建响应
            response_data = {
                'success_count': result['success_count'],
                'error_count': result['error_count'],
                'errors': result['error_records']
            }
            
            if result['success_count'] > 0:
                message = f'导入完成：成功 {result["success_count"]} 条'
                if result['error_records']:
                    message += f'，失败 {result["error_count"]} 条'
            else:
                message = '导入失败，请检查文件格式'
            
            return Response({
                'success': True,
                'message': message,
                'data': response_data
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'message': f'导入失败: {str(e)}',
                'data': None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        finally:
            # 清理临时文件
            if temp_file and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                except Exception:
                    pass


class QuizViewSet(viewsets.ModelViewSet):
    """测验视图集"""
    queryset = Quiz.objects.all()
    serializer_class = QuizSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['is_public', 'created_by']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'updated_at']
    
    def get_queryset(self):
        """根据用户角色过滤查询集"""
        queryset = super().get_queryset()
        user = self.request.user
        
        # 管理员可以看到所有测验（包括已删除的）
        if user.has_role('ADMIN'):
            return queryset
        
        # 导师和室经理可以看到自己创建的测验和公开测验
        if user.has_role('MENTOR') or user.has_role('DEPT_MANAGER'):
            return queryset.filter(
                Q(created_by=user) | Q(is_public=True),
                is_deleted=False
            )
        
        # 学员只能看到公开测验
        return queryset.filter(is_public=True, is_deleted=False)
    
    def get_serializer_class(self):
        """根据 action 返回不同的序列化器"""
        if self.action == 'list':
            return QuizListSerializer
        return QuizSerializer
    
    def get_permissions(self):
        """根据 action 返回不同的权限"""
        if self.action in ['create', 'update', 'partial_update', 'destroy', 
                          'add_questions', 'remove_question', 'reorder_questions']:
            return [IsAuthenticated(), IsManagementRole()]
        return [IsAuthenticated()]
    
    def destroy(self, request, *args, **kwargs):
        """软删除测验"""
        instance = self.get_object()
        
        # 检查是否可以删除
        if not instance.can_delete():
            return Response({
                'success': False,
                'message': '该测验已关联到活跃的任务，无法删除',
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
        
        instance.soft_delete()
        
        return Response({
            'success': True,
            'message': '删除成功',
            'data': None
        })
    
    def create(self, request, *args, **kwargs):
        """创建测验"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        return Response({
            'success': True,
            'message': '创建成功',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """更新测验"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response({
            'success': True,
            'message': '更新成功',
            'data': serializer.data
        })
    
    def retrieve(self, request, *args, **kwargs):
        """获取测验详情"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        
        return Response({
            'success': True,
            'message': '获取成功',
            'data': serializer.data
        })
    
    def list(self, request, *args, **kwargs):
        """获取测验列表"""
        queryset = self.filter_queryset(self.get_queryset())
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated_response = self.get_paginated_response(serializer.data)
            # Wrap paginated response in standard format
            return Response({
                'success': True,
                'message': '获取成功',
                'data': paginated_response.data
            })
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'message': '获取成功',
            'data': serializer.data
        })
    
    @extend_schema(
        summary="添加题目到测验",
        description="批量添加题目到测验，指定每个题目的分值和顺序",
        request=AddQuestionsSerializer,
        responses={200: QuizSerializer}
    )
    @action(detail=True, methods=['post'], url_path='add-questions')
    def add_questions(self, request, pk=None):
        """添加题目到测验"""
        quiz = self.get_object()
        serializer = AddQuestionsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        questions_data = serializer.validated_data['questions']
        
        with transaction.atomic():
            for item in questions_data:
                question_id = item['question_id']
                score = item['score']
                sort_order = item['sort_order']
                
                # 检查题目是否存在
                try:
                    question = Question.objects.get(id=question_id, is_deleted=False)
                except Question.DoesNotExist:
                    return Response({
                        'success': False,
                        'message': f'题目 {question_id} 不存在或已删除',
                        'data': None
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # 检查题目是否已经在测验中
                if QuizQuestion.objects.filter(quiz=quiz, question=question).exists():
                    return Response({
                        'success': False,
                        'message': f'题目 {question_id} 已经在测验中',
                        'data': None
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # 创建关联
                QuizQuestion.objects.create(
                    quiz=quiz,
                    question=question,
                    sort_order=sort_order,
                    score=score
                )
        
        # 返回更新后的测验
        quiz.refresh_from_db()
        result_serializer = QuizSerializer(quiz)
        
        return Response({
            'success': True,
            'message': '添加成功',
            'data': result_serializer.data
        })
    
    @extend_schema(
        summary="从测验中移除题目",
        description="从测验中移除指定题目",
        parameters=[
            OpenApiParameter(name='question_id', description='题目ID', required=True, type=int)
        ],
        responses={200: QuizSerializer}
    )
    @action(detail=True, methods=['delete'], url_path='remove-question')
    def remove_question(self, request, pk=None):
        """从测验中移除题目"""
        quiz = self.get_object()
        question_id = request.query_params.get('question_id')
        
        if not question_id:
            return Response({
                'success': False,
                'message': '请提供题目ID',
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            quiz_question = QuizQuestion.objects.get(quiz=quiz, question_id=question_id)
            quiz_question.delete()
        except QuizQuestion.DoesNotExist:
            return Response({
                'success': False,
                'message': '该题目不在测验中',
                'data': None
            }, status=status.HTTP_404_NOT_FOUND)
        
        # 返回更新后的测验
        quiz.refresh_from_db()
        result_serializer = QuizSerializer(quiz)
        
        return Response({
            'success': True,
            'message': '移除成功',
            'data': result_serializer.data
        })
    
    @extend_schema(
        summary="重新排序测验题目",
        description="批量更新测验中题目的顺序",
        request=ReorderQuestionsSerializer,
        responses={200: QuizSerializer}
    )
    @action(detail=True, methods=['put'], url_path='reorder-questions')
    def reorder_questions(self, request, pk=None):
        """重新排序测验题目"""
        quiz = self.get_object()
        serializer = ReorderQuestionsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        question_orders = serializer.validated_data['question_orders']
        
        with transaction.atomic():
            for item in question_orders:
                question_id = item['question_id']
                sort_order = item['sort_order']
                
                try:
                    quiz_question = QuizQuestion.objects.get(quiz=quiz, question_id=question_id)
                    quiz_question.sort_order = sort_order
                    quiz_question.save(update_fields=['sort_order'])
                except QuizQuestion.DoesNotExist:
                    return Response({
                        'success': False,
                        'message': f'题目 {question_id} 不在测验中',
                        'data': None
                    }, status=status.HTTP_400_BAD_REQUEST)
        
        # 返回更新后的测验
        quiz.refresh_from_db()
        result_serializer = QuizSerializer(quiz)
        
        return Response({
            'success': True,
            'message': '排序成功',
            'data': result_serializer.data
        })
    
    @extend_schema(
        summary="获取测验题目列表",
        description="获取测验中的所有题目（按顺序）",
        responses={200: QuizQuestionSerializer(many=True)}
    )
    @action(detail=True, methods=['get'])
    def questions(self, request, pk=None):
        """获取测验题目列表"""
        quiz = self.get_object()
        quiz_questions = quiz.get_questions_ordered()
        serializer = QuizQuestionSerializer(quiz_questions, many=True)
        
        return Response({
            'success': True,
            'message': '获取成功',
            'data': serializer.data
        })
