---
inclusion: always
---

# Django 后端架构规则

## 核心原则

1. **单一职责**：每个模块、类、方法只做一件事
2. **依赖倒置**：高层模块不依赖低层模块，都依赖抽象
3. **开闭原则**：对扩展开放，对修改关闭
4. **DRY**：不要重复自己

## 目录结构规范

```
lms_backend/
├── apps/                    # 业务模块
│   └── {module}/
│       ├── models.py        # 数据模型（纯数据定义）
│       ├── repositories.py  # 数据访问层（所有数据库操作）
│       ├── services.py      # 业务逻辑层（核心业务规则）
│       ├── serializers.py   # 数据转换（仅序列化/反序列化）
│       ├── views.py         # HTTP 接口（仅请求/响应处理）
│       ├── urls.py          # 路由配置
│       └── validators.py    # 验证器（可选，复杂验证逻辑）
├── core/                    # 基础设施
│   ├── base_models.py       # 基础模型类
│   ├── base_repository.py   # 基础仓储类
│   ├── exceptions.py        # 异常定义
│   ├── permissions.py       # 权限类
│   └── responses.py         # 统一响应格式
└── tests/
    └── {module}/
        ├── test_services.py # 服务层测试（核心）
        ├── test_views.py    # 接口测试
        └── factories.py     # 测试数据工厂
```

## 分层架构

### Layer 1: Models（数据模型）

**职责**：定义数据结构，不包含业务逻辑

```python
# ✅ 正确
class Knowledge(BaseModel):
    title = models.CharField(max_length=200)
    content = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    
    class Meta:
        db_table = 'lms_knowledge'

# ❌ 错误：模型中包含业务逻辑
class Knowledge(BaseModel):
    def publish(self):  # 业务逻辑应该在 Service 层
        self.status = 'PUBLISHED'
        self.save()
        self.notify_subscribers()  # 副作用
```

### Layer 2: Repositories（数据访问层）

**职责**：封装所有数据库操作，提供领域友好的查询接口

```python
# apps/{module}/repositories.py
class KnowledgeRepository:
    @staticmethod
    def get_by_id(pk: int) -> Knowledge | None:
        return Knowledge.objects.filter(pk=pk, is_deleted=False).first()
    
    @staticmethod
    def get_published_list(filters: dict) -> QuerySet[Knowledge]:
        qs = Knowledge.objects.filter(status='PUBLISHED', is_deleted=False)
        if filters.get('knowledge_type'):
            qs = qs.filter(knowledge_type=filters['knowledge_type'])
        return qs.order_by('-created_at')
    
    @staticmethod
    def create(data: dict) -> Knowledge:
        return Knowledge.objects.create(**data)
    
    @staticmethod
    def update(instance: Knowledge, data: dict) -> Knowledge:
        for key, value in data.items():
            setattr(instance, key, value)
        instance.save()
        return instance
```

### Layer 3: Services（业务逻辑层）

**职责**：实现业务规则，协调多个 Repository，处理事务

```python
# apps/{module}/services.py
class KnowledgeService:
    def __init__(self):
        self.repo = KnowledgeRepository()
    
    def create_knowledge(self, data: dict, user: User) -> Knowledge:
        """创建知识文档"""
        # 1. 业务验证
        self._validate_knowledge_type(data)
        
        # 2. 准备数据
        data['created_by'] = user
        data['status'] = 'DRAFT'
        
        # 3. 持久化
        return self.repo.create(data)
    
    @transaction.atomic
    def publish_knowledge(self, pk: int, user: User) -> Knowledge:
        """发布知识文档"""
        knowledge = self.repo.get_by_id(pk)
        if not knowledge:
            raise NotFoundError('知识文档不存在')
        
        if knowledge.status == 'PUBLISHED':
            raise BusinessError('已经是发布状态')
        
        return self.repo.update(knowledge, {
            'status': 'PUBLISHED',
            'published_at': timezone.now(),
            'updated_by': user
        })
    
    def _validate_knowledge_type(self, data: dict):
        if data.get('knowledge_type') == 'EMERGENCY':
            if not data.get('fault_scenario'):
                raise ValidationError('应急类知识必须填写故障场景')
```

### Layer 4: Serializers（数据转换层）

