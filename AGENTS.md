## 全局原则
**No backward compatibility** - Break old formats freely

> **重要说明**：编写代码时，如果发现已有代码存在设计问题或冗余，应该直接重构或重写，而不是为了兼容旧代码而增加冗余。优先考虑代码质量和架构清晰度，而不是向后兼容性。

**数据库字段变更时同步更新模型文件**

> **重要说明**：当修改数据库字段结构时，必须同步更新 Django 模型文件 (`models.py`)，确保模型定义与数据库结构完全一致。更新模型文件时包括：
> - 更新字段定义和类型
> - 更新模型文档字符串中的字段说明
> - 检查 `REQUIRED_FIELDS`、`USERNAME_FIELD` 等配置
> - 同时更新相关的序列化器、视图、服务层和前端代码

**字段依赖清查必做**

> **重要说明**：凡是新增、重命名或删除字段，必须立刻执行一次全局 `rg`/`codebase_search`，逐项更新所有引用（序列化器、服务层、权限、前端类型/组件、文档）。未完成全局清查前不得提交变更，避免残留旧字段名导致接口返回空值。

**数据库操作优先使用 MCP**

> **重要说明**：在本地开发时，数据库操作（如添加/删除列、修改数据、查询等）优先使用 MCP 工具 `mcp_DBHub_execute_sql` 直接执行 SQL，而不是写 Django 迁移脚本。这样更快更直接。Django 迁移文件仍需保留用于团队协作和生产部署，但本地验证和调试时直接用 MCP。

## 前端总体结构
```
src/
├── app/                 # 应用层配置
│   ├── routes/         # 路由配置 (或 pages 文件夹)
│   ├── app.tsx         # 根组件
│   ├── provider.tsx    # 全局 Provider (Context, Redux, etc.)
│   └── router.tsx      # 路由器配置
├── assets/             # 静态资源 (图片、字体、图标等)
├── components/         # 全局共享组件 (跨多个 feature 使用)
├── config/             # 全局配置 (环境变量、常量等)
├── features/           # 功能模块 (核心架构，按业务功能划分)
├── hooks/              # 全局共享 Hooks
├── lib/                # 第三方库的封装配置
├── stores/             # 全局状态管理 (Redux/Zustand/Jotai)
├── testing/            # 测试工具和 Mock 数据
├── types/              # 全局 TypeScript 类型定义
└── utils/              # 全局工具函数
```

## Feature 模块结构
- 每个业务功能独立成一个 feature 文件夹，内部包含该功能的所有代码
- 避免跨 feature 引用，在应用层组合不同的 feature
- 使用 `index.ts` 作为 feature 的公共 API，只导出需要对外暴露的内容

**注意：并非每个 feature 都需要以下所有文件夹，只包含该 feature 必需的部分即可。**

```
src/features/awesome-feature/
├── api/                # 数据获取相关：API 请求函数 + React Query/SWR hooks
├── assets/             # 该 feature 专属的静态资源
├── components/         # 该 feature 内部组件 (不对外暴露)
├── hooks/              # UI 逻辑和工具 hooks (非数据获取)
├── stores/             # 该 feature 的状态管理
├── types/              # 该 feature 的 TypeScript 类型
├── utils/              # 该 feature 的工具函数
└── index.ts            # 公共 API，导出对外接口
```

### api/ vs hooks/ 区别
```typescript
// ✅ api/ - 数据获取相关的 hooks
// src/features/products/api/get-products.ts
export const useGetProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });
};

// ✅ hooks/ - UI 逻辑和工具 hooks
// src/features/products/hooks/use-product-filter.ts
export const useProductFilter = (products) => {
  const [filter, setFilter] = useState('');
  const filtered = useMemo(() => 
    products.filter(p => p.name.includes(filter))
  , [products, filter]);
  return { filtered, setFilter };
};
```

