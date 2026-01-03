# 架构重构实施方案

## 📋 执行概要

**目标**：将现有 Django/DRF 单体应用重构为 Clean Architecture 架构

**策略**：渐进式重构 + 混合方案
- **阶段1**：快速重构（方案A）- 引入 Repository 层，重构 Service 层
- **阶段2**：核心模块引入 Domain 层（我的设计）
- **阶段3**：全面采用 Domain 层

**时间线**：4-6 周

**风险控制**：分模块重构，每个模块独立验证，可随时回滚

---

## 🗓️ 总体时间线

```
Week 1: 基础设施准备 + Knowledge 模块重构
Week 2: Users + Tasks 模块重构
Week 3: Submissions + 其他模块重构
Week 4: 测试验证 + 文档完善
Week 5-6: 核心模块引入 Domain 层（可选）
```

---

## 📅 阶段1：基础设施准备（Day 1-2）

### Day 1：创建基础类

#### 1.1 创建 Base Repository

**文件**：`core/base_repository.py`

```python
"""
基础仓储抽象类

所有 Repository 都应继承此类，提供统一的数据访问接口。
"""
from abc import ABC, abstractmethod
from typing import TypeVar, Generic, Optional, List, Dict, Any
from django.db.models import Model, QuerySet

T = TypeVar('T', bound=Model)


class BaseRepository(ABC, Generic[T]):
    """
    基础仓储抽象类
    
    提供通用的 CRUD 操作接口，子类需要指定 model 属性。
    """
    
    model: type[T] = None
    
    def __init__(self):
        if self.model is None:
            raise ValueError(f"{self.__class__.__name__} must set 'model' attribute")
    
    def get_by_id(self, pk: int, include_deleted: bool = False) -> Optional[T]:
        """
        根据 ID 获取实体
        
        Args:
            pk: 主键
            include_deleted: 是否包含已删除的记录（软删除）
            
        Returns:
            实体对象或 None
        """
        qs = self.model.objects.all()
        
        # 处理软删除
        if not include_deleted and hasattr(self.model, 'is_deleted'):
            qs = qs.filter(is_deleted=False)
        
        return qs.filter(pk=pk).first()
    
    def get_all(
        self,
        filters: Dict[str, Any] = None,
        exclude: Dict[str, Any] = None,
        ordering: str = None
    ) -> QuerySet[T]:
        """
        获取所有实体（支持过滤、排序）
        
        Args:
            filters: 过滤条件
            exclude: 排除条件
            ordering: 排序字段（如 '-created_at'）
            
        Returns:
            QuerySet
        """
        qs = self.model.objects.all()
        
        # 处理软删除
        if hasattr(self.model, 'is_deleted'):
            qs = qs.filter(is_deleted=False)
        
        if filters:
            qs = qs.filter(**filters)
        
        if exclude:
            qs = qs.exclude(**exclude)
        
        if ordering:
            qs = qs.order_by(ordering)
        
        return qs
    
    def create(self, **data) -> T:
        """
        创建实体
        
        Args:
            **data: 实体数据
            
        Returns:
            创建的实体对象
        """
        return self.model.objects.create(**data)
    
    def update(self, instance: T, **data) -> T:
        """
        更新实体
        
        Args:
            instance: 要更新的实体对象
            **data: 更新的数据
            
        Returns:
            更新后的实体对象
        """
        for key, value in data.items():
            setattr(instance, key, value)
        instance.save()
        return instance
    
    def delete(self, instance: T, soft: bool = True) -> None:
        """
        删除实体
        
        Args:
            instance: 要删除的实体对象
            soft: 是否软删除（如果支持）
        """
        if soft and hasattr(instance, 'soft_delete'):
            instance.soft_delete()
        else:
            instance.delete()
    
    def exists(self, **filters) -> bool:
        """
        检查实体是否存在
        
        Args:
            **filters: 过滤条件
            
        Returns:
            True 如果存在
        """
        qs = self.model.objects.filter(**filters)
        if hasattr(self.model, 'is_deleted'):
            qs = qs.filter(is_deleted=False)
        return qs.exists()
    
    def count(self, **filters) -> int:
        """
        统计实体数量
        
        Args:
            **filters: 过滤条件
            
        Returns:
            数量
        """
        qs = self.model.objects.filter(**filters)
        if hasattr(self.model, 'is_deleted'):
            qs = qs.filter(is_deleted=False)
        return qs.count()
```