**职责**：仅做数据序列化/反序列化，不包含业务逻辑

```python
# apps/{module}/serializers.py

# ✅ 正确：纯数据转换
class KnowledgeInputSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    knowledge_type = serializers.ChoiceField(choices=KNOWLEDGE_TYPE_CHOICES)
    content = serializers.CharField(required=False)
    fault_scenario = serializers.CharField(required=False)

class KnowledgeOutputSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display')
    
    class Meta:
        model = Knowledge
        fields = ['id', 'title', 'status', 'status_display', 'created_at']

# ❌ 错误：Serializer 中包含业务逻辑
class KnowledgeSerializer(serializers.ModelSerializer):
    def create(self, validated_data):
        # 业务逻辑不应该在这里
        if validated_data['knowledge_type'] == 'EMERGENCY':
            validated_data['priority'] = 'HIGH'
        return super().create(validated_data)
```

### Layer 5: Views（接口层）

**职责**：处理 HTTP 请求/响应，调用 Service，不包含业务逻辑

```python
# apps/{module}/views.py
class KnowledgeCreateView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def post(self, request):
        # 1. 反序列化输入
        serializer = KnowledgeInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # 2. 调用 Service
        service = KnowledgeService()
        knowledge = service.create_knowledge(
            data=serializer.validated_data,
            user=request.user
        )
        
        # 3. 序列化输出
        output = KnowledgeOutputSerializer(knowledge)
        return Response(output.data, status=201)
```

## 依赖方向

```
Views → Services → Repositories → Models
  ↓         ↓            ↓
Serializers  Validators   QuerySets
```

**规则**：
- Views 只能调用 Services
- Services 只能调用 Repositories 和其他 Services
- Repositories 只能操作 Models
- 禁止反向依赖

## 异常处理

```python
# core/exceptions.py
class BaseError(Exception):
    code: str
    message: str
    status_code: int = 400

class NotFoundError(BaseError):
    code = 'NOT_FOUND'
    status_code = 404

class BusinessError(BaseError):
    code = 'BUSINESS_ERROR'

class PermissionError(BaseError):
    code = 'PERMISSION_DENIED'
    status_code = 403

# 使用
class KnowledgeService:
    def get_knowledge(self, pk: int) -> Knowledge:
        knowledge = self.repo.get_by_id(pk)
        if not knowledge:
            raise NotFoundError(f'知识文档 {pk} 不存在')
        return knowledge
```

## 命名规范

| 类型 | 格式 | 示例 |
|------|------|------|
| Model | 单数名词 | `Knowledge`, `Task` |
| Repository | `{Model}Repository` | `KnowledgeRepository` |
| Service | `{Domain}Service` | `KnowledgeService` |
| InputSerializer | `{Model}InputSerializer` | `KnowledgeInputSerializer` |
| OutputSerializer | `{Model}OutputSerializer` | `KnowledgeOutputSerializer` |
| View | `{Model}{Action}View` | `KnowledgeCreateView` |

## 禁止事项

1. **禁止在 Model 中写业务逻辑** - 使用 Service
2. **禁止在 Serializer 中写业务逻辑** - 使用 Service
3. **禁止在 View 中直接操作数据库** - 使用 Repository
4. **禁止在 View 中写业务逻辑** - 使用 Service
5. **禁止跨层调用** - View 不能直接调用 Repository
6. **禁止循环依赖** - 模块间单向依赖

## 测试策略

```python
# 核心：测试 Service 层
class TestKnowledgeService:
    def test_create_emergency_knowledge_requires_fault_scenario(self):
        service = KnowledgeService()
        with pytest.raises(ValidationError):
            service.create_knowledge({
                'title': 'Test',
                'knowledge_type': 'EMERGENCY',
                # 缺少 fault_scenario
            }, user=mock_user)
    
    def test_publish_changes_status(self):
        service = KnowledgeService()
        knowledge = service.publish_knowledge(pk=1, user=mock_user)
        assert knowledge.status == 'PUBLISHED'
```

## 迁移现有代码

对于现有不符合规范的代码，按以下优先级逐步重构：

1. **新功能**：严格遵循新架构
2. **Bug 修复**：顺便重构相关代码
3. **专项重构**：按模块逐个迁移