## 测试和 Mock 数据规范
- 所有测试工具配置、Mock 数据、测试辅助函数统一放在 `src/testing/` 目录
- 单元测试文件和被测代码放在同一目录，使用 `.test.tsx` 或 `.spec.tsx` 后缀
- **禁止在组件或 feature 内部创建 `__mocks__` 或 `mocks/` 文件夹**，统一使用 `src/testing/mocks/`

```
src/testing/
├── mocks/              # Mock 数据统一存放处
│   ├── handlers.ts     # MSW API mock handlers
│   ├── db.ts           # Mock 数据库 (如 @mswjs/data)
│   └── data/           # 静态 Mock 数据
│       ├── users.ts    # 用户 Mock 数据
│       └── products.ts # 产品 Mock 数据
├── test-utils.tsx      # 测试工具函数 (自定义 render 等)
└── setup-tests.ts      # 测试环境配置
```

### Mock 数据使用示例
```typescript
// ✅ 正确：从 testing 导入
import { mockUsers } from '@/testing/mocks/data/users';

// ❌ 错误：在组件目录创建 mock
// src/features/users/mocks/users.ts
```

### 测试文件位置示例
```
src/features/product-list/
├── components/
│   ├── product-item.tsx
│   └── product-item.test.tsx    # ✅ 测试文件和组件同级
└── api/
    ├── get-products.ts
    └── get-products.test.ts
```

## 组件命名和组织
- 组件文件使用 `kebab-case.tsx` 或 `PascalCase.tsx`，团队统一即可
- 复杂组件可以创建文件夹，包含组件、样式、测试等
- 共享 UI 组件放在 `src/components/ui/` 下 (如 Button, Modal, Card)
- 业务组件放在对应的 feature 下

```
src/components/
├── ui/                 # 基础 UI 组件库
│   ├── button/
│   │   ├── button.tsx
│   │   ├── button.test.tsx
│   │   └── index.ts
│   ├── modal/
│   └── card/
└── layout/             # 布局组件 (Header, Footer, Sidebar)
    ├── header.tsx
    └── footer.tsx
```

## 关键原则
- 使用路径别名 `@/` 替代相对路径 `../../../`，在 `tsconfig.json` 配置
- 禁止跨 feature 导入，使用 ESLint 规则 `import/no-restricted-paths` 强制约束
- ~~避免使用 barrel files (index.ts 导出所有)~~，直接导入具体文件以优化 tree-shaking
- 测试文件和被测代码放在同一目录下，使用 `.test.tsx` 或 `.spec.tsx` 后缀
- 如果 API 调用在多个 feature 间共享，可以考虑创建独立的 `src/api/` 文件夹

## lib 文件夹说明
- 用于封装第三方库的配置，提供统一接口
- 例如：`src/lib/react-query.ts` 配置 React Query，`src/lib/axios.ts` 配置 Axios 实例

```typescript
// src/lib/axios.ts
import Axios from 'axios';

export const axios = Axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});
```

## 状态管理建议
- 优先使用 React Query / SWR 管理服务端状态
- 使用 Context 管理低频更新的全局状态 (用户信息、主题)
- 中高频状态考虑 Zustand / Jotai 等原子化状态库
- Feature 内部状态尽量使用 `useState` / `useReducer` 本地管理

## 配置文件示例
```typescript
// src/config/index.ts
export const config = {
  apiUrl: import.meta.env.VITE_API_URL,
  appName: 'My App',
  isDev: import.meta.env.DEV,
};
```

## 代码组织最佳实践
- 当文件超过 10 个时才考虑创建子文件夹，避免过早优化
- 组件嵌套不超过 2 层 (`list/` → `list-item/` ✅，再嵌套 ❌)
- 使用 ESLint 和 Prettier 统一代码风格
- 删除功能时直接删除对应的 feature 文件夹即可

---

## 后端总体结构

### 技术栈

- **Web 框架**: Django 4.2+ / Django REST Framework 3.14+
- **数据库**: MySQL 8.0+
- **认证**: JWT (djangorestframework-simplejwt)
- **文件存储**: 用于存储图片、文件附件、用户头像等静态资源
- **API 文档**: drf-spectacular (OpenAPI 3.0)

