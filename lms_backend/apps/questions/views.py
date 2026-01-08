"""
Views for question management.
Implements question CRUD endpoints with ownership control.
Properties:
- Property 13: 被引用题目删除保护
- Property 15: 题目所有权编辑控制
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter
from apps.users.permissions import IsAdminOrMentorOrDeptManager
from .serializers import (
    QuestionListSerializer,
    QuestionDetailSerializer,
    QuestionCreateSerializer,
    QuestionUpdateSerializer,
)
from .services import QuestionService
class QuestionListCreateView(APIView):
    """
    Question list and create endpoint.
    """
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = QuestionService()
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
            OpenApiParameter(name='status', type=str, description='状态（DRAFT/PUBLISHED）'),
            OpenApiParameter(name='page', type=int, description='页码'),
            OpenApiParameter(name='page_size', type=int, description='每页数量'),
        ],
        responses={200: QuestionListSerializer(many=True)},
        tags=['题库管理']
    )
    def get(self, request):
        """
        Get question list.
        """
        # 构建过滤条件
        filters = {}
        if request.query_params.get('question_type'):
            filters['question_type'] = request.query_params.get('question_type')
        if request.query_params.get('difficulty'):
            filters['difficulty'] = request.query_params.get('difficulty')
        if request.query_params.get('created_by'):
            filters['created_by_id'] = int(request.query_params.get('created_by'))
        if request.query_params.get('line_type_id'):
            filters['line_type_id'] = int(request.query_params.get('line_type_id'))
        if request.query_params.get('status'):
            filters['status'] = request.query_params.get('status')
        search = request.query_params.get('search')
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        # 使用Service获取题目列表
        result = self.service.get_list(
            filters=filters if filters else None,
            search=search,
            ordering='-created_at',
            page=page,
            page_size=page_size,
            user=request.user
        )
        # 序列化
        serializer = QuestionListSerializer(result['results'], many=True)
        return Response({
            'count': result['count'],
            'results': serializer.data,
            'page': result['page'],
            'page_size': result['page_size'],
            'total_pages': result['total_pages']
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
        """
        serializer = QuestionCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        # 使用Service创建题目
        question = self.service.create(
            data=serializer.validated_data,
            user=request.user
        )
        response_serializer = QuestionDetailSerializer(question)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
class QuestionDetailView(APIView):
    """
    Question detail, update, delete endpoint.
    Properties:
    - Property 13: 被引用题目删除保护
    - Property 15: 题目所有权编辑控制
    """
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = QuestionService()
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
        question = self.service.get_by_id(pk, user=request.user)
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
        Property 15: 题目所有权编辑控制
        """
        # 先获取题目对象用于验证
        question = self.service.get_by_id(pk, user=request.user)
        serializer = QuestionUpdateSerializer(
            instance=question,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        # 使用Service更新题目（权限检查在Service中完成）
        updated_question = self.service.update(
            pk=pk,
            data=serializer.validated_data,
            user=request.user
        )
        response_serializer = QuestionDetailSerializer(updated_question)
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
        Property 13: 被引用题目删除保护
        Property 15: 题目所有权编辑控制
        """
        # 使用Service删除题目（权限检查和引用检查在Service中完成）
        self.service.delete(pk=pk, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
