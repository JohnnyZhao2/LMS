"""
知识文档应用服务

编排业务逻辑，协调 Repository。

版本管理说明：
- 使用 resource_uuid + version_number + is_current 管理版本
- is_current=True 表示当前最新版本
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


class KnowledgeService(BaseService):
    """知识文档应用服务"""
    
    def __init__(self):
        self.repository = KnowledgeRepository()
        self.tag_repository = TagRepository()
    
    def get_by_id(self, pk: int, user=None) -> Knowledge:
        """
        获取知识文档
        
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
        
        # 权限检查：非管理员只能访问当前版本的知识
        if user and not user.is_admin:
            if not knowledge.is_current:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='无权访问该知识文档'
                )
        
        # 如果是当前版本，检查是否有草稿（管理员可见）
        if knowledge.is_current and user and user.is_admin:
            draft = self.repository.get_draft_for_published(pk)
            if draft:
                return draft
        
        return knowledge
    
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
        data['created_by'] = user
        data['updated_by'] = user
        data['is_current'] = True
        
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
        
        版本管理：每次更新都创建新版本，旧版本保持不变
        
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
        
        # 当前版本需要创建新版本
        if knowledge.is_current:
            return self._create_new_version(knowledge, data, user)
        
        # 非当前版本直接更新（历史版本的修正）
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
    
    def create_or_get_current_version(
        self,
        resource_uuid: uuid.UUID,
        user
    ) -> Knowledge:
        """
        获取或创建当前版本
        
        Args:
            resource_uuid: 资源 UUID
            user: 操作用户
            
        Returns:
            当前版本（如果已存在则返回现有版本）
        """
        # 获取当前版本
        current = self.repository.get_current_version(resource_uuid)
        
        if current:
            return current
        
        # 如果没有当前版本，返回 None（不应该发生）
        return None
    
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
        if not existing_versions:
            return 1
        return max(existing_versions) + 1
    
    def _create_new_version(
        self,
        source: Knowledge,
        data: dict,
        user
    ) -> Knowledge:
        """基于当前版本创建新版本"""
        # 获取下一个版本号
        next_version = self._calculate_next_version_number(source)
        
        # 提取标签数据
        line_type_id = data.pop('line_type_id', None)
        system_tag_ids = data.pop('system_tag_ids', None)
        operation_tag_ids = data.pop('operation_tag_ids', None)
        
        # 准备新版本数据
        new_version_data = {
            'resource_uuid': source.resource_uuid,
            'version_number': next_version,
            'title': data.get('title', source.title),
            'knowledge_type': data.get('knowledge_type', source.knowledge_type),
            'summary': data.get('summary', source.summary),
            'fault_scenario': data.get('fault_scenario', source.fault_scenario),
            'trigger_process': data.get('trigger_process', source.trigger_process),
            'solution': data.get('solution', source.solution),
            'verification_plan': data.get('verification_plan', source.verification_plan),
            'recovery_plan': data.get('recovery_plan', source.recovery_plan),
            'content': data.get('content', source.content),
            'source_version_id': source.id,
            'is_current': True,
            'created_by': user,
            'updated_by': user,
            'view_count': source.view_count,
        }
        
        # 创建新版本
        new_version = self.repository.create(**new_version_data)
        
        # 取消旧版本的 is_current 标志
        self.repository.unset_current_flag_for_others(
            resource_uuid=source.resource_uuid,
            exclude_pk=new_version.pk
        )
        
        # 设置标签
        if line_type_id is not None or system_tag_ids is not None or operation_tag_ids is not None:
            self._set_tags(new_version, line_type_id, system_tag_ids, operation_tag_ids)
        else:
            # 复制原有标签
            if source.line_type:
                new_version.set_line_type(source.line_type)
            new_version.system_tags.set(source.system_tags.all())
            new_version.operation_tags.set(source.operation_tags.all())
        
        return new_version
