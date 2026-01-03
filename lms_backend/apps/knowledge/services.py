"""
知识文档应用服务

编排业务逻辑，协调 Repository 和 Domain Service。
"""
import uuid
from typing import Optional, List
from django.db import transaction
from django.utils import timezone
from django.db.models import Q

from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes
from .models import Knowledge
from .repositories import KnowledgeRepository, TagRepository
from .domain.models import KnowledgeDomain, KnowledgeStatus
from .domain.services import KnowledgeDomainService
from .domain.mappers import KnowledgeMapper


class KnowledgeService(BaseService):
    """知识文档应用服务"""
    
    def __init__(self):
        self.repository = KnowledgeRepository()
        self.tag_repository = TagRepository()
        self.domain_service = KnowledgeDomainService()
    
    def get_by_id(self, pk: int, user=None) -> Knowledge:
        """
        获取知识文档（Django Model，保持向后兼容）
        
        Args:
            pk: 主键
            user: 当前用户（用于权限检查）
            
        Returns:
            知识文档对象
            
        Raises:
            BusinessError: 如果不存在或无权限
        """
        knowledge = self.repository.get_by_id(pk)
        self.validate_not_none(
            knowledge,
            f'知识文档 {pk} 不存在'
        )
        
        # 权限检查：非管理员只能访问已发布且当前版本的知识
        if user and not user.is_admin:
            if knowledge.status != 'PUBLISHED' or not knowledge.is_current:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='无权访问该知识文档'
                )
        
        # 如果是已发布版本，检查是否有草稿（管理员可见）
        if knowledge.status == 'PUBLISHED' and user and user.is_admin:
            draft = self.repository.get_draft_for_published(pk)
            if draft:
                return draft
        
        return knowledge
    
    def get_domain_by_id(self, pk: int, user=None) -> KnowledgeDomain:
        """
        获取知识文档（Domain Model）
        
        Args:
            pk: 主键
            user: 当前用户（用于权限检查）
            
        Returns:
            知识文档领域模型
            
        Raises:
            BusinessError: 如果不存在或无权限
        """
        knowledge_domain = self.repository.get_domain_by_id(pk)
        self.validate_not_none(
            knowledge_domain,
            f'知识文档 {pk} 不存在'
        )
        
        # 权限检查：非管理员只能访问已发布且当前版本的知识
        if user and not user.is_admin:
            if not knowledge_domain.is_published() or not knowledge_domain.is_current:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='无权访问该知识文档'
                )
        
        # 如果是已发布版本，检查是否有草稿（管理员可见）
        if knowledge_domain.is_published() and user and user.is_admin:
            draft = self.repository.get_draft_for_published_domain(pk)
            if draft:
                return draft
        
        return knowledge_domain
    
    def get_published_list(
        self,
        filters: dict = None,
        search: str = None,
        limit: int = None,
        offset: int = None
    ) -> List[Knowledge]:
        """
        获取已发布的知识文档列表
        
        Args:
            filters: 过滤条件
            search: 搜索关键词
            limit: 限制数量
            offset: 偏移量
            
        Returns:
            知识文档列表
        """
        return list(self.repository.get_published_list(
            filters=filters,
            search=search,
            limit=limit,
            offset=offset
        ))
    
    def get_all_with_filters(
        self,
        filters: dict = None,
        search: str = None,
        filter_type: str = None,
        ordering: str = '-updated_at'
    ) -> List[Knowledge]:
        """
        获取所有知识文档（支持管理员筛选）
        
        Args:
            filters: 过滤条件
            search: 搜索关键词
            filter_type: 筛选类型（ALL/PUBLISHED_CLEAN/REVISING/UNPUBLISHED）
            ordering: 排序字段
            
        Returns:
            知识文档列表
        """
        return list(self.repository.get_all_with_filters(
            filters=filters,
            search=search,
            filter_type=filter_type,
            ordering=ordering
        ))
    
    @transaction.atomic
    def create(self, data: dict, user) -> Knowledge:
        """
        创建知识文档
        
        Args:
            data: 知识文档数据
            user: 创建用户
            
        Returns:
            创建的知识文档对象
            
        Raises:
            BusinessError: 如果验证失败
        """
        # 1. 业务验证
        self._validate_knowledge_data(data)
        
        # 2. 准备数据
        data['status'] = 'DRAFT'
        data['created_by'] = user
        data['updated_by'] = user
        
        # 处理版本号
        if not data.get('resource_uuid'):
            data['resource_uuid'] = uuid.uuid4()
        data['version_number'] = 1
        
        # 提取标签数据
        line_type_id = data.pop('line_type_id', None)
        system_tag_ids = data.pop('system_tag_ids', [])
        operation_tag_ids = data.pop('operation_tag_ids', [])
        
        # 3. 创建知识
        knowledge = self.repository.create(**data)
        
        # 4. 设置标签
        self._set_tags(knowledge, line_type_id, system_tag_ids, operation_tag_ids)
        
        return knowledge
    
    @transaction.atomic
    def update(self, pk: int, data: dict, user) -> Knowledge:
        """
        更新知识文档
        
        Args:
            pk: 主键
            data: 更新数据
            user: 更新用户
            
        Returns:
            更新后的知识文档对象
            
        Raises:
            BusinessError: 如果验证失败或无法更新
        """
        knowledge = self.get_by_id(pk, user)
        
        # 已发布的知识需要创建新版本
        if knowledge.status == 'PUBLISHED':
            return self._create_new_version(knowledge, data, user)
        
        # 草稿直接更新
        self._validate_knowledge_data(data)
        
        # 提取标签数据
        line_type_id = data.pop('line_type_id', None)
        system_tag_ids = data.pop('system_tag_ids', None)
        operation_tag_ids = data.pop('operation_tag_ids', None)
        
        data['updated_by'] = user
        knowledge = self.repository.update(knowledge, **data)
        
        # 更新标签
        if line_type_id is not None or system_tag_ids is not None or operation_tag_ids is not None:
            self._set_tags(knowledge, line_type_id, system_tag_ids, operation_tag_ids)
        
        return knowledge
    
    @transaction.atomic
    def publish(self, pk: int, user) -> Knowledge:
        """
        发布知识文档（使用 Domain Service）
        
        Args:
            pk: 主键
            user: 发布用户
            
        Returns:
            发布后的知识文档对象
            
        Raises:
            BusinessError: 如果无法发布
        """
        # 获取 Domain Model
        knowledge_domain = self.repository.get_domain_by_id(pk)
        self.validate_not_none(
            knowledge_domain,
            f'知识文档 {pk} 不存在'
        )
        
        # 使用 Domain Service 发布
        try:
            knowledge_domain = self.domain_service.publish_knowledge(
                knowledge_domain,
                published_at=timezone.now(),
                updated_by_id=user.id
            )
        except ValueError as e:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message=str(e)
            )
        
        # 获取 Django Model 并更新
        knowledge_orm = self.repository.get_by_id(pk)
        knowledge_orm = self.repository.update_from_domain(knowledge_orm, knowledge_domain)
        knowledge_orm.save()
        
        # 取消其他版本的 is_current 标志
        self.repository.unset_current_flag_for_others(
            resource_uuid=knowledge_domain.resource_uuid,
            exclude_pk=pk
        )
        
        return knowledge_orm
    
    @transaction.atomic
    def unpublish(self, pk: int, user) -> Knowledge:
        """
        取消发布知识文档（使用 Domain Service）
        
        Args:
            pk: 主键
            user: 操作用户
            
        Returns:
            取消发布后的知识文档对象
            
        Raises:
            BusinessError: 如果无法取消发布
        """
        # 获取 Domain Model
        knowledge_domain = self.repository.get_domain_by_id(pk)
        self.validate_not_none(
            knowledge_domain,
            f'知识文档 {pk} 不存在'
        )
        
        # 检查是否被引用
        is_referenced = self.repository.is_referenced_by_task(pk)
        
        # 使用 Domain Service 取消发布
        try:
            knowledge_domain = self.domain_service.unpublish_knowledge(
                knowledge_domain,
                updated_by_id=user.id,
                is_referenced=is_referenced
            )
        except ValueError as e:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message=str(e)
            )
        
        # 获取 Django Model 并更新
        knowledge_orm = self.repository.get_by_id(pk)
        knowledge_orm = self.repository.update_from_domain(knowledge_orm, knowledge_domain)
        knowledge_orm.save()
        
        return knowledge_orm
    
    @transaction.atomic
    def delete(self, pk: int) -> None:
        """
        删除知识文档
        
        Args:
            pk: 主键
            
        Raises:
            BusinessError: 如果被引用无法删除
        """
        knowledge = self.repository.get_by_id(pk)
        self.validate_not_none(
            knowledge,
            f'知识文档 {pk} 不存在'
        )
        
        # 检查是否被引用
        if self.repository.is_referenced_by_task(pk):
            raise BusinessError(
                code=ErrorCodes.RESOURCE_REFERENCED,
                message='该知识文档已被任务引用，无法删除'
            )
        
        # 软删除
        self.repository.delete(knowledge, soft=True)
    
    def increment_view_count(self, pk: int) -> int:
        """
        增加知识文档的阅读次数
        
        Args:
            pk: 主键
            
        Returns:
            更新后的阅读次数
        """
        knowledge = self.repository.get_by_id(pk)
        self.validate_not_none(
            knowledge,
            f'知识文档 {pk} 不存在'
        )
        
        return knowledge.increment_view_count()
    
    def _validate_knowledge_data(self, data: dict) -> None:
        """验证知识文档数据"""
        knowledge_type = data.get('knowledge_type')
        
        if knowledge_type == 'EMERGENCY':
            structured_fields = [
                data.get('fault_scenario', ''),
                data.get('trigger_process', ''),
                data.get('solution', ''),
                data.get('verification_plan', ''),
                data.get('recovery_plan', ''),
            ]
            if not any(f.strip() for f in structured_fields):
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='应急类知识必须至少填写一个结构化字段'
                )
        elif knowledge_type == 'OTHER':
            if not data.get('content', '').strip():
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='其他类型知识必须填写正文内容'
                )
    
    def _set_tags(
        self,
        knowledge: Knowledge,
        line_type_id: Optional[int],
        system_tag_ids: Optional[List[int]],
        operation_tag_ids: Optional[List[int]]
    ) -> None:
        """设置标签"""
        if line_type_id:
            line_type = self.tag_repository.get_by_id(line_type_id)
            if line_type:
                knowledge.set_line_type(line_type)
        
        if system_tag_ids is not None:
            knowledge.system_tags.set(system_tag_ids)
        
        if operation_tag_ids is not None:
            knowledge.operation_tags.set(operation_tag_ids)
    
    def create_or_get_draft_from_published(
        self,
        published: Knowledge,
        user
    ) -> Knowledge:
        """
        从已发布版本创建或获取草稿版本
        
        Args:
            published: 已发布的知识文档
            user: 操作用户
            
        Returns:
            草稿版本（如果已存在则返回现有草稿，否则创建新草稿）
        """
        # 检查是否已存在草稿
        existing_draft = self.repository.get_draft_for_resource(
            resource_uuid=published.resource_uuid
        )
        
        if existing_draft:
            existing_draft.updated_by = user
            existing_draft.save(update_fields=['updated_by', 'updated_at'])
            return existing_draft
        
        # 创建新草稿
        return self._create_draft_from_published(published, user)
    
    def _calculate_next_version_number(
        self,
        source: Knowledge
    ) -> int:
        """
        计算下一个版本号
        
        Args:
            source: 源知识文档
            
        Returns:
            下一个版本号
        """
        existing_versions = self.repository.get_version_numbers(
            resource_uuid=source.resource_uuid
        )
        source_domain = KnowledgeMapper.to_domain(source)
        return self.domain_service.calculate_next_version_number(
            source_domain.version_number,
            existing_versions
        )
    
    def _create_draft_from_published(
        self,
        source: Knowledge,
        user
    ) -> Knowledge:
        """基于已发布版本创建新草稿版本（使用 Domain Service）"""
        # 转换为 Domain Model
        source_domain = KnowledgeMapper.to_domain(source)
        
        # 获取下一个版本号
        next_version = self._calculate_next_version_number(source)
        
        # 使用 Domain Service 创建草稿
        draft_domain = self.domain_service.create_draft_from_published(
            source_domain,
            new_version_number=next_version,
            created_by_id=user.id
        )
        
        # 创建 Django Model
        draft_orm = self.repository.create_from_domain(draft_domain)
        
        return draft_orm
    
    def _create_new_version(
        self,
        source: Knowledge,
        data: dict,
        user
    ) -> Knowledge:
        """基于已发布版本创建新版本（使用 Domain Service）"""
        # 转换为 Domain Model
        source_domain = KnowledgeMapper.to_domain(source)
        
        # 获取下一个版本号
        next_version = self._calculate_next_version_number(source)
        
        # 使用 Domain Service 创建草稿
        draft_domain = self.domain_service.create_draft_from_published(
            source_domain,
            new_version_number=next_version,
            created_by_id=user.id
        )
        
        # 更新字段
        for key, value in data.items():
            if hasattr(draft_domain, key) and key not in ['line_type_id', 'system_tag_ids', 'operation_tag_ids']:
                setattr(draft_domain, key, value)
        
        # 创建 Django Model
        draft_orm = self.repository.create_from_domain(draft_domain)
        
        # 统一使用_set_tags方法设置标签
        line_type_id = data.get('line_type_id')
        system_tag_ids = data.get('system_tag_ids')
        operation_tag_ids = data.get('operation_tag_ids')
        if line_type_id is not None or system_tag_ids is not None or operation_tag_ids is not None:
            self._set_tags(draft_orm, line_type_id, system_tag_ids, operation_tag_ids)
        
        return draft_orm