#### 1.2 创建 Base Service

**文件**：`core/base_service.py`

```python
"""
基础服务类

提供通用的服务方法，所有 Service 可以继承此类。
"""
from typing import Optional
from django.db import transaction

from core.exceptions import BusinessError, ErrorCodes


class BaseService:
    """
    基础服务类
    
    提供通用的验证和错误处理方法。
    """
    
    def validate_not_none(self, value: any, error_message: str):
        """
        验证值不为 None
        
        Args:
            value: 要验证的值
            error_message: 错误消息
            
        Raises:
            BusinessError: 如果值为 None
        """
        if value is None:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message=error_message
            )
    
    def validate_exists(self, repository, pk: int, resource_name: str):
        """
        验证资源存在
        
        Args:
            repository: Repository 实例
            pk: 主键
            resource_name: 资源名称（用于错误消息）
            
        Returns:
            资源对象
            
        Raises:
            BusinessError: 如果资源不存在
        """
        resource = repository.get_by_id(pk)
        self.validate_not_none(
            resource,
            f'{resource_name} {pk} 不存在'
        )
        return resource
    
    def validate_permission(self, condition: bool, error_message: str):
        """
        验证权限
        
        Args:
            condition: 权限条件
            error_message: 错误消息
            
        Raises:
            BusinessError: 如果权限不足
        """
        if not condition:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message=error_message
            )
```

#### 1.3 完善异常处理

**文件**：`core/exceptions.py`（更新）

```python
"""
统一异常定义

所有业务异常都应继承自 BusinessError，使用统一的错误码。
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


class BusinessError(Exception):
    """业务逻辑错误基类"""
    
    def __init__(self, code: str, message: str, details: dict = None):
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(message)


class ErrorCodes:
    """错误码常量"""
    
    # 通用错误
    RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND'
    PERMISSION_DENIED = 'PERMISSION_DENIED'
    VALIDATION_ERROR = 'VALIDATION_ERROR'
    INVALID_OPERATION = 'INVALID_OPERATION'
    
    # 认证错误
    AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS'
    AUTH_USER_INACTIVE = 'AUTH_USER_INACTIVE'
    AUTH_INVALID_ROLE = 'AUTH_INVALID_ROLE'
    
    # 资源错误
    RESOURCE_REFERENCED = 'RESOURCE_REFERENCED'
    RESOURCE_VERSION_MISMATCH = 'RESOURCE_VERSION_MISMATCH'
    
    # 任务错误
    TASK_INVALID_ASSIGNEES = 'TASK_INVALID_ASSIGNEES'
    TASK_ALREADY_CLOSED = 'TASK_ALREADY_CLOSED'
    
    # 提交错误
    EXAM_NOT_IN_WINDOW = 'EXAM_NOT_IN_WINDOW'
    EXAM_ALREADY_SUBMITTED = 'EXAM_ALREADY_SUBMITTED'


def custom_exception_handler(exc, context):
    """
    自定义异常处理器
    
    统一格式化所有异常响应。
    """
    # Handle BusinessError
    if isinstance(exc, BusinessError):
        return Response(
            {
                'code': exc.code,
                'message': exc.message,
                'details': exc.details,
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Call REST framework's default exception handler
    response = exception_handler(exc, context)
    
    if response is not None:
        error_data = {
            'code': 'ERROR',
            'message': str(exc),
            'details': {},
        }
        
        # Handle validation errors
        if hasattr(response, 'data'):
            if isinstance(response.data, dict):
                if 'detail' in response.data:
                    error_data['message'] = str(response.data['detail'])
                else:
                    error_data['details'] = response.data
        
        # Set appropriate error code based on status
        if response.status_code == 401:
            error_data['code'] = ErrorCodes.AUTH_INVALID_CREDENTIALS
        elif response.status_code == 403:
            error_data['code'] = ErrorCodes.PERMISSION_DENIED
        elif response.status_code == 404:
            error_data['code'] = ErrorCodes.RESOURCE_NOT_FOUND
        
        response.data = error_data
    
    return response
```