### 核心设计原则

1. **资源与任务分离**：知识文档、题目、试卷作为资源先行创建，任务作为分配动作后续发布
2. **基于角色的访问控制（RBAC）**：五种角色（学员、导师、室经理、管理员、团队经理）具有不同的数据访问范围
3. **数据范围隔离**：导师仅访问名下学员数据，室经理访问本室数据，管理员访问全平台数据
4. **软删除策略**：关键业务数据支持软删除，保留历史记录

### Django 应用结构

```
lms_backend/
├── config/                    # 项目配置
│   ├── settings/
│   │   ├── base.py           # 基础配置
│   │   ├── development.py    # 开发环境
│   │   └── production.py     # 生产环境
│   ├── urls.py               # 根路由
│   └── wsgi.py
│
├── apps/                      # 业务应用
│   ├── users/                # 用户与权限
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── permissions.py
│   │   └── services.py
│   │
│   ├── knowledge/            # 知识库
│   ├── questions/            # 题库
│   ├── quizzes/              # 试卷
│   ├── tasks/                # 任务
│   ├── submissions/          # 答题与评分
│   ├── spot_checks/          # 抽查
│   ├── notifications/        # 通知
│   └── analytics/            # 统计分析
│
├── core/                      # 核心模块
│   ├── permissions.py        # 通用权限类
│   ├── pagination.py         # 分页配置
│   ├── exceptions.py         # 异常处理
│   ├── mixins.py             # 通用 Mixin
│   └── utils.py              # 工具函数
│
└── tests/                     # 测试
    ├── conftest.py
    ├── factories.py
    ├── unit/                  # 单元测试
    └── properties/            # 属性测试
```

### 应用模块组织规范

每个业务应用（app）应包含以下文件：

- `models.py` - 数据模型定义
- `serializers.py` - 序列化器（DRF）
- `views.py` - 视图（API 端点）
- `urls.py` - URL 路由配置
- `permissions.py` - 权限类（如需要）
- `services.py` - 业务逻辑服务层（如需要）

## API 设计规范

### URL 命名规范

- 使用复数形式：`/api/knowledge/` 而不是 `/api/knowledges/`
- 使用连字符分隔：`/api/spot-checks/` 而不是 `/api/spot_checks/`
- 嵌套资源使用路径参数：`/api/knowledge/{id}/` 而不是查询参数

### HTTP 方法使用

| 方法 | 用途 | 示例 |
|------|------|------|
| GET | 获取资源（列表或详情） | `GET /api/knowledge/` |
| POST | 创建资源 | `POST /api/knowledge/` |
| PATCH | 部分更新资源 | `PATCH /api/knowledge/{id}/` |
| PUT | 完整更新资源（较少使用） | `PUT /api/knowledge/{id}/` |
| DELETE | 删除资源 | `DELETE /api/knowledge/{id}/` |

### 错误处理规范

#### HTTP 状态码

| 状态码 | 场景 |
|--------|------|
| 200 | 请求成功 |
| 201 | 资源创建成功 |
| 400 | 请求参数错误、业务规则违反（如删除被引用资源） |
| 401 | 未认证或认证失败 |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

#### 错误响应格式

```json
{
  "code": "ERROR_CODE",
  "message": "人类可读的错误信息",
  "details": {
    "field_name": ["具体错误说明"]
  }
}
```

#### 业务错误码

| 错误码 | 描述 |
|--------|------|
| AUTH_INVALID_CREDENTIALS | 用户名或密码错误 |
| AUTH_USER_INACTIVE | 用户已被停用 |
| AUTH_INVALID_ROLE | 无效的角色切换 |
| USER_HAS_DATA | 用户已有关联数据，无法删除 |
| RESOURCE_REFERENCED | 资源被引用，无法删除 |
| TASK_INVALID_ASSIGNEES | 任务分配的学员超出权限范围 |
| EXAM_NOT_IN_WINDOW | 当前时间不在考试时间窗口内 |
| EXAM_ALREADY_SUBMITTED | 考试已提交，无法重复作答 |
| PERMISSION_DENIED | 无权执行此操作 |

