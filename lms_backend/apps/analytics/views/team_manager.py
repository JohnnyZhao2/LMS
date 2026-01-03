"""
Team Manager analytics views.

Implements:
- Team manager data board API (Requirements: 21.1, 21.2, 21.3)
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Avg, Sum
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse

from core.exceptions import BusinessError, ErrorCodes
from apps.users.permissions import get_current_role
from apps.analytics.services import TeamManagerDashboardService


class TeamManagerOverviewView(APIView):
    """
    团队经理数据看板 - 概览端点
    
    GET /api/analytics/team-overview/
    
    Requirements:
    - 21.1: 团队经理访问数据看板时展示各室完成率与成绩对比
    - 21.3: 团队经理查看数据时仅提供只读访问，禁止任何修改操作
    
    Property 41: 团队经理只读访问
    """
    permission_classes = [IsAuthenticated]
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = TeamManagerDashboardService()
    
    @extend_schema(
        summary='获取团队经理数据看板概览',
        description='获取各室完成率与成绩对比数据，仅团队经理可访问',
        responses={
            200: OpenApiResponse(description='数据看板概览'),
            403: OpenApiResponse(description='无权限访问')
        },
        tags=['团队经理数据看板']
    )
    def get(self, request):
        user = request.user
        current_role = get_current_role(user)
        
        if current_role not in ['TEAM_MANAGER', 'ADMIN']:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有团队经理或管理员可以访问此数据看板'
            )
        
        # 调用 Service
        data = self.service.get_overview_data()
        data['current_role'] = current_role
        
        return Response(data)


class KnowledgeHeatView(APIView):
    """
    团队经理数据看板 - 知识热度端点
    
    GET /api/analytics/knowledge-heat/
    
    Requirements:
    - 21.2: 团队经理查看知识热度时展示知识文档的阅读统计
    - 21.3: 团队经理查看数据时仅提供只读访问，禁止任何修改操作
    
    Property 41: 团队经理只读访问
    """
    permission_classes = [IsAuthenticated]
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = TeamManagerDashboardService()
    
    @extend_schema(
        summary='获取知识热度统计',
        description='获取知识文档的阅读统计数据，仅团队经理可访问',
        parameters=[
            OpenApiParameter(name='limit', type=int, description='返回数量限制（默认20）'),
            OpenApiParameter(name='knowledge_type', type=str, description='知识类型筛选（EMERGENCY/OTHER）'),
            OpenApiParameter(name='category_id', type=int, description='分类ID筛选'),
        ],
        responses={
            200: OpenApiResponse(description='知识热度统计'),
            403: OpenApiResponse(description='无权限访问')
        },
        tags=['团队经理数据看板']
    )
    def get(self, request):
        user = request.user
        current_role = get_current_role(user)
        
        if current_role not in ['TEAM_MANAGER', 'ADMIN']:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有团队经理或管理员可以访问此数据看板'
            )
        
        limit = int(request.query_params.get('limit', 20))
        knowledge_type = request.query_params.get('knowledge_type')
        
        # 调用 Service
        data = self.service.get_knowledge_heat(
            limit=limit,
            knowledge_type=knowledge_type
        )
        
        return Response(data)