#### 1.4 验证清单

- [ ] `core/base_repository.py` 创建完成
- [ ] `core/base_service.py` 创建完成
- [ ] `core/exceptions.py` 更新完成
- [ ] 运行测试确保无破坏性变更
- [ ] 代码审查通过

---

## 📅 阶段2：Knowledge 模块重构（Day 3-5）

### Day 3：创建 Repository

#### 2.1 创建 KnowledgeRepository

**文件**：`apps/knowledge/repositories.py`

```python
"""
知识文档仓储实现

负责所有知识文档相关的数据访问操作。
"""
from typing import Optional, List
from django.db.models import QuerySet, Q
from django.contrib.contenttypes.models import ContentType

from core.base_repository import BaseRepository
from .models import Knowledge, Tag, ResourceLineType


class KnowledgeRepository(BaseRepository[Knowledge]):
    """知识文档仓储"""
    
    model = Knowledge
    
    def get_by_id(
        self,
        pk: int,
        include_deleted: bool = False
    ) -> Optional[Knowledge]:
        """
        根据 ID 获取知识文档
        
        Args:
            pk: 主键
            include_deleted: 是否包含已删除的记录
            
        Returns:
            知识文档对象或 None
        """
        qs = self.model.objects.select_related(
            'created_by',
            'updated_by'
        ).prefetch_related(
            'system_tags',
            'operation_tags'
        )
        
        if not include_deleted:
            qs = qs.filter(is_deleted=False)
        
        return qs.filter(pk=pk).first()
    
    def get_published_list(
        self,
        filters: dict = None,
        search: str = None,
        ordering: str = '-created_at',
        limit: int = None,
        offset: int = None
    ) -> QuerySet[Knowledge]:
        """
        获取已发布的知识文档列表
        
        Args:
            filters: 过滤条件
            search: 搜索关键词
            ordering: 排序字段
            limit: 限制数量
            offset: 偏移量
            
        Returns:
            QuerySet
        """
        qs = self.model.objects.filter(
            status='PUBLISHED',
            is_deleted=False,
            is_current=True
        ).select_related('created_by')
        
        # 应用过滤条件
        if filters:
            if filters.get('knowledge_type'):
                qs = qs.filter(knowledge_type=filters['knowledge_type'])
            if filters.get('line_type_id'):
                content_type = ContentType.objects.get_for_model(self.model)
                qs = qs.filter(
                    id__in=ResourceLineType.objects.filter(
                        content_type=content_type,
                        line_type_id=filters['line_type_id']
                    ).values_list('object_id', flat=True)
                )
        
        # 搜索
        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(summary__icontains=search)
            )
        
        # 排序
        if ordering:
            qs = qs.order_by(ordering)
        
        # 分页
        if limit:
            qs = qs[offset:offset+limit] if offset else qs[:limit]
        
        return qs
    
    def get_draft_for_resource(
        self,
        resource_uuid: str
    ) -> Optional[Knowledge]:
        """
        获取资源的草稿版本
        
        Args:
            resource_uuid: 资源 UUID
            
        Returns:
            草稿版本或 None
        """
        return self.model.objects.filter(
            resource_uuid=resource_uuid,
            status='DRAFT',
            is_deleted=False
        ).first()
    
    def is_referenced_by_task(self, knowledge_id: int) -> bool:
        """
        检查知识文档是否被任务引用
        
        Args:
            knowledge_id: 知识文档 ID
            
        Returns:
            True 如果被引用
        """
        from apps.tasks.models import TaskKnowledge
        return TaskKnowledge.objects.filter(
            knowledge_id=knowledge_id
        ).exists()
    
    def get_current_published_version(
        self,
        resource_uuid: str
    ) -> Optional[Knowledge]:
        """
        获取资源的当前已发布版本
        
        Args:
            resource_uuid: 资源 UUID
            
        Returns:
            当前已发布版本或 None
        """
        return self.model.objects.filter(
            resource_uuid=resource_uuid,
            status='PUBLISHED',
            is_current=True,
            is_deleted=False
        ).first()


class TagRepository(BaseRepository[Tag]):
    """标签仓储"""
    
    model = Tag
    
    def get_by_type(self, tag_type: str) -> QuerySet[Tag]:
        """
        按类型获取标签
        
        Args:
            tag_type: 标签类型（LINE, SYSTEM, OPERATION）
            
        Returns:
            QuerySet
        """
        return self.model.objects.filter(
            tag_type=tag_type,
            is_active=True
        ).order_by('sort_order', 'name')
    
    def get_line_types(self) -> QuerySet[Tag]:
        """获取条线类型"""
        return self.get_by_type('LINE')
    
    def get_system_tags(
        self,
        line_type_id: int = None
    ) -> QuerySet[Tag]:
        """
        获取系统标签
        
        Args:
            line_type_id: 可选的条线类型 ID（用于过滤）
            
        Returns:
            QuerySet
        """
        qs = self.get_by_type('SYSTEM')
        if line_type_id:
            qs = qs.filter(parent_id=line_type_id)
        return qs
    
    def get_operation_tags(self) -> QuerySet[Tag]:
        """获取操作标签"""
        return self.get_by_type('OPERATION')
```

