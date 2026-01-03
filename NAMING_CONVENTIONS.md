# 命名规范文档

本文档定义了LMS项目中的命名规范，作为开发指南使用。

## 目录

1. [后端命名规范](#后端命名规范)
2. [前端命名规范](#前端命名规范)
3. [URL和路由命名规范](#url和路由命名规范)
4. [文件组织规范](#文件组织规范)
5. [代码注释规范](#代码注释规范)

---

## 后端命名规范

### Python文件命名

- **模块文件**：使用 `snake_case`
  - 示例：`views.py`, `serializers.py`, `services.py`, `repositories.py`
- **包目录**：使用 `snake_case`
  - 示例：`apps/`, `views/`, `urls/`

### 类命名

- **模型类**：使用 `PascalCase`，单数形式
  - 示例：`User`, `Knowledge`, `Task`, `Submission`
- **视图类**：使用 `PascalCase`，以 `View` 结尾
  - 示例：`UserListView`, `KnowledgeDetailView`, `TaskCreateView`
- **序列化器类**：使用 `PascalCase`，以 `Serializer` 结尾
  - 示例：`UserSerializer`, `KnowledgeListSerializer`
- **服务类**：使用 `PascalCase`，以 `Service` 结尾
  - 示例：`UserService`, `KnowledgeService`
- **仓储类**：使用 `PascalCase`，以 `Repository` 结尾
  - 示例：`UserRepository`, `KnowledgeRepository`
- **异常类**：使用 `PascalCase`，以 `Error` 结尾
  - 示例：`BusinessError`, `ValidationError`

### 函数和变量命名

- **函数名**：使用 `snake_case`
  - 示例：`get_user_by_id()`, `create_knowledge()`, `validate_input()`
- **变量名**：使用 `snake_case`
  - 示例：`user_id`, `knowledge_list`, `is_active`
- **常量**：使用 `UPPER_SNAKE_CASE`
  - 示例：`MAX_RETRY_COUNT`, `DEFAULT_PAGE_SIZE`

### URL路径命名

- **统一使用 kebab-case**（小写字母 + 连字符）
- 示例：
  - `/api/knowledge/`
  - `/api/spot-checks/`
  - `/api/user-management/`
  - `/api/tasks/create/`

### URL名称（name）命名

- **统一使用 kebab-case**
- 格式：`{module}-{action}` 或 `{module}-{resource}-{action}`
- 示例：
  - `auth-login`
  - `user-list-create`
  - `knowledge-detail`
  - `submission-result`
  - `grading-detail`

### URL路径结构规范

- 资源列表：`/api/{resource}/`
- 资源详情：`/api/{resource}/{id}/`
- 资源操作：`/api/{resource}/{id}/{action}/`
- 子资源：`/api/{resource}/{id}/{sub-resource}/`
- 特殊操作：`/api/{resource}/{action}/`（如 `/api/tasks/create/`）

示例：
```
/api/knowledge/              # 列表
/api/knowledge/{id}/         # 详情
/api/knowledge/{id}/publish/  # 操作
/api/knowledge/tags/         # 子资源列表
/api/tasks/create/           # 特殊操作（创建）
```

---

## 前端命名规范

### 文件命名

- **组件文件**：使用 `kebab-case.tsx` 或 `kebab-case.ts`
  - 示例：`student-dashboard.tsx`, `knowledge-form.tsx`, `api-client.ts`
- **功能目录**：使用 `kebab-case`
  - 示例：`features/knowledge/`, `features/tasks/`

### 组件命名

- **React组件**：使用 `PascalCase`
  - 示例：`StudentDashboard`, `KnowledgeForm`, `TaskList`
- **函数组件**：使用 `PascalCase`
  - 示例：`const UserList: React.FC = () => { ... }`

### 函数和变量命名

- **函数名**：使用 `camelCase`
  - 示例：`getUserById()`, `createKnowledge()`, `handleSubmit()`
- **变量名**：使用 `camelCase`
  - 示例：`userId`, `knowledgeList`, `isActive`
- **常量**：使用 `UPPER_SNAKE_CASE`
  - 示例：`ROUTES`, `API_BASE_URL`, `MAX_RETRY_COUNT`
- **私有变量/函数**：使用 `_camelCase`（可选）
  - 示例：`_internalState`, `_validateInput()`

### 路由路径命名

- **统一使用 kebab-case**
- 所有路径都使用 `ROUTES` 常量定义
- 示例：
  ```typescript
  export const ROUTES = {
    LOGIN: '/login',
    DASHBOARD: '/dashboard',
    KNOWLEDGE: '/knowledge',
    ADMIN_KNOWLEDGE: '/admin/knowledge',
    TASKS: '/tasks',
    GRADING: '/grading',
    SPOT_CHECKS: '/spot-checks',
  } as const;
  ```

### TypeScript类型命名

- **接口**：使用 `PascalCase`，以 `I` 开头（可选）或直接使用描述性名称
  - 示例：`User`, `KnowledgeDetail`, `TaskCreateRequest`
- **类型别名**：使用 `PascalCase`
  - 示例：`UserRole`, `KnowledgeStatus`
- **枚举**：使用 `PascalCase`
  - 示例：`UserRole`, `KnowledgeStatus`

---

## URL和路由命名规范

### 后端URL规范

详见 [URL_ORGANIZATION_GUIDE.md](./lms_backend/URL_ORGANIZATION_GUIDE.md)

**关键原则**：
- URL路径使用 kebab-case
- URL名称（name）使用 kebab-case
- 遵循RESTful设计原则

### 前端路由规范

详见 [ROUTES_API_MAPPING.md](./ROUTES_API_MAPPING.md)

**关键原则**：
- 所有路由路径使用 `ROUTES` 常量
- 路由路径使用 kebab-case
- 保持前后端路由命名一致性

---

## 文件组织规范

### 后端文件组织

#### Views文件组织

详见 [VIEWS_ORGANIZATION_GUIDE.md](./lms_backend/VIEWS_ORGANIZATION_GUIDE.md)

**原则**：
- 视图数量 < 5个：使用单文件 `views.py`
- 视图数量 >= 5个：按角色或资源拆分到 `views/` 目录
- 拆分标准：优先按角色拆分（admin/student/common）

#### URL文件组织

详见 [URL_ORGANIZATION_GUIDE.md](./lms_backend/URL_ORGANIZATION_GUIDE.md)

**原则**：
- 路由数量 < 10个：使用单文件 `urls.py`
- 路由数量 >= 10个或有明显功能模块：使用 `urls/` 目录拆分

### 前端文件组织

#### 路由文件组织

**结构**：
```
src/
  app/
    router.tsx          # 主路由配置
    routes/
      index.ts          # 导出所有路由配置
      auth.tsx          # 认证相关路由
      knowledge.tsx     # 知识相关路由
      tasks.tsx         # 任务相关路由
      ...
```

**原则**：
- 按功能模块拆分路由文件
- 使用 `routes/index.ts` 统一导出
- 主路由文件简洁，只负责组装

#### 功能模块组织

**结构**：
```
src/
  features/
    {feature}/
      components/       # 组件
      api/              # API调用
      hooks/            # 自定义Hooks
      types/            # 类型定义
      utils/            # 工具函数
```

---

## 代码注释规范

### Python注释

- **使用JSDoc风格注释**（根据项目要求）
- **模块文档字符串**：使用三引号 `"""..."""`
- **函数文档字符串**：说明参数、返回值、异常

示例：
```python
"""
用户服务模块

提供用户相关的业务逻辑处理。
"""
class UserService:
    """
    根据ID获取用户
    
    Args:
        user_id: 用户ID
        
    Returns:
        User对象
        
    Raises:
        BusinessError: 当用户不存在时
    """
    def get_user_by_id(self, user_id: int) -> User:
        ...
```

### TypeScript注释

- **使用JSDoc注释**
- **组件注释**：说明组件用途、Props、示例

示例：
```typescript
/**
 * 学员知识库中心组件
 * 
 * @component
 * @example
 * ```tsx
 * <StudentKnowledgeCenter />
 * ```
 */
export const StudentKnowledgeCenter: React.FC = () => {
  ...
};
```

---

## 命名检查清单

### 开发新功能时

- [ ] 文件命名使用正确的命名规范
- [ ] 类名使用 PascalCase
- [ ] 函数和变量使用 snake_case（Python）或 camelCase（TypeScript）
- [ ] URL路径使用 kebab-case
- [ ] URL名称使用 kebab-case
- [ ] 路由路径使用 ROUTES 常量（前端）
- [ ] 添加适当的注释和文档字符串

### 代码审查时

- [ ] 检查命名是否符合规范
- [ ] 检查URL路径和名称是否一致
- [ ] 检查文件组织是否合理
- [ ] 检查注释是否完整

---

## 常见问题

### Q: 什么时候使用单文件，什么时候拆分？

**A**: 
- Views：视图数量 < 5个使用单文件，>= 5个拆分
- URLs：路由数量 < 10个使用单文件，>= 10个或有明显功能模块拆分

### Q: URL路径和URL名称有什么区别？

**A**:
- URL路径：实际的URL路径，如 `/api/knowledge/`
- URL名称：Django的 `name` 参数，用于 `reverse()` 和模板中，如 `knowledge-list`

### Q: 前端路由路径必须使用常量吗？

**A**: 是的，所有路由路径都应该在 `ROUTES` 常量中定义，避免硬编码。

---

## 更新记录

- 2024-01-XX: 初始版本，建立完整的命名规范文档

---

## 参考文档

- [URL文件组织规范](./lms_backend/URL_ORGANIZATION_GUIDE.md)
- [Views文件组织规范](./lms_backend/VIEWS_ORGANIZATION_GUIDE.md)
- [路由-API映射文档](./ROUTES_API_MAPPING.md)
