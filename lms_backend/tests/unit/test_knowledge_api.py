"""
Unit tests for Knowledge API endpoints.

Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
"""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.users.models import Role, UserRole
from apps.knowledge.models import Knowledge, KnowledgeCategory, KnowledgeCategoryRelation
from tests.factories import (
    UserFactory, RoleFactory, DepartmentFactory,
    KnowledgeFactory, EmergencyKnowledgeFactory,
    KnowledgeCategoryFactory, KnowledgeCategoryRelationFactory,
)


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    """Create an admin user."""
    user = UserFactory()
    admin_role = RoleFactory(code='ADMIN', name='管理员')
    UserRole.objects.create(user=user, role=admin_role)
    return user


@pytest.fixture
def regular_user(db):
    """Create a regular user (student only)."""
    return UserFactory()


@pytest.fixture
def authenticated_admin_client(api_client, admin_user):
    """Return an API client authenticated as admin."""
    api_client.force_authenticate(user=admin_user)
    return api_client


@pytest.fixture
def authenticated_user_client(api_client, regular_user):
    """Return an API client authenticated as regular user."""
    api_client.force_authenticate(user=regular_user)
    return api_client


# ============ Knowledge Category Tests ============

@pytest.mark.django_db
class TestKnowledgeCategoryListCreateAPI:
    """Tests for knowledge category list and create endpoints."""
    
    def test_list_categories(self, authenticated_user_client):
        """Test listing knowledge categories."""
        # Create some categories
        cat1 = KnowledgeCategoryFactory(name='一级分类1')
        cat2 = KnowledgeCategoryFactory(name='二级分类1', parent=cat1)
        
        response = authenticated_user_client.get('/api/knowledge/categories/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2
    
    def test_list_categories_filter_by_level(self, authenticated_user_client):
        """Test filtering categories by level."""
        cat1 = KnowledgeCategoryFactory(name='一级分类1')
        cat2 = KnowledgeCategoryFactory(name='二级分类1', parent=cat1)
        
        # Filter level 1
        response = authenticated_user_client.get('/api/knowledge/categories/?level=1')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['name'] == '一级分类1'
        
        # Filter level 2
        response = authenticated_user_client.get('/api/knowledge/categories/?level=2')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['name'] == '二级分类1'
    
    def test_create_category_as_admin(self, authenticated_admin_client):
        """Test creating a category as admin."""
        data = {
            'name': '新分类',
            'code': 'NEW_CAT',
            'description': '新分类描述'
        }
        
        response = authenticated_admin_client.post('/api/knowledge/categories/', data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == '新分类'
        assert response.data['code'] == 'NEW_CAT'
    
    def test_create_category_non_admin_fails(self, authenticated_user_client):
        """Test that non-admin cannot create categories."""
        data = {
            'name': '新分类',
            'code': 'NEW_CAT'
        }
        
        response = authenticated_user_client.post('/api/knowledge/categories/', data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestKnowledgeCategoryDetailAPI:
    """Tests for knowledge category detail endpoints."""
    
    def test_get_category_detail(self, authenticated_user_client):
        """Test getting category detail."""
        category = KnowledgeCategoryFactory()
        
        response = authenticated_user_client.get(f'/api/knowledge/categories/{category.id}/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == category.name
    
    def test_update_category_as_admin(self, authenticated_admin_client):
        """Test updating a category as admin."""
        category = KnowledgeCategoryFactory()
        
        data = {'name': '更新后的名称'}
        response = authenticated_admin_client.patch(
            f'/api/knowledge/categories/{category.id}/', data
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == '更新后的名称'
    
    def test_delete_category_as_admin(self, authenticated_admin_client):
        """Test deleting a category as admin."""
        category = KnowledgeCategoryFactory()
        
        response = authenticated_admin_client.delete(
            f'/api/knowledge/categories/{category.id}/'
        )
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not KnowledgeCategory.objects.filter(id=category.id).exists()
    
    def test_delete_category_with_children_fails(self, authenticated_admin_client):
        """Test that deleting a category with children fails."""
        parent = KnowledgeCategoryFactory()
        child = KnowledgeCategoryFactory(parent=parent)
        
        response = authenticated_admin_client.delete(
            f'/api/knowledge/categories/{parent.id}/'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ============ Knowledge Document Tests ============

@pytest.mark.django_db
class TestKnowledgeListCreateAPI:
    """Tests for knowledge list and create endpoints."""
    
    def test_list_knowledge(self, authenticated_user_client, admin_user):
        """Test listing knowledge documents."""
        KnowledgeFactory(created_by=admin_user)
        KnowledgeFactory(created_by=admin_user)
        
        response = authenticated_user_client.get('/api/knowledge/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2
    
    def test_list_knowledge_filter_by_type(self, authenticated_user_client, admin_user):
        """Test filtering knowledge by type."""
        KnowledgeFactory(created_by=admin_user, knowledge_type='OTHER')
        EmergencyKnowledgeFactory(created_by=admin_user)
        
        response = authenticated_user_client.get('/api/knowledge/?knowledge_type=EMERGENCY')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['knowledge_type'] == 'EMERGENCY'
    
    def test_create_other_knowledge_as_admin(self, authenticated_admin_client):
        """
        Test creating OTHER type knowledge as admin.
        
        Requirements: 4.1, 4.3
        """
        data = {
            'title': '测试知识',
            'knowledge_type': 'OTHER',
            'summary': '测试摘要',
            'content': '测试正文内容'
        }
        
        response = authenticated_admin_client.post('/api/knowledge/', data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['title'] == '测试知识'
        assert response.data['knowledge_type'] == 'OTHER'
    
    def test_create_emergency_knowledge_as_admin(self, authenticated_admin_client):
        """
        Test creating EMERGENCY type knowledge as admin.
        
        Requirements: 4.1, 4.2
        """
        data = {
            'title': '应急知识',
            'knowledge_type': 'EMERGENCY',
            'summary': '应急摘要',
            'fault_scenario': '故障场景描述',
            'trigger_process': '触发流程描述',
            'solution': '解决方案描述',
            'verification_plan': '验证方案描述',
            'recovery_plan': '恢复方案描述'
        }
        
        response = authenticated_admin_client.post('/api/knowledge/', data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['knowledge_type'] == 'EMERGENCY'
        assert response.data['fault_scenario'] == '故障场景描述'
    
    def test_create_emergency_knowledge_without_required_fields_fails(
        self, authenticated_admin_client
    ):
        """
        Test that creating EMERGENCY knowledge without required fields fails.
        
        Requirements: 4.2
        """
        data = {
            'title': '应急知识',
            'knowledge_type': 'EMERGENCY',
            'summary': '应急摘要'
            # Missing fault_scenario and solution
        }
        
        response = authenticated_admin_client.post('/api/knowledge/', data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_create_other_knowledge_without_content_fails(
        self, authenticated_admin_client
    ):
        """
        Test that creating OTHER knowledge without content fails.
        
        Requirements: 4.3
        """
        data = {
            'title': '其他知识',
            'knowledge_type': 'OTHER',
            'summary': '摘要'
            # Missing content
        }
        
        response = authenticated_admin_client.post('/api/knowledge/', data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_create_knowledge_non_admin_fails(self, authenticated_user_client):
        """Test that non-admin cannot create knowledge."""
        data = {
            'title': '测试知识',
            'knowledge_type': 'OTHER',
            'content': '测试内容'
        }
        
        response = authenticated_user_client.post('/api/knowledge/', data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_admin_list_prefers_draft_version(self, authenticated_admin_client, admin_user):
        """管理员列表应优先返回草稿版本。"""
        published = KnowledgeFactory(created_by=admin_user, status='PUBLISHED', title='已发布文档')
        draft = KnowledgeFactory(
            created_by=admin_user,
            status='DRAFT',
            title='草稿文档',
            published_version=published,
        )
        
        response = authenticated_admin_client.get('/api/knowledge/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['id'] == draft.id
        assert response.data[0]['status'] == 'DRAFT'
        assert response.data[0]['title'] == '草稿文档'
    
    def test_admin_can_filter_only_published(self, authenticated_admin_client, admin_user):
        """管理员按 status=PUBLISHED 筛选时仍然看到已发布版本。"""
        published = KnowledgeFactory(created_by=admin_user, status='PUBLISHED', title='上线文档')
        KnowledgeFactory(
            created_by=admin_user,
            status='DRAFT',
            title='上线文档草稿',
            published_version=published,
        )
        
        response = authenticated_admin_client.get('/api/knowledge/?status=PUBLISHED')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['id'] == published.id
        assert response.data[0]['status'] == 'PUBLISHED'


@pytest.mark.django_db
class TestKnowledgeDetailAPI:
    """Tests for knowledge detail endpoints."""
    
    def test_get_knowledge_detail(self, authenticated_user_client, admin_user):
        """Test getting knowledge detail."""
        knowledge = KnowledgeFactory(created_by=admin_user)
        
        response = authenticated_user_client.get(f'/api/knowledge/{knowledge.id}/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['title'] == knowledge.title
    
    def test_update_knowledge_as_admin(self, authenticated_admin_client, admin_user):
        """
        Test updating knowledge as admin.
        
        Requirements: 4.4
        """
        knowledge = KnowledgeFactory(created_by=admin_user)
        
        data = {'title': '更新后的标题', 'content': '更新后的内容'}
        response = authenticated_admin_client.patch(
            f'/api/knowledge/{knowledge.id}/', data
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['title'] == '更新后的标题'
    
    def test_delete_knowledge_as_admin(self, authenticated_admin_client, admin_user):
        """Test deleting knowledge as admin (soft delete)."""
        knowledge = KnowledgeFactory(created_by=admin_user)
        
        response = authenticated_admin_client.delete(
            f'/api/knowledge/{knowledge.id}/'
        )
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify soft delete
        knowledge.refresh_from_db()
        assert knowledge.is_deleted is True
    
    def test_deleted_knowledge_not_in_list(self, authenticated_user_client, admin_user):
        """Test that soft-deleted knowledge doesn't appear in list."""
        knowledge = KnowledgeFactory(created_by=admin_user)
        knowledge.soft_delete()
        
        response = authenticated_user_client.get('/api/knowledge/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 0


@pytest.mark.django_db
class TestKnowledgeWithCategories:
    """Tests for knowledge with category relations."""
    
    def test_create_knowledge_with_categories(self, authenticated_admin_client):
        """
        Test creating knowledge with category relations.
        
        Requirements: 4.6
        """
        cat1 = KnowledgeCategoryFactory()
        cat2 = KnowledgeCategoryFactory()
        
        data = {
            'title': '带分类的知识',
            'knowledge_type': 'OTHER',
            'content': '测试内容',
            'category_ids': [cat1.id, cat2.id]
        }
        
        response = authenticated_admin_client.post('/api/knowledge/', data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data['categories']) == 2
    
    def test_update_knowledge_categories(self, authenticated_admin_client, admin_user):
        """Test updating knowledge categories."""
        knowledge = KnowledgeFactory(created_by=admin_user)
        cat1 = KnowledgeCategoryFactory()
        cat2 = KnowledgeCategoryFactory()
        
        # Add initial category
        KnowledgeCategoryRelationFactory(knowledge=knowledge, category=cat1)
        
        # Update to different category
        data = {'category_ids': [cat2.id]}
        response = authenticated_admin_client.patch(
            f'/api/knowledge/{knowledge.id}/', data, format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['categories']) == 1
        assert response.data['categories'][0]['id'] == cat2.id


@pytest.mark.django_db
class TestKnowledgeViewCount:
    """Tests for knowledge view count functionality."""
    
    def test_increment_view_count(self, authenticated_user_client, admin_user):
        """Test incrementing knowledge view count."""
        knowledge = KnowledgeFactory(created_by=admin_user, view_count=0)
        
        response = authenticated_user_client.post(
            f'/api/knowledge/{knowledge.id}/view/'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['view_count'] == 1
        
        # Increment again
        response = authenticated_user_client.post(
            f'/api/knowledge/{knowledge.id}/view/'
        )
        assert response.data['view_count'] == 2