### Day 4：重构 Service

#### 2.2 重构 KnowledgeService

**文件**：`apps/knowledge/services.py`（重构）

```python
"""
知识文档应用服务

编排业务逻辑，协调 Repository 和 Domain Service。
"""
from typing import Optional, List
from django.db import transaction
from django.utils import timezone

from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes
from .models import Knowledge
from .repositories import KnowledgeRepository, TagRepository


class KnowledgeService(BaseService):
    """知识文档应用服务"""
    
    def __init__(self):
        self.repository = KnowledgeRepository()
        self.tag_repository = TagRepository()
    
    def get_by_id(self, pk: int) -> Knowledge:
        """
        获取知识文档
        
        Args:
            pk: 主键
            
        Returns:
            知识文档对象
            
        Raises:
            BusinessError: 如果不存在
        """
        knowledge = self.repository.get_by_id(pk)
        self.validate_not_none(
            knowledge,
            f'知识文档 {pk} 不存在'
        )
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
        
        # 处理版本号
        if not data.get('resource_uuid'):
            import uuid
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
        knowledge = self.get_by_id(pk)
        
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
        if line_type_id is not None:
            self._set_tags(knowledge, line_type_id, system_tag_ids, operation_tag_ids)
        
        return knowledge
    
    @transaction.atomic
    def publish(self, pk: int, user) -> Knowledge:
        """
        发布知识文档
        
        Args:
            pk: 主键
            user: 发布用户
            
        Returns:
            发布后的知识文档对象
            
        Raises:
            BusinessError: 如果无法发布
        """
        knowledge = self.get_by_id(pk)
        
        if knowledge.status == 'PUBLISHED':
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='知识文档已是发布状态'
            )
        
        # 验证内容完整性
        self._validate_for_publish(knowledge)
        
        # 更新状态
        knowledge.status = 'PUBLISHED'
        knowledge.is_current = True
        knowledge.published_at = timezone.now()
        knowledge.updated_by = user
        knowledge.save()
        
        # 取消其他版本的 is_current 标志
        Knowledge.objects.filter(
            resource_uuid=knowledge.resource_uuid,
            status='PUBLISHED'
        ).exclude(pk=pk).update(is_current=False)
        
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
        knowledge = self.get_by_id(pk)
        
        # 检查是否被引用
        if self.repository.is_referenced_by_task(pk):
            raise BusinessError(
                code=ErrorCodes.RESOURCE_REFERENCED,
                message='该知识文档已被任务引用，无法删除'
            )
        
        # 软删除
        self.repository.delete(knowledge, soft=True)
    
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
    
    def _validate_for_publish(self, knowledge: Knowledge) -> None:
        """验证知识文档是否可发布"""
        if not knowledge.title.strip():
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='标题不能为空'
            )
        
        # 可以添加更多验证规则
        self._validate_knowledge_data({
            'knowledge_type': knowledge.knowledge_type,
            'content': knowledge.content,
            'fault_scenario': knowledge.fault_scenario,
            # ... 其他字段
        })
    
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
    
    def _create_new_version(
        self,
        source: Knowledge,
        data: dict,
        user
    ) -> Knowledge:
        """基于已发布版本创建新版本"""
        # 使用 Model 的 clone_as_draft 方法（暂时保留，未来迁移到 Domain 层）
        draft = source.clone_as_draft(user)
        
        # 更新字段
        for key, value in data.items():
            if hasattr(draft, key) and key not in ['line_type_id', 'system_tag_ids', 'operation_tag_ids']:
                setattr(draft, key, value)
        
        draft.save()
        
        # 更新标签
        line_type_id = data.get('line_type_id')
        system_tag_ids = data.get('system_tag_ids')
        operation_tag_ids = data.get('operation_tag_ids')
        
        if line_type_id is not None or system_tag_ids is not None or operation_tag_ids is not None:
            self._set_tags(draft, line_type_id, system_tag_ids, operation_tag_ids)
        
        return draft
```

