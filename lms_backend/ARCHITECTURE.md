# LMS 后端清洁架构设计

## 📋 目录

1. [架构概述](#架构概述)
2. [分层架构](#分层架构)
3. [目录结构](#目录结构)
4. [领域划分](#领域划分)
5. [依赖规则](#依赖规则)
6. [实现指南](#实现指南)
7. [迁移策略](#迁移策略)

---

## 架构概述

### 设计原则

1. **单一职责原则（SRP）**：每个模块、类、方法只做一件事
2. **依赖倒置原则（DIP）**：高层模块不依赖低层模块，都依赖抽象
3. **开闭原则（OCP）**：对扩展开放，对修改关闭
4. **接口隔离原则（ISP）**：使用多个专门的接口，而不是单一的总接口
5. **领域驱动设计（DDD）**：按业务领域划分模块，而非技术层次

### 核心约束

- ✅ **无向后兼容性要求**：可以自由破坏旧格式
- ✅ **严格分层**：禁止跨层调用
- ✅ **业务逻辑隔离**：业务逻辑只在 Service 层
- ✅ **数据访问隔离**：数据库操作只在 Repository 层

---

## 分层架构

### 架构层次图

```
┌─────────────────────────────────────────────────┐
│           Presentation Layer (视图层)            │
│  - Views (APIView / ViewSet)                    │
│  - Serializers (Input/Output)                   │
│  - Permissions                                  │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│         Application Layer (应用层)              │
│  - Services (业务逻辑编排)                      │
│  - DTOs (数据传输对象)                          │
│  - Validators (复杂验证)                        │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│          Domain Layer (领域层)                  │
│  - Domain Models (领域模型)                      │
│  - Domain Services (领域服务)                    │
│  - Value Objects (值对象)                       │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│      Infrastructure Layer (基础设施层)          │
│  - Repositories (数据访问)                       │
│  - Database Models (Django ORM)                │
│  - External Services (外部服务)                  │
└─────────────────────────────────────────────────┘
```

### 各层职责

#### 1. Presentation Layer（视图层）

**职责**：
- 处理 HTTP 请求/响应
- 参数验证（基础验证）
- 权限检查
- 调用 Application Layer

**禁止**：
- ❌ 直接操作数据库
- ❌ 包含业务逻辑
- ❌ 直接调用 Repository

**文件位置**：
- `apps/{domain}/views/` - 视图类
- `apps/{domain}/serializers.py` - 序列化器
- `apps/{domain}/permissions.py` - 权限类
- `apps/{domain}/urls.py` - 路由配置

#### 2. Application Layer（应用层）

**职责**：
- 编排业务逻辑
- 协调多个 Domain Service
- 事务管理
- 复杂验证

**禁止**：
- ❌ 直接操作数据库（通过 Repository）
- ❌ 包含领域规则（应在 Domain Layer）

**文件位置**：
- `apps/{domain}/services.py` - 应用服务
- `apps/{domain}/validators.py` - 复杂验证器
- `apps/{domain}/dto.py` - 数据传输对象（可选）

#### 3. Domain Layer（领域层）

**职责**：
- 领域模型（纯业务对象）
- 领域服务（跨实体的业务规则）
- 值对象（不可变对象）

**禁止**：
- ❌ 依赖基础设施（数据库、外部服务）
- ❌ 包含技术细节

**文件位置**：
- `apps/{domain}/domain/` - 领域模型和服务
- `apps/{domain}/domain/models.py` - 领域模型
- `apps/{domain}/domain/services.py` - 领域服务
- `apps/{domain}/domain/value_objects.py` - 值对象

#### 4. Infrastructure Layer（基础设施层）

**职责**：
- 数据持久化
- 外部服务集成
- 技术实现细节

**文件位置**：
- `apps/{domain}/repositories.py` - 仓储实现
- `apps/{domain}/models.py` - Django ORM 模型
- `apps/{domain}/external/` - 外部服务集成（可选）

---

## 目录结构

### 标准应用结构

```
apps/{domain}/
├── __init__.py
├── apps.py
│
├── models.py                    # Django ORM 模型（基础设施层）
├── repositories.py              # 数据访问层（基础设施层）
│
├── domain/                      # 领域层
│   ├── __init__.py
│   ├── models.py                # 领域模型（纯业务对象）
│   ├── services.py              # 领域服务
│   ├── value_objects.py        # 值对象
│   └── exceptions.py            # 领域异常
│
├── services.py                  # 应用服务层（业务编排）
├── validators.py                # 复杂验证器（可选）
│
├── serializers.py               # 序列化器（视图层）
├── permissions.py               # 权限类（视图层）
│
├── views/                       # 视图（视图层）
│   ├── __init__.py
│   ├── {entity}_views.py        # 按实体分组
│   └── {feature}_views.py       # 按功能分组
│
├── urls.py                      # 路由配置
│
├── migrations/                  # 数据库迁移
│   └── __init__.py
│
└── tests/                       # 测试
    ├── __init__.py
    ├── test_services.py         # 服务层测试（核心）
    ├── test_views.py            # 视图层测试
    ├── test_repositories.py     # 仓储层测试
    └── factories.py             # 测试数据工厂
```

### 核心基础设施

```
core/
├── __init__.py
│
├── base_models.py                # 基础模型类（TimestampMixin 等）
├── base_repository.py            # 基础仓储类
├── base_service.py               # 基础服务类（可选）
│
├── exceptions.py                 # 统一异常定义
├── permissions.py                # 通用权限类
├── pagination.py                 # 分页配置
├── mixins.py                     # 通用 Mixin
├── utils.py                      # 工具函数
│
└── responses.py                  # 统一响应格式（可选）
```

---

## 领域划分

### 核心领域（Core Domains）

#### 1. User Domain（用户领域）

**职责**：
- 用户身份管理
- 角色与权限
- 组织架构
- 师徒关系

**关键实体**：
- `User` - 用户
- `Role` - 角色
- `Department` - 部门
- `UserRole` - 用户角色关联

**边界上下文**：
- 独立的认证上下文
- 权限计算上下文

#### 2. Knowledge Domain（知识领域）

**职责**：
- 知识文档管理
- 版本控制
- 标签系统
- 内容管理

**关键实体**：
- `Knowledge` - 知识文档
- `Tag` - 标签
- `ResourceLineType` - 资源条线类型

**版本化策略**：
- `resource_uuid` + `version_number`
- 已发布版本不可修改
- 编辑时创建新版本

#### 3. Assessment Domain（评估领域）

**职责**：
- 题目管理
- 试卷管理
- 答题与评分
- 成绩计算

**关键实体**：
- `Question` - 题目
- `Quiz` - 试卷
- `Submission` - 提交记录
- `Answer` - 答案

**子领域**：
- Question Bank（题库）
- Quiz Management（试卷管理）
- Grading（评分）

#### 4. Task Domain（任务领域）

**职责**：
- 任务创建与分配
- 任务执行跟踪
- 完成状态管理
- 进度计算

**关键实体**：
- `Task` - 任务
- `TaskAssignment` - 任务分配
- `TaskKnowledge` - 任务知识关联
- `TaskQuiz` - 任务试卷关联
- `KnowledgeLearningProgress` - 学习进度

**核心规则**：
- 资源与任务分离
- 任务绑定资源快照（版本）
- 任务发布后不可修改

#### 5. Analytics Domain（分析领域）

**职责**：
- 数据统计
- 报表生成
- 数据分析

**关键实体**：
- 聚合查询（无持久化实体）

### 支撑领域（Supporting Domains）

#### 6. Notification Domain（通知领域）

**职责**：
- 消息通知
- 通知推送

#### 7. Spot Check Domain（抽查领域）

**职责**：
- 抽查记录
- 抽查评分

---

## 依赖规则

### 依赖方向

```
Views → Services → Domain Services → Repositories → Models
  ↓         ↓            ↓                ↓
Serializers Validators  Value Objects   QuerySets
```

### 严格规则

1. **Views 层**：
   - ✅ 只能调用 Services
   - ✅ 只能使用 Serializers
   - ❌ 禁止直接调用 Repositories
   - ❌ 禁止直接操作 Models
   - ❌ 禁止包含业务逻辑

2. **Services 层**：
   - ✅ 可以调用 Repositories
   - ✅ 可以调用其他 Services
   - ✅ 可以调用 Domain Services
   - ❌ 禁止直接操作 Models（通过 Repository）
   - ❌ 禁止包含数据访问逻辑

3. **Domain 层**：
   - ✅ 纯业务逻辑
   - ✅ 可以依赖其他 Domain 实体
   - ❌ 禁止依赖基础设施（数据库、外部服务）
   - ❌ 禁止依赖 Django ORM

4. **Repositories 层**：
   - ✅ 只能操作 Models（Django ORM）
   - ✅ 提供领域友好的查询接口
   - ❌ 禁止包含业务逻辑
   - ❌ 禁止返回 Django QuerySet（应返回领域对象或列表）

### 跨领域调用

**规则**：
- 通过 Application Service 协调
- 避免直接跨领域调用 Repository
- 使用领域事件（Domain Events）解耦（可选）

**示例**：
```python
# ✅ 正确：通过 Service 协调
class TaskService:
    def create_task(self, ...):
        # 调用 Knowledge Service
        knowledge_service = KnowledgeService()
        knowledge = knowledge_service.get_published_knowledge(knowledge_id)
        
        # 调用 User Service
        user_service = UserService()
        user_service.validate_students_in_scope(assignee_ids, self.user)
        
        # 创建任务
        return self.repository.create(...)

# ❌ 错误：直接跨领域调用 Repository
class TaskService:
    def create_task(self, ...):
        # 禁止直接调用其他领域的 Repository
        knowledge = KnowledgeRepository.get_by_id(knowledge_id)  # ❌
```

---

## 实现指南

### 1. Repository 层实现

#### 基础 Repository 接口

```python
# core/base_repository.py
from abc import ABC, abstractmethod
from typing import Generic, TypeVar, Optional, List
from django.db.models import QuerySet

T = TypeVar('T')

class BaseRepository(ABC, Generic[T]):
    """基础仓储接口"""
    
    @abstractmethod
    def get_by_id(self, pk: int) -> Optional[T]:
        """根据 ID 获取实体"""
        pass
    
    @abstractmethod
    def get_all(self, filters: dict = None) -> List[T]:
        """获取所有实体（支持过滤）"""
        pass
    
    @abstractmethod
    def create(self, data: dict) -> T:
        """创建实体"""
        pass
    
    @abstractmethod
    def update(self, instance: T, data: dict) -> T:
        """更新实体"""
        pass
    
    @abstractmethod
    def delete(self, instance: T) -> None:
        """删除实体"""
        pass
```

#### 具体 Repository 实现

```python
# apps/knowledge/repositories.py
from typing import Optional, List
from django.db.models import QuerySet

from core.base_repository import BaseRepository
from .models import Knowledge as KnowledgeModel
from .domain.models import Knowledge as KnowledgeDomain


class KnowledgeRepository(BaseRepository[KnowledgeDomain]):
    """知识文档仓储实现"""
    
    @staticmethod
    def get_by_id(pk: int, include_deleted: bool = False) -> Optional[KnowledgeDomain]:
        """根据 ID 获取知识文档"""
        queryset = KnowledgeModel.objects.select_related('created_by', 'updated_by')
        if not include_deleted:
            queryset = queryset.filter(is_deleted=False)
        
        model = queryset.filter(pk=pk).first()
        if not model:
            return None
        
        return KnowledgeRepository._to_domain(model)
    
    @staticmethod
    def get_published_list(
        filters: dict = None,
        limit: int = None,
        offset: int = None
    ) -> List[KnowledgeDomain]:
        """获取已发布的知识文档列表"""
        queryset = KnowledgeModel.objects.filter(
            status='PUBLISHED',
            is_deleted=False
        ).select_related('created_by')
        
        if filters:
            if filters.get('knowledge_type'):
                queryset = queryset.filter(knowledge_type=filters['knowledge_type'])
            if filters.get('line_type_id'):
                queryset = queryset.filter(
                    resource_line_types__line_type_id=filters['line_type_id']
                )
        
        queryset = queryset.order_by('-created_at')
        
        if limit:
            queryset = queryset[offset:offset+limit] if offset else queryset[:limit]
        
        return [KnowledgeRepository._to_domain(m) for m in queryset]
    
    @staticmethod
    def create(data: dict) -> KnowledgeDomain:
        """创建知识文档"""
        model = KnowledgeModel.objects.create(**data)
        return KnowledgeRepository._to_domain(model)
    
    @staticmethod
    def update(instance: KnowledgeDomain, data: dict) -> KnowledgeDomain:
        """更新知识文档"""
        model = KnowledgeModel.objects.get(pk=instance.id)
        for key, value in data.items():
            setattr(model, key, value)
        model.save()
        return KnowledgeRepository._to_domain(model)
    
    @staticmethod
    def delete(instance: KnowledgeDomain) -> None:
        """软删除知识文档"""
        model = KnowledgeModel.objects.get(pk=instance.id)
        model.soft_delete()
    
    @staticmethod
    def _to_domain(model: KnowledgeModel) -> KnowledgeDomain:
        """将 ORM 模型转换为领域模型"""
        return KnowledgeDomain(
            id=model.id,
            title=model.title,
            knowledge_type=model.knowledge_type,
            status=model.status,
            resource_uuid=model.resource_uuid,
            version_number=model.version_number,
            # ... 其他字段
        )
    
    @staticmethod
    def _from_domain(domain: KnowledgeDomain) -> dict:
        """将领域模型转换为 ORM 数据字典"""
        return {
            'title': domain.title,
            'knowledge_type': domain.knowledge_type,
            'status': domain.status,
            # ... 其他字段
        }
```

### 2. Domain 层实现

#### 领域模型

```python
# apps/knowledge/domain/models.py
from dataclasses import dataclass
from typing import Optional
from uuid import UUID
from datetime import datetime


@dataclass
class Knowledge:
    """知识文档领域模型（纯业务对象）"""
    
    id: int
    title: str
    knowledge_type: str  # 'EMERGENCY' | 'OTHER'
    status: str  # 'DRAFT' | 'PUBLISHED'
    resource_uuid: UUID
    version_number: int
    
    # 内容字段
    content: str = ''
    fault_scenario: str = ''
    trigger_process: str = ''
    solution: str = ''
    verification_plan: str = ''
    recovery_plan: str = ''
    
    # 元数据
    created_by_id: int
    updated_by_id: Optional[int] = None
    created_at: datetime = None
    updated_at: datetime = None
    published_at: Optional[datetime] = None
    
    def is_published(self) -> bool:
        """检查是否已发布"""
        return self.status == 'PUBLISHED'
    
    def can_be_edited(self) -> bool:
        """检查是否可编辑"""
        return self.status == 'DRAFT'
    
    def validate_emergency_fields(self) -> None:
        """验证应急类知识字段"""
        if self.knowledge_type == 'EMERGENCY':
            structured_fields = [
                self.fault_scenario,
                self.trigger_process,
                self.solution,
                self.verification_plan,
                self.recovery_plan,
            ]
            if not any(field.strip() for field in structured_fields):
                raise ValueError('应急类知识必须至少填写一个结构化字段')
```

#### 领域服务

```python
# apps/knowledge/domain/services.py
from typing import Optional
from uuid import UUID

from .models import Knowledge
from .exceptions import KnowledgeDomainError


class KnowledgeVersionService:
    """知识版本管理领域服务"""
    
    @staticmethod
    def next_version_number(resource_uuid: UUID, current_version: int) -> int:
        """计算下一个版本号"""
        return current_version + 1
    
    @staticmethod
    def create_new_version(
        source: Knowledge,
        new_data: dict
    ) -> Knowledge:
        """基于已发布版本创建新版本"""
        if not source.is_published():
            raise KnowledgeDomainError('只能基于已发布版本创建新版本')
        
        return Knowledge(
            id=None,  # 新实体
            title=new_data.get('title', source.title),
            knowledge_type=source.knowledge_type,
            status='DRAFT',
            resource_uuid=source.resource_uuid,
            version_number=KnowledgeVersionService.next_version_number(
                source.resource_uuid,
                source.version_number
            ),
            # ... 其他字段
        )
```

### 3. Service 层实现

```python
# apps/knowledge/services.py
from typing import Optional, List
from django.db import transaction

from core.exceptions import BusinessError, ErrorCodes
from .repositories import KnowledgeRepository
from .domain.models import Knowledge
from .domain.services import KnowledgeVersionService
from .domain.exceptions import KnowledgeDomainError


class KnowledgeService:
    """知识文档应用服务"""
    
    def __init__(self):
        self.repository = KnowledgeRepository()
        self.version_service = KnowledgeVersionService()
    
    def get_knowledge_by_id(self, pk: int) -> Knowledge:
        """获取知识文档"""
        knowledge = self.repository.get_by_id(pk)
        if not knowledge:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message=f'知识文档 {pk} 不存在'
            )
        return knowledge
    
    def get_published_knowledge_list(
        self,
        filters: dict = None,
        limit: int = None,
        offset: int = None
    ) -> List[Knowledge]:
        """获取已发布的知识文档列表"""
        return self.repository.get_published_list(
            filters=filters,
            limit=limit,
            offset=offset
        )
    
    @transaction.atomic
    def create_knowledge(self, data: dict, user_id: int) -> Knowledge:
        """创建知识文档"""
        # 1. 业务验证
        if data.get('knowledge_type') == 'EMERGENCY':
            # 验证应急类知识字段
            knowledge = Knowledge(
                id=None,
                title=data['title'],
                knowledge_type='EMERGENCY',
                status='DRAFT',
                resource_uuid=data.get('resource_uuid'),
                version_number=1,
                fault_scenario=data.get('fault_scenario', ''),
                # ... 其他字段
                created_by_id=user_id,
            )
            knowledge.validate_emergency_fields()
        else:
            # 其他类型知识验证
            if not data.get('content', '').strip():
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='其他类型知识必须填写正文内容'
                )
        
        # 2. 准备数据
        data['status'] = 'DRAFT'
        data['created_by_id'] = user_id
        if not data.get('resource_uuid'):
            import uuid
            data['resource_uuid'] = uuid.uuid4()
        data['version_number'] = 1
        
        # 3. 持久化
        return self.repository.create(data)
    
    @transaction.atomic
    def publish_knowledge(self, pk: int, user_id: int) -> Knowledge:
        """发布知识文档"""
        knowledge = self.get_knowledge_by_id(pk)
        
        if knowledge.is_published():
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='知识文档已经是发布状态'
            )
        
        # 更新状态
        updated = self.repository.update(knowledge, {
            'status': 'PUBLISHED',
            'published_at': timezone.now(),
            'updated_by_id': user_id,
        })
        
        # 标记为当前版本
        # ... 更新其他版本的 is_current 标志
        
        return updated
    
    @transaction.atomic
    def edit_published_knowledge(
        self,
        pk: int,
        data: dict,
        user_id: int
    ) -> Knowledge:
        """编辑已发布的知识文档（创建新版本）"""
        source = self.get_knowledge_by_id(pk)
        
        if not source.is_published():
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='只能编辑已发布的知识文档'
            )
        
        # 创建新版本草稿
        new_version = self.version_service.create_new_version(source, data)
        new_version.created_by_id = user_id
        
        # 保存新版本
        return self.repository.create(
            self.repository._from_domain(new_version)
        )
```

### 4. View 层实现

```python
# apps/knowledge/views/knowledge_views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsAdmin
from .serializers import (
    KnowledgeInputSerializer,
    KnowledgeOutputSerializer,
    KnowledgeListSerializer,
)
from ..services import KnowledgeService
from core.exceptions import BusinessError


class KnowledgeCreateView(APIView):
    """创建知识文档"""
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def post(self, request):
        # 1. 反序列化输入
        serializer = KnowledgeInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # 2. 调用 Service
        service = KnowledgeService()
        try:
            knowledge = service.create_knowledge(
                data=serializer.validated_data,
                user_id=request.user.id
            )
        except BusinessError as e:
            return Response(
                {'code': e.code, 'message': e.message},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 3. 序列化输出
        output = KnowledgeOutputSerializer(knowledge)
        return Response(output.data, status=status.HTTP_201_CREATED)


class KnowledgeListView(APIView):
    """获取知识文档列表"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # 1. 获取查询参数
        filters = {
            'knowledge_type': request.query_params.get('knowledge_type'),
            'line_type_id': request.query_params.get('line_type_id'),
        }
        filters = {k: v for k, v in filters.items() if v}
        
        # 2. 调用 Service
        service = KnowledgeService()
        knowledge_list = service.get_published_knowledge_list(filters=filters)
        
        # 3. 序列化输出
        serializer = KnowledgeListSerializer(knowledge_list, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
```

### 5. Serializer 实现

```python
# apps/knowledge/serializers.py
from rest_framework import serializers
from .domain.models import Knowledge


class KnowledgeInputSerializer(serializers.Serializer):
    """知识文档输入序列化器"""
    title = serializers.CharField(max_length=200)
    knowledge_type = serializers.ChoiceField(
        choices=['EMERGENCY', 'OTHER']
    )
    content = serializers.CharField(required=False, allow_blank=True)
    fault_scenario = serializers.CharField(required=False, allow_blank=True)
    # ... 其他字段


class KnowledgeOutputSerializer(serializers.Serializer):
    """知识文档输出序列化器"""
    id = serializers.IntegerField()
    title = serializers.CharField()
    knowledge_type = serializers.CharField()
    status = serializers.CharField()
    resource_uuid = serializers.UUIDField()
    version_number = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    # ... 其他字段


class KnowledgeListSerializer(serializers.Serializer):
    """知识文档列表序列化器（简化版）"""
    id = serializers.IntegerField()
    title = serializers.CharField()
    knowledge_type = serializers.CharField()
    status = serializers.CharField()
    summary = serializers.CharField()
    created_at = serializers.DateTimeField()
```

---

## 迁移策略

### 阶段 1：基础设施准备（1-2 周）

1. **创建基础类**：
   - `core/base_repository.py` - 基础仓储接口
   - `core/base_service.py` - 基础服务类（可选）
   - 完善 `core/exceptions.py`

2. **选择一个简单领域试点**：
   - 建议从 `knowledge` 或 `questions` 开始
   - 完整实现 Repository → Domain → Service → View

3. **建立测试覆盖**：
   - 为试点领域编写完整测试
   - 验证架构可行性

### 阶段 2：核心领域迁移（4-6 周）

按优先级迁移：

1. **Knowledge Domain**（知识领域）
   - 重构 Repository 层
   - 提取 Domain 模型
   - 重构 Service 层
   - 更新 Views

2. **Task Domain**（任务领域）
   - 同上流程

3. **Assessment Domain**（评估领域）
   - Questions
   - Quizzes
   - Submissions

4. **User Domain**（用户领域）
   - 最后迁移（依赖最多）

### 阶段 3：支撑领域迁移（2-3 周）

- Notification Domain
- Spot Check Domain
- Analytics Domain

### 阶段 4：清理与优化（1-2 周）

1. **移除旧代码**：
   - 删除 Model 中的业务逻辑方法
   - 删除 View 中的数据库操作
   - 统一异常处理

2. **文档完善**：
   - API 文档更新
   - 架构文档完善
   - 开发指南

3. **性能优化**：
   - 查询优化
   - 缓存策略
   - N+1 问题解决

---

## 关键决策

### 1. Domain Model vs ORM Model

**决策**：同时保留 Domain Model 和 ORM Model

**理由**：
- Domain Model：纯业务对象，不依赖技术细节
- ORM Model：Django ORM 要求，处理持久化细节
- Repository 负责两者之间的转换

**权衡**：
- ✅ 优点：领域层完全独立，易于测试
- ❌ 缺点：需要维护两套模型，转换代码

### 2. Repository 返回类型

**决策**：Repository 返回 Domain Model，不返回 ORM Model

**理由**：
- Service 层不应该知道 ORM 细节
- 领域模型更符合业务语义

### 3. 事务边界

**决策**：事务在 Service 层管理

**理由**：
- Service 层负责业务编排
- 一个业务用例 = 一个事务
- 使用 `@transaction.atomic` 装饰器

### 4. 验证分层

**决策**：验证分为三层

1. **Serializer 层**：基础格式验证（类型、长度等）
2. **Service 层**：业务规则验证
3. **Domain 层**：领域规则验证（值对象、领域模型方法）

---

## 总结

本架构设计遵循清洁架构原则，通过严格的分层和依赖规则，实现：

1. **可测试性**：每层可独立测试
2. **可维护性**：职责清晰，易于理解
3. **可扩展性**：新功能易于添加
4. **技术独立性**：领域层不依赖技术细节

**下一步**：
1. 评审本架构设计
2. 选择试点领域开始迁移
3. 逐步推广到所有领域