### 序列化器规范

- 使用不同的序列化器区分列表和详情视图
- 创建和更新使用不同的序列化器（如需要）
- 在序列化器中实现业务验证逻辑
- 使用 `read_only` 和 `write_only` 字段明确字段用途

```python
# ✅ 正确：区分列表和详情序列化器
class KnowledgeListSerializer(serializers.ModelSerializer):
    """列表视图序列化器，只包含必要字段"""
    class Meta:
        model = Knowledge
        fields = ['id', 'title', 'line_type', 'created_at']

class KnowledgeDetailSerializer(serializers.ModelSerializer):
    """详情视图序列化器，包含完整字段"""
    class Meta:
        model = Knowledge
        fields = '__all__'
```

### 权限控制规范

- 使用 DRF 的权限类进行权限控制
- 通用权限类放在 `core/permissions.py`
- 应用特定权限类放在对应应用的 `permissions.py`
- 使用 `DataScopeMixin` 实现数据范围隔离

```python
# ✅ 正确：使用权限类
class KnowledgeListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # 检查管理员权限
        if not request.user.is_admin:
            raise BusinessError(code=ErrorCodes.PERMISSION_DENIED, ...)
```

## 数据模型规范

### 模型字段命名

- 使用下划线命名：`created_at` 而不是 `createdAt`
- 外键字段使用 `_id` 后缀：`user_id`（Django 自动处理）
- 布尔字段使用 `is_` 前缀：`is_active`, `is_deleted`
- 时间字段使用 `_at` 后缀：`created_at`, `updated_at`

### 通用 Mixin

使用 `core/mixins.py` 中的通用 Mixin：

- `TimestampMixin` - 提供 `created_at` 和 `updated_at` 字段
- `SoftDeleteMixin` - 提供软删除功能（`is_deleted` 字段）
- `CreatorMixin` - 提供 `created_by` 字段

```python
# ✅ 正确：使用通用 Mixin
class Knowledge(TimestampMixin, SoftDeleteMixin, CreatorMixin, models.Model):
    title = models.CharField(max_length=200)
    # created_at, updated_at, is_deleted, created_by 自动包含
```

### 模型文档字符串

每个模型必须包含详细的文档字符串，说明：
- 模型的用途
- 字段的含义
- 关联关系
- 业务规则

```python
class Knowledge(TimestampMixin, SoftDeleteMixin, CreatorMixin, models.Model):
    """
    知识文档模型
    
    知识类型:
    - EMERGENCY: 应急类知识
    - OTHER: 其他类型知识
    
    条线类型（固定类别）:
    - CLOUD: 双云
    - DATABASE: 数据库
    - NETWORK: 网络
    - APPLICATION: 应用
    - EMERGENCY: 应急
    - REGULATION: 规章制度
    - OTHER: 其他
    
    Requirements:
    - 4.1: 创建知识文档时要求指定知识类型
    - 4.2, 4.3: 统一使用 content 字段存储正文内容
    """
```

### 测试目录结构

```
tests/
├── conftest.py              # 共享 fixtures
├── factories.py             # 测试数据工厂
├── strategies.py            # hypothesis 策略
├── unit/                    # 单元测试
│   ├── test_users.py
│   ├── test_knowledge.py
│   └── ...
└── properties/              # 属性测试
    ├── test_auth_properties.py
    ├── test_user_properties.py
    └── ...
```
## 代码组织最佳实践

- 业务逻辑优先放在 `services.py`，视图层保持简洁
- 使用 DRF 的 `ViewSet` 或 `APIView`，根据复杂度选择
- 复杂查询使用 `select_related` 和 `prefetch_related` 优化
- 使用 Django 的 `F()` 和 `Q()` 进行数据库操作
- 避免在视图中直接操作数据库，使用模型方法或服务层