### Day 5：重构 Views

#### 2.3 重构 Knowledge Views

**文件**：`apps/knowledge/views/knowledge.py`（重构）

```python
"""
知识文档视图

只处理 HTTP 请求/响应，所有业务逻辑在 Service 层。
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from core.exceptions import BusinessError
from core.permissions import IsAdmin
from ..services import KnowledgeService
from ..serializers import (
    KnowledgeListSerializer,
    KnowledgeDetailSerializer,
    KnowledgeCreateSerializer,
    KnowledgeUpdateSerializer,
)


class KnowledgeListCreateView(APIView):
    """知识文档列表和创建"""
    permission_classes = [IsAuthenticated]
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = KnowledgeService()
    
    def get(self, request):
        """获取知识文档列表"""
        # 1. 获取查询参数
        filters = {
            'knowledge_type': request.query_params.get('knowledge_type'),
            'line_type_id': request.query_params.get('line_type_id'),
        }
        filters = {k: v for k, v in filters.items() if v}
        search = request.query_params.get('search')
        
        # 2. 调用 Service
        knowledge_list = self.service.get_published_list(
            filters=filters,
            search=search
        )
        
        # 3. 序列化输出
        serializer = KnowledgeListSerializer(knowledge_list, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def post(self, request):
        """创建知识文档"""
        # 1. 权限检查
        if not IsAdmin().has_permission(request, self):
            return Response(
                {'code': 'PERMISSION_DENIED', 'message': '无权限创建知识文档'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # 2. 反序列化输入
        serializer = KnowledgeCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # 3. 调用 Service
        try:
            knowledge = self.service.create(
                data=serializer.validated_data,
                user=request.user
            )
        except BusinessError as e:
            return Response(
                {'code': e.code, 'message': e.message, 'details': e.details},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 4. 序列化输出
        output = KnowledgeDetailSerializer(knowledge)
        return Response(output.data, status=status.HTTP_201_CREATED)


class KnowledgeDetailView(APIView):
    """知识文档详情、更新、删除"""
    permission_classes = [IsAuthenticated]
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = KnowledgeService()
    
    def get(self, request, pk):
        """获取知识文档详情"""
        try:
            knowledge = self.service.get_by_id(pk)
        except BusinessError as e:
            return Response(
                {'code': e.code, 'message': e.message},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = KnowledgeDetailSerializer(knowledge)
        return Response(serializer.data)
    
    def patch(self, request, pk):
        """更新知识文档"""
        # 权限检查
        if not IsAdmin().has_permission(request, self):
            return Response(
                {'code': 'PERMISSION_DENIED', 'message': '无权限更新知识文档'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = KnowledgeUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        try:
            knowledge = self.service.update(
                pk=pk,
                data=serializer.validated_data,
                user=request.user
            )
        except BusinessError as e:
            return Response(
                {'code': e.code, 'message': e.message, 'details': e.details},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        output = KnowledgeDetailSerializer(knowledge)
        return Response(output.data)
    
    def delete(self, request, pk):
        """删除知识文档"""
        # 权限检查
        if not IsAdmin().has_permission(request, self):
            return Response(
                {'code': 'PERMISSION_DENIED', 'message': '无权限删除知识文档'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            self.service.delete(pk)
        except BusinessError as e:
            return Response(
                {'code': e.code, 'message': e.message, 'details': e.details},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response(status=status.HTTP_204_NO_CONTENT)


class KnowledgePublishView(APIView):
    """发布知识文档"""
    permission_classes = [IsAuthenticated]
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = KnowledgeService()
    
    def post(self, request, pk):
        """发布知识文档"""
        # 权限检查
        if not IsAdmin().has_permission(request, self):
            return Response(
                {'code': 'PERMISSION_DENIED', 'message': '无权限发布知识文档'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            knowledge = self.service.publish(pk, request.user)
        except BusinessError as e:
            return Response(
                {'code': e.code, 'message': e.message, 'details': e.details},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = KnowledgeDetailSerializer(knowledge)
        return Response(serializer.data)
```

