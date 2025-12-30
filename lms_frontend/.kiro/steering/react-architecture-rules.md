# React 前端架构规则

> 基于 [Bulletproof React](https://github.com/alan2207/bulletproof-react) 最佳实践
> 
> 技术栈：React 19 + TypeScript + Vite + Tailwind CSS v4 + ShadCN UI + TanStack Query

---

## 术语表

- **Feature**: 功能模块，包含特定业务功能的所有相关代码
- **Unidirectional_Architecture**: 单向代码架构，代码流向为 shared → features → app
- **Cross_Feature_Import**: 跨功能模块导入，应当被禁止
- **Barrel_File**: 桶文件 (index.ts)，用于统一导出模块内容（**不推荐使用，会破坏 tree shaking**）
- **Code_Splitting**: 代码分割，按路由懒加载组件

---

## ⛔ 绝对禁止

1. **禁止跨 feature 导入** - features 之间不能互相导入，需要共享的代码放到 `lib/` 或 `hooks/`
2. **禁止使用 barrel files (index.ts 统一导出)** - 会破坏 Vite tree shaking，导致打包体积膨胀
3. **禁止在路由文件直接导入所有组件** - 必须用 `React.lazy()` 懒加载，否则首屏加载巨慢
4. **禁止使用 PascalCase 文件名** - 统一用 kebab-case，避免跨平台大小写问题
5. **禁止用 useState 存储 API 数据** - 必须用 TanStack Query
6. **禁止用 useState 管理表单** - 必须用 React Hook Form + Zod

---

## 1. 项目结构规范

```
src/
├── app/               # 应用层：路由、入口、全局 Provider
│   ├── provider.tsx   # 全局 Provider
│   ├── router.tsx     # 路由配置
│   └── routes/        # 路由页面组件（必须懒加载！）
│       ├── app/       # 应用内路由（需要认证）
│       └── auth/      # 认证相关路由
├── assets/            # 静态资源
├── components/        # 全局共享组件
│   ├── errors/        # 错误处理组件
│   ├── layout/        # 布局组件
│   └── ui/            # ShadCN UI 组件（不要加 index.ts！）
├── config/            # 全局配置
├── features/          # 功能模块（不要加 index.ts！）
├── hooks/             # 全局共享 hooks
├── lib/               # 预配置的库（api-client, auth, authorization）
├── types/             # 共享类型定义
└── utils/             # 工具函数
```

### Feature 模块结构

```
src/features/awesome-feature/
├── api/           # API 请求和 hooks
├── components/    # 功能专属组件
├── hooks/         # 功能专属 hooks
└── types/         # 功能专属类型
```

**⚠️ 重要注意事项:**
- **不需要创建所有子目录！** 只创建实际需要的文件夹。比如一个简单的 feature 可能只需要 `components/`
- **不要创建 index.ts barrel file**，直接导入具体文件

---

## 2. 单向代码架构

代码流向：`shared → features → app`

```typescript
// ✅ 正确：导入共享模块
import { Button } from '@/components/ui/button';
import { useUser } from '@/lib/auth';

// ✅ 正确：功能内部导入
import { useKnowledgeList } from '../api/get-knowledge-list';
import { KnowledgeCard } from '../components/knowledge-card';

// ❌ 错误：跨 feature 导入
import { useAuth } from '@/features/auth/hooks/use-auth';
import { TaskCard } from '@/features/tasks/components/task-card';
```

**⚠️ 重要注意事项:**
- Shared 模块 (components, hooks, lib, types, utils) 不能导入 features 或 app
- Feature 模块不能导入 app 层
- Feature 模块之间不能互相导入
- 如果两个 feature 需要共享逻辑，把它提取到 `lib/` 或 `hooks/`
- **必须配置 ESLint `import/no-restricted-paths` 规则强制执行**

---

## 3. 文件命名规范

**统一使用 kebab-case：**
- 文件名：`user-profile.tsx`, `api-client.ts`, `get-knowledge-list.ts`
- 文件夹名：`user-management/`, `api-hooks/`
- 测试文件：`.test.ts` 或 `.test.tsx`

```
✅ knowledge-list.tsx
✅ use-knowledge-filters.ts
✅ get-knowledge-list.ts
❌ KnowledgeList.tsx
❌ useKnowledgeFilters.ts
```

**⚠️ 重要注意事项:**
- macOS 文件系统不区分大小写，Linux 区分
- 用 PascalCase 可能导致本地能跑、CI 挂掉的诡异问题
- **必须配置 ESLint `check-file` 插件强制执行**

---

## 4. API 层规范

每个 API 请求应该是独立的文件，包含：类型 + Fetcher + Query Options + Hook

```typescript
// features/knowledge/api/get-knowledge-list.ts
import { useQuery, queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { z } from 'zod';

// 1. 类型定义 + Zod Schema
export const knowledgeSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
});

export type Knowledge = z.infer<typeof knowledgeSchema>;

export interface GetKnowledgeListParams {
  page?: number;
  search?: string;
}

// 2. Fetcher 函数
export const getKnowledgeList = async (params: GetKnowledgeListParams = {}) => {
  const data = await apiClient.get('/knowledge/', { params });
  return z.array(knowledgeSchema).parse(data); // 运行时验证
};

// 3. Query Options（可复用于 prefetch）
export const getKnowledgeListQueryOptions = (params: GetKnowledgeListParams = {}) =>
  queryOptions({
    queryKey: ['knowledge', 'list', params],
    queryFn: () => getKnowledgeList(params),
  });

// 4. Hook
export const useKnowledgeList = (params: GetKnowledgeListParams = {}) => {
  return useQuery(getKnowledgeListQueryOptions(params));
};
```

**命名规范：**
- 查询单个：`get-{resource}.ts`
- 查询列表：`get-{resource}-list.ts`
- 创建：`create-{resource}.ts`
- 更新：`update-{resource}.ts`
- 删除：`delete-{resource}.ts`

**⚠️ 重要注意事项:**
- 每个 API 操作一个文件，不要把所有 API 塞到一个文件里
- Query Key 要包含所有影响结果的参数，否则缓存会出问题
- 使用 Zod 进行运行时类型验证，不仅仅依赖 TypeScript

---

## 5. 状态管理规范

| 类型 | 方案 | 注意事项 |
|------|------|----------|
| 组件状态 | `useState`, `useReducer` | 优先使用，状态尽量靠近使用处 |
| 服务端缓存 | TanStack Query | **不要用 useState 存 API 数据！** |
| 表单状态 | React Hook Form + Zod | **不要用 useState 管理表单！** |
| URL 状态 | react-router-dom | 筛选条件等放 URL，方便分享 |
| 全局 UI 状态 | Context / Zustand | 只用于真正全局的状态（主题、通知等） |

**⚠️ 重要注意事项:**
- 状态不要存在单一的集中式 store，会导致不必要的重渲染
- 状态应该尽量靠近使用处
- 使用 `useState(() => expensiveFn())` 而不是 `useState(expensiveFn())`
- Context 只用于低频变化的数据

---

## 6. 组件规范

### 避免嵌套渲染函数

```typescript
// ❌ 错误：每次渲染都创建新函数，破坏 React 优化
function Component() {
  function renderItems() { return <ul>...</ul>; }
  return <div>{renderItems()}</div>;
}

// ✅ 正确：提取为独立组件
function Items() { return <ul>...</ul>; }
function Component() { return <div><Items /></div>; }
```

### Props 数量限制

超过 5 个 props 时，考虑：
- 拆分为多个组件
- 使用配置对象
- 使用 children/slots 组合

```typescript
// ✅ 使用配置对象
<UserCard user={user} actions={{ onEdit, onDelete }} />

// ❌ props 过多
<UserCard name={} email={} avatar={} role={} onEdit={} onDelete={} />
```

**⚠️ 重要注意事项:**
- 组件应该和相关代码放在一起（样式、测试、stories）
- 共享组件放在 `components/ui/`
- 功能专属组件放在 `features/[feature]/components/`

---

## 7. 路由和代码分割

```typescript
// app/router.tsx
import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';

// ✅ 正确：懒加载
const Dashboard = lazy(() => import('./routes/app/dashboard'));
const Knowledge = lazy(() => import('./routes/app/knowledge'));

export const router = createBrowserRouter([
  {
    path: '/dashboard',
    element: (
      <Suspense fallback={<Spinner />}>
        <Dashboard />
      </Suspense>
    ),
  },
]);
```

**⚠️ 重要注意事项:**
- **必须使用 React.lazy() 懒加载路由组件**
- 不要在路由文件中直接导入所有组件，这会导致初始包过大
- 每个路由应该是独立的代码块
- 使用 `createBrowserRouter` 而不是 `Routes/Route` 组件

```typescript
// ❌ 错误：直接导入，所有页面代码都会打包到首屏
import Dashboard from './routes/app/dashboard';
import Knowledge from './routes/app/knowledge';
import Users from './routes/app/users';
```

---

## 8. 错误处理规范

**⚠️ 重要注意事项:**
- **不要只在应用根部放置一个 Error Boundary**
- 在路由级别放置 Error Boundary，防止一个页面的错误影响整个应用
- API 错误在 api-client 拦截器统一处理

```typescript
// 每个路由都包一层
<ErrorBoundary fallback={<PageError />}>
  <Dashboard />
</ErrorBoundary>
```

Error Boundary 应该放置在：
- App 根级别
- 路由级别
- 关键功能级别

---

## 9. 安全规范

- Token 存储：HttpOnly Cookie（首选）或 localStorage
- XSS 防护：用户输入的 HTML 必须用 DOMPurify 清理
- 权限控制：使用 Authorization 组件实现 RBAC/PBAC

```typescript
// RBAC - 基于角色
<Authorization allowedRoles={['ADMIN', 'MENTOR']}>
  <AdminPanel />
</Authorization>

// PBAC - 基于策略（如：只有资源所有者可以删除）
<Authorization policyCheck={(user) => user.id === resource.ownerId}>
  <DeleteButton />
</Authorization>
```

**⚠️ 重要注意事项:**
- 永远不要直接渲染用户输入的 HTML
- RBAC 适用于基于角色的简单权限控制
- PBAC 适用于更细粒度的权限控制

```typescript
// ❌ 危险！XSS 漏洞
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ 先清理
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

---

## 10. 样式规范 (Tailwind CSS v4 + ShadCN UI)

```css
/* index.css - Tailwind v4 CSS-first 配置 */
@import "tailwindcss";

@theme {
  --color-primary-500: #4D6CFF;
  --color-success: #10B759;
  --color-warning: #F5C200;
  --color-error: #FF3D71;
}
```

**⚠️ 重要注意事项 (Tailwind v4 变化):**
- **不需要 `tailwind.config.js` 文件**
- 使用 `@import "tailwindcss"` 而不是 `@tailwind base/components/utilities`
- 主题配置使用 `@theme { }` 指令
- 需要安装 `@tailwindcss/vite` 插件

**ShadCN UI 注意事项:**
- 组件是复制到项目中的，不是 npm 包
- 可以完全自定义这些组件
- 使用 `npx shadcn@latest add <component>` 添加组件

---

## 11. 性能优化

**⚠️ 重要注意事项:**
- 使用 `useState(() => expensiveFn())` 而不是 `useState(expensiveFn())`
- 考虑使用 `children` prop 优化来避免不必要的重渲染
- 图片应该懒加载
- 实现数据预取用于可预测的导航

```typescript
// ❌ 错误：每次渲染都执行
const [state, setState] = useState(expensiveComputation());

// ✅ 正确：只在初始化时执行
const [state, setState] = useState(() => expensiveComputation());
```

---

## 快速检查清单

### 创建新 Feature

- [ ] 只创建实际需要的子文件夹（不要无脑创建全套 api/, components/, hooks/, types/）
- [ ] ⛔ 不要创建 index.ts barrel file
- [ ] API 文件遵循命名规范（get-xxx.ts, create-xxx.ts）
- [ ] 路由组件用 React.lazy() 懒加载
- [ ] 文件名用 kebab-case

### 代码审查

- [ ] ⛔ 没有跨 feature 导入
- [ ] ⛔ 没有 barrel file
- [ ] ⛔ 没有用 useState 存 API 数据（应该用 TanStack Query）
- [ ] ⛔ 没有用 useState 管理表单（应该用 React Hook Form）
- [ ] 组件 props 数量 ≤ 5
- [ ] 路由组件是懒加载的
- [ ] 文件名是 kebab-case

---

## 参考

- [Bulletproof React](https://github.com/alan2207/bulletproof-react)
- [TanStack Query](https://tanstack.com/query)
- [ShadCN UI](https://ui.shadcn.com/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)
