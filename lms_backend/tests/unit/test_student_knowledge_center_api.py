"""
Unit tests for student knowledge center API.

Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6
"""
import pytest
from rest_framework import status

from apps.knowledge.models import Knowledge, KnowledgeCategory, KnowledgeCategoryRelation


@pytest.mark.django_db
class TestStudentKnowledgeCategoryListAPI:
    """Tests for student knowledge center category list endpoint."""
    
    def test_get_primary_categories(self, authenticated_client):
        """
        Test that primary categories are returned.
        
        Requirements: 16.1 - 支持一级筛选（领域大类）
        """
        # Create primary categories
        cat1 = KnowledgeCategory.objects.create(
            name='网络领域',
            code='NETWORK',
            sort_order=1
        )
        cat2 = KnowledgeCategory.objects.create(
            name='安全领域',
            code='SECURITY',
            sort_order=2
        )
        # Create a secondary category (should not be returned)
        KnowledgeCategory.objects.create(
            name='路由器',
            code='ROUTER',
            parent=cat1
        )
        
        response = authenticated_client.get('/api/analytics/knowledge-center/categories/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2
        category_names = [c['name'] for c in response.data]
        assert '网络领域' in category_names
        assert '安全领域' in category_names
        assert '路由器' not in category_names
    
    def test_categories_ordered_by_sort_order(self, authenticated_client):
        """
        Test that categories are ordered by sort_order.
        
        Requirements: 16.1 - 支持一级筛选（领域大类）
        """
        KnowledgeCategory.objects.create(name='分类C', code='CAT_C', sort_order=3)
        KnowledgeCategory.objects.create(name='分类A', code='CAT_A', sort_order=1)
        KnowledgeCategory.objects.create(name='分类B', code='CAT_B', sort_order=2)
        
        response = authenticated_client.get('/api/analytics/knowledge-center/categories/')
        
        assert response.status_code == status.HTTP_200_OK
        names = [c['name'] for c in response.data]
        assert names == ['分类A', '分类B', '分类C']
    
    def test_requires_authentication(self, api_client):
        """Test that unauthenticated requests are rejected."""
        response = api_client.get('/api/analytics/knowledge-center/categories/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestStudentKnowledgeSecondaryCategoryAPI:
    """Tests for student knowledge center secondary category endpoint."""
    
    def test_get_secondary_categories(self, authenticated_client):
        """
        Test that secondary categories are returned for a primary category.
        
        Requirements: 16.2 - 学员选择一级分类时动态加载对应的二级分类选项
        """
        # Create primary category
        primary = KnowledgeCategory.objects.create(
            name='网络领域',
            code='NETWORK'
        )
        # Create secondary categories
        KnowledgeCategory.objects.create(
            name='路由器',
            code='ROUTER',
            parent=primary,
            sort_order=1
        )
        KnowledgeCategory.objects.create(
            name='交换机',
            code='SWITCH',
            parent=primary,
            sort_order=2
        )
        
        response = authenticated_client.get(
            f'/api/analytics/knowledge-center/categories/{primary.id}/children/'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2
        names = [c['name'] for c in response.data]
        assert '路由器' in names
        assert '交换机' in names
    
    def test_returns_error_for_nonexistent_primary(self, authenticated_client):
        """
        Test that error is returned for nonexistent primary category.
        
        Requirements: 16.2 - 动态加载对应的二级分类选项
        """
        response = authenticated_client.get(
            '/api/analytics/knowledge-center/categories/99999/children/'
        )
        
        # BusinessError returns 400 with RESOURCE_NOT_FOUND code
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['code'] == 'RESOURCE_NOT_FOUND'
    
    def test_returns_error_for_secondary_category_id(self, authenticated_client):
        """
        Test that error is returned when using a secondary category ID.
        
        Requirements: 16.2 - 动态加载对应的二级分类选项
        """
        primary = KnowledgeCategory.objects.create(name='网络', code='NET')
        secondary = KnowledgeCategory.objects.create(
            name='路由器',
            code='ROUTER',
            parent=primary
        )
        
        response = authenticated_client.get(
            f'/api/analytics/knowledge-center/categories/{secondary.id}/children/'
        )
        
        # BusinessError returns 400 with RESOURCE_NOT_FOUND code
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['code'] == 'RESOURCE_NOT_FOUND'


@pytest.mark.django_db
class TestStudentKnowledgeListAPI:
    """Tests for student knowledge center knowledge list endpoint."""
    
    def test_get_knowledge_list(self, authenticated_client, create_user):
        """
        Test that knowledge list is returned.
        
        Requirements: 16.1 - 展示知识文档列表
        """
        creator = create_user(username='creator')
        Knowledge.objects.create(
            title='知识文档1',
            knowledge_type='OTHER',
            content='内容1',
            created_by=creator
        )
        Knowledge.objects.create(
            title='知识文档2',
            knowledge_type='EMERGENCY',
            fault_scenario='故障场景',
            solution='解决方案',
            created_by=creator
        )
        
        response = authenticated_client.get('/api/analytics/knowledge-center/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'results' in response.data
        assert len(response.data['results']) == 2
    
    def test_filter_by_primary_category(self, authenticated_client, create_user):
        """
        Test filtering by primary category.
        
        Requirements: 16.1 - 支持一级筛选（领域大类）
        """
        creator = create_user(username='creator')
        
        # Create categories
        cat1 = KnowledgeCategory.objects.create(name='网络', code='NET')
        cat2 = KnowledgeCategory.objects.create(name='安全', code='SEC')
        
        # Create knowledge in different categories
        k1 = Knowledge.objects.create(
            title='网络知识',
            knowledge_type='OTHER',
            content='内容',
            created_by=creator
        )
        KnowledgeCategoryRelation.objects.create(knowledge=k1, category=cat1)
        
        k2 = Knowledge.objects.create(
            title='安全知识',
            knowledge_type='OTHER',
            content='内容',
            created_by=creator
        )
        KnowledgeCategoryRelation.objects.create(knowledge=k2, category=cat2)
        
        response = authenticated_client.get(
            f'/api/analytics/knowledge-center/?primary_category_id={cat1.id}'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['title'] == '网络知识'
    
    def test_filter_by_secondary_category(self, authenticated_client, create_user):
        """
        Test filtering by secondary category.
        
        Requirements: 16.1 - 支持二级筛选（系统对象）
        """
        creator = create_user(username='creator')
        
        # Create categories
        primary = KnowledgeCategory.objects.create(name='网络', code='NET')
        secondary1 = KnowledgeCategory.objects.create(
            name='路由器', code='ROUTER', parent=primary
        )
        secondary2 = KnowledgeCategory.objects.create(
            name='交换机', code='SWITCH', parent=primary
        )
        
        # Create knowledge in different secondary categories
        k1 = Knowledge.objects.create(
            title='路由器知识',
            knowledge_type='OTHER',
            content='内容',
            created_by=creator
        )
        KnowledgeCategoryRelation.objects.create(knowledge=k1, category=secondary1)
        
        k2 = Knowledge.objects.create(
            title='交换机知识',
            knowledge_type='OTHER',
            content='内容',
            created_by=creator
        )
        KnowledgeCategoryRelation.objects.create(knowledge=k2, category=secondary2)
        
        response = authenticated_client.get(
            f'/api/analytics/knowledge-center/?secondary_category_id={secondary1.id}'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['title'] == '路由器知识'
    
    def test_knowledge_list_card_fields(self, authenticated_client, create_user):
        """
        Test that knowledge list includes card display fields.
        
        Requirements: 16.3 - 以卡片形式展示操作标签、标题、摘要、修改人和修改时间
        """
        creator = create_user(username='creator', username='创建者')
        Knowledge.objects.create(
            title='测试知识',
            knowledge_type='OTHER',
            summary='这是摘要',
            content='内容',
            operation_tags=['标签1', '标签2'],
            created_by=creator
        )
        
        response = authenticated_client.get('/api/analytics/knowledge-center/')
        
        assert response.status_code == status.HTTP_200_OK
        item = response.data['results'][0]
        # Check required card fields
        assert 'title' in item
        assert 'summary' in item
        assert 'operation_tags' in item
        assert 'updated_by_name' in item
        assert 'updated_at' in item
        assert item['title'] == '测试知识'
        assert item['summary'] == '这是摘要'
        assert item['operation_tags'] == ['标签1', '标签2']
        assert item['updated_by_name'] == '创建者'
    
    def test_excludes_deleted_knowledge(self, authenticated_client, create_user):
        """Test that deleted knowledge is excluded."""
        creator = create_user(username='creator')
        Knowledge.objects.create(
            title='已删除知识',
            knowledge_type='OTHER',
            content='内容',
            created_by=creator,
            is_deleted=True
        )
        
        response = authenticated_client.get('/api/analytics/knowledge-center/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 0
    
    def test_search_by_title(self, authenticated_client, create_user):
        """Test searching by title."""
        creator = create_user(username='creator')
        Knowledge.objects.create(
            title='网络故障处理',
            knowledge_type='OTHER',
            content='内容',
            created_by=creator
        )
        Knowledge.objects.create(
            title='安全配置指南',
            knowledge_type='OTHER',
            content='内容',
            created_by=creator
        )
        
        response = authenticated_client.get(
            '/api/analytics/knowledge-center/?search=网络'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['title'] == '网络故障处理'
    
    def test_pagination(self, authenticated_client, create_user):
        """Test pagination of knowledge list."""
        creator = create_user(username='creator')
        for i in range(25):
            Knowledge.objects.create(
                title=f'知识{i}',
                knowledge_type='OTHER',
                content='内容',
                created_by=creator
            )
        
        response = authenticated_client.get(
            '/api/analytics/knowledge-center/?page=1&page_size=10'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 10
        assert response.data['count'] == 25
        assert response.data['page'] == 1
        assert response.data['page_size'] == 10
        assert response.data['total_pages'] == 3


@pytest.mark.django_db
class TestStudentKnowledgeDetailAPI:
    """Tests for student knowledge center knowledge detail endpoint."""
    
    def test_get_other_type_knowledge_detail(self, authenticated_client, create_user):
        """
        Test getting detail of OTHER type knowledge.
        
        Requirements: 16.5 - 其他类型知识展示 Markdown/富文本正文
        """
        creator = create_user(username='creator')
        knowledge = Knowledge.objects.create(
            title='Markdown知识',
            knowledge_type='OTHER',
            content='# 标题\n## 子标题\n内容',
            created_by=creator
        )
        
        response = authenticated_client.get(
            f'/api/analytics/knowledge-center/{knowledge.id}/'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['title'] == 'Markdown知识'
        assert response.data['knowledge_type'] == 'OTHER'
        assert response.data['content'] == '# 标题\n## 子标题\n内容'
    
    def test_get_emergency_type_knowledge_detail(self, authenticated_client, create_user):
        """
        Test getting detail of EMERGENCY type knowledge.
        
        Requirements: 16.4 - 应急类知识按结构化字段顺序展示已填写内容
        """
        creator = create_user(username='creator')
        knowledge = Knowledge.objects.create(
            title='应急知识',
            knowledge_type='EMERGENCY',
            fault_scenario='故障场景描述',
            trigger_process='触发流程描述',
            solution='解决方案描述',
            verification_plan='验证方案描述',
            recovery_plan='恢复方案描述',
            created_by=creator
        )
        
        response = authenticated_client.get(
            f'/api/analytics/knowledge-center/{knowledge.id}/'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['knowledge_type'] == 'EMERGENCY'
        assert response.data['fault_scenario'] == '故障场景描述'
        assert response.data['solution'] == '解决方案描述'
        
        # Check structured_content
        structured = response.data['structured_content']
        assert structured is not None
        assert len(structured) == 5
        assert structured[0]['field'] == 'fault_scenario'
        assert structured[0]['title'] == '故障场景'
    
    def test_emergency_structured_content_excludes_empty_fields(
        self, authenticated_client, create_user
    ):
        """
        Test that structured_content excludes empty fields.
        
        Requirements: 16.4 - 按结构化字段顺序展示已填写内容
        """
        creator = create_user(username='creator')
        knowledge = Knowledge.objects.create(
            title='部分填写的应急知识',
            knowledge_type='EMERGENCY',
            fault_scenario='故障场景',
            solution='解决方案',
            # Other fields left empty
            created_by=creator
        )
        
        response = authenticated_client.get(
            f'/api/analytics/knowledge-center/{knowledge.id}/'
        )
        
        assert response.status_code == status.HTTP_200_OK
        structured = response.data['structured_content']
        assert len(structured) == 2
        fields = [s['field'] for s in structured]
        assert 'fault_scenario' in fields
        assert 'solution' in fields
        assert 'trigger_process' not in fields
    
    def test_table_of_contents_for_markdown(self, authenticated_client, create_user):
        """
        Test table of contents generation for Markdown content.
        
        Requirements: 16.6 - 在右侧展示自动生成的内容目录
        """
        creator = create_user(username='creator')
        knowledge = Knowledge.objects.create(
            title='Markdown知识',
            knowledge_type='OTHER',
            content='# 第一章\n内容\n## 1.1 节\n内容\n### 1.1.1 小节\n内容\n# 第二章\n内容',
            created_by=creator
        )
        
        response = authenticated_client.get(
            f'/api/analytics/knowledge-center/{knowledge.id}/'
        )
        
        assert response.status_code == status.HTTP_200_OK
        toc = response.data['table_of_contents']
        assert len(toc) == 4
        assert toc[0]['title'] == '第一章'
        assert toc[0]['level'] == 1
        assert toc[1]['title'] == '1.1 节'
        assert toc[1]['level'] == 2
    
    def test_table_of_contents_for_emergency(self, authenticated_client, create_user):
        """
        Test table of contents generation for EMERGENCY type.
        
        Requirements: 16.6 - 在右侧展示自动生成的内容目录
        """
        creator = create_user(username='creator')
        knowledge = Knowledge.objects.create(
            title='应急知识',
            knowledge_type='EMERGENCY',
            fault_scenario='故障场景',
            solution='解决方案',
            created_by=creator
        )
        
        response = authenticated_client.get(
            f'/api/analytics/knowledge-center/{knowledge.id}/'
        )
        
        assert response.status_code == status.HTTP_200_OK
        toc = response.data['table_of_contents']
        assert len(toc) == 2
        toc_ids = [t['id'] for t in toc]
        assert 'fault_scenario' in toc_ids
        assert 'solution' in toc_ids
    
    def test_increments_view_count(self, authenticated_client, create_user):
        """Test that viewing knowledge increments view count."""
        creator = create_user(username='creator')
        knowledge = Knowledge.objects.create(
            title='测试知识',
            knowledge_type='OTHER',
            content='内容',
            created_by=creator,
            view_count=5
        )
        
        response = authenticated_client.get(
            f'/api/analytics/knowledge-center/{knowledge.id}/'
        )
        
        assert response.status_code == status.HTTP_200_OK
        knowledge.refresh_from_db()
        assert knowledge.view_count == 6
    
    def test_returns_error_for_nonexistent_knowledge(self, authenticated_client):
        """Test that error is returned for nonexistent knowledge."""
        response = authenticated_client.get(
            '/api/analytics/knowledge-center/99999/'
        )
        
        # BusinessError returns 400 with RESOURCE_NOT_FOUND code
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['code'] == 'RESOURCE_NOT_FOUND'
    
    def test_returns_error_for_deleted_knowledge(self, authenticated_client, create_user):
        """Test that error is returned for deleted knowledge."""
        creator = create_user(username='creator')
        knowledge = Knowledge.objects.create(
            title='已删除知识',
            knowledge_type='OTHER',
            content='内容',
            created_by=creator,
            is_deleted=True
        )
        
        response = authenticated_client.get(
            f'/api/analytics/knowledge-center/{knowledge.id}/'
        )
        
        # BusinessError returns 400 with RESOURCE_NOT_FOUND code
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['code'] == 'RESOURCE_NOT_FOUND'
    
    def test_requires_authentication(self, api_client, create_user):
        """Test that unauthenticated requests are rejected."""
        creator = create_user(username='creator')
        knowledge = Knowledge.objects.create(
            title='测试知识',
            knowledge_type='OTHER',
            content='内容',
            created_by=creator
        )
        
        response = api_client.get(
            f'/api/analytics/knowledge-center/{knowledge.id}/'
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