#### 2.4 清理 Model 中的业务逻辑

**文件**：`apps/knowledge/models.py`（清理）

**需要移除的方法**：
- `publish()` → 迁移到 `KnowledgeService.publish()`
- `clone_as_draft()` → 暂时保留（未来迁移到 Domain 层）
- `unpublish()` → 迁移到 `KnowledgeService.unpublish()`（如果存在）
- `is_referenced_by_task()` → 迁移到 `KnowledgeRepository.is_referenced_by_task()`

**保留的方法**：
- `clean()` - Django 验证钩子
- `__str__()` - 字符串表示
- `@property` 方法 - 计算属性（如 `content_preview`）

#### 2.5 验证清单

- [ ] `KnowledgeRepository` 创建完成
- [ ] `TagRepository` 创建完成
- [ ] `KnowledgeService` 重构完成
- [ ] `Knowledge Views` 重构完成（移除业务逻辑）
- [ ] `Knowledge Model` 清理完成（移除业务方法）
- [ ] 所有 API 端点测试通过
- [ ] 单元测试通过
- [ ] 集成测试通过

---

## 📅 阶段3：其他模块重构（Day 6-15）

### Week 2：Users + Tasks 模块

#### 3.1 Users 模块重构

**任务清单**：
- [ ] 创建 `UserRepository`
- [ ] 创建 `RoleRepository`
- [ ] 重构 `UserService`（使用 Repository）
- [ ] 重构 `User Views`（移除业务逻辑）
- [ ] 测试验证

#### 3.2 Tasks 模块重构

**任务清单**：
- [ ] 创建 `TaskRepository`
- [ ] 创建 `TaskAssignmentRepository`
- [ ] 重构 `TaskService`（使用 Repository）
- [ ] 重构 `Task Views`（移除业务逻辑）
- [ ] 测试验证

### Week 3：Submissions + 其他模块

#### 3.3 Submissions 模块重构

**任务清单**：
- [ ] 创建 `SubmissionRepository`
- [ ] 重构 `SubmissionService`（使用 Repository）
- [ ] 重构 `Submission Views`（移除业务逻辑）
- [ ] 测试验证

#### 3.4 其他模块重构

**模块列表**：
- [ ] Questions 模块
- [ ] Quizzes 模块
- [ ] Notifications 模块
- [ ] Spot Checks 模块
- [ ] Analytics 模块

---

## 📅 阶段4：测试与文档（Day 16-20）

### 4.1 测试验证

**测试清单**：
- [ ] 所有单元测试通过
- [ ] 所有集成测试通过
- [ ] API 端点测试通过
- [ ] 性能测试（确保无性能退化）
- [ ] 回归测试

### 4.2 代码审查

**审查清单**：
- [ ] 代码风格统一
- [ ] 无业务逻辑在 View 层
- [ ] 无业务逻辑在 Model 层
- [ ] Repository 层职责清晰
- [ ] Service 层职责清晰

### 4.3 文档完善

**文档清单**：
- [ ] 更新 API 文档
- [ ] 更新架构文档
- [ ] 更新开发指南
- [ ] 更新部署文档

---

## 📅 阶段5：Domain 层引入（可选，Week 5-6）

### 5.1 选择核心模块

**建议模块**：
- Knowledge（核心业务）
- Task（核心业务）

### 5.2 引入 Domain 层

**任务清单**：
- [x] 创建 `domain/models.py`（Domain Model）
- [x] 创建 `domain/services.py`（Domain Service）
- [x] 创建 `domain/mappers.py`（Domain Model 映射器）
- [x] 更新 Repository（返回 Domain Model）
- [x] 更新 Service（操作 Domain Model）
- [x] 测试验证

**已完成内容**：

#### Knowledge 模块 Domain 层
- ✅ 创建 `apps/knowledge/domain/models.py` - KnowledgeDomain 领域模型
- ✅ 创建 `apps/knowledge/domain/services.py` - KnowledgeDomainService 领域服务
- ✅ 创建 `apps/knowledge/domain/mappers.py` - KnowledgeMapper 映射器
- ✅ 更新 `KnowledgeRepository` - 添加返回 Domain Model 的方法
- ✅ 更新 `KnowledgeService` - 使用 Domain Service 处理发布/取消发布等业务逻辑

#### Task 模块 Domain 层
- ✅ 创建 `apps/tasks/domain/models.py` - TaskDomain 和 TaskAssignmentDomain 领域模型
- ✅ 创建 `apps/tasks/domain/services.py` - TaskDomainService 领域服务
- ✅ 创建 `apps/tasks/domain/mappers.py` - TaskMapper 和 TaskAssignmentMapper 映射器
- ✅ 更新 `TaskRepository` - 添加返回 Domain Model 的方法
- ✅ 更新 `TaskService` - 使用 Domain Service 处理任务关闭等业务逻辑
- ✅ 更新 `StudentTaskService` - 使用 Domain Service 检查任务分配逾期状态

---

## ✅ 验证清单（每个模块）

### Repository 层验证

- [ ] 继承 `BaseRepository`
- [ ] 所有数据库操作在 Repository
- [ ] 提供领域友好的查询接口
- [ ] 不包含业务逻辑

### Service 层验证

- [ ] 所有业务逻辑在 Service
- [ ] 通过 Repository 访问数据
- [ ] 不直接操作 ORM Model
- [ ] 事务管理正确

### View 层验证

- [ ] 只处理 HTTP 请求/响应
- [ ] 调用 Service，不直接调用 Repository
- [ ] 不包含业务逻辑
- [ ] 异常处理统一

### Model 层验证

- [ ] 只定义字段和简单属性
- [ ] 不包含业务方法（`publish()`, `delete()` 等）
- [ ] 保留 Django 验证钩子（`clean()`）
- [ ] 保留计算属性（`@property`）

---

## 🚨 风险控制

### 风险1：破坏现有功能

**应对措施**：
- 每个模块独立重构
- 每个模块重构后立即测试
- 保留旧代码直到新代码验证通过
- 使用 Git 分支管理

### 风险2：性能退化

**应对措施**：
- Repository 使用 `select_related` 和 `prefetch_related`
- 避免 N+1 查询
- 性能测试验证

### 风险3：团队学习曲线

**应对措施**：
- 提供代码示例
- 代码审查时指导
- 文档完善

---

## 📊 进度跟踪

### 每日检查点

- [ ] 代码提交
- [ ] 测试通过
- [ ] 代码审查
- [ ] 文档更新

### 每周检查点

- [ ] 模块重构完成
- [ ] 测试覆盖率
- [ ] 代码质量指标
- [ ] 团队反馈

---

## 🎯 成功标准

### 技术指标

- ✅ 所有模块都有 Repository 层
- ✅ 所有模块都有 Service 层
- ✅ View 层无业务逻辑
- ✅ Model 层无业务逻辑
- ✅ 测试覆盖率 > 80%

### 质量指标

- ✅ 代码审查通过
- ✅ 无性能退化
- ✅ 无功能破坏
- ✅ 文档完善

---

## 📝 总结

本实施方案采用渐进式重构策略：

1. **Week 1**：基础设施 + Knowledge 模块（试点）
2. **Week 2**：Users + Tasks 模块
3. **Week 3**：Submissions + 其他模块
4. **Week 4**：测试验证 + 文档完善
5. **Week 5-6**：Domain 层引入（可选）

**关键原则**：
- ✅ 渐进式重构，风险可控
- ✅ 每个模块独立验证
- ✅ 可随时回滚
- ✅ 文档同步更新
