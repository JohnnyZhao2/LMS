# Design Document: Frontend Bulletproof Refactor

## Overview

本设计文档描述了将 lms_frontend 项目从 Ant Design 迁移到 ShadCN UI + Tailwind CSS 的技术方案，同时按照 bulletproof-react 的最佳实践重构项目结构。

### 目标

1. 使用 ShadCN UI + Tailwind CSS 替代 Ant Design
2. 按照 bulletproof-react 规范重构项目结构
3. 建立 Steering 规则防止 AI 生成不规范代码
4. 保持现有功能不变

### 技术栈变更

| 类别 | 当前 | 目标 |
|------|------|------|
| UI 组件库 | Ant Design 5.x | ShadCN UI |
| 样式方案 | CSS + Ant Design 覆盖 | Tailwind CSS v4 |
| 表格组件 | Ant Design Table | TanStack Table + ShadCN |
| 表单验证 | 无 | React Hook Form + Zod |
| 日期选择 | Ant Design DatePicker | React Day Picker |
| 图标 | @ant-design/icons | Lucide React |
| 通知 | Ant Design Message/Notification | Sonner |

### 迁移策略核心原则

**本迁移策略的核心原则是：任何时候页面都必须可用，不能有中间状态导致空白。**

1. **并行运行** - Ant Design 和 ShadCN UI 共存，直到所有页面迁移完成
2. **按页面迁移** - 一次只迁移一个页面，确保其他页面不受影响
3. **每步验证** - 每完成一个小步骤就验证页面可用性
4. **先加后减** - 先添加新组件，确认工作后再删除旧代码
5. **可回滚** - 每个步骤都应该可以轻松回滚

---

## Architecture

### 目标项目结构

```
lms_frontend/src/
├── app/                          # 应用层
│   ├── index.tsx                 # 应用入口
│   ├── provider.tsx              # 全局 Provider
│   ├── router.tsx                # 路由配置
│   └── routes/                   # 路由页面
│       ├── app/                  # 需要认证的路由
│       │   ├── dashboard.tsx
│       │   ├── knowledge/
│       │   ├── tasks/
│       │   ├── grading/
│       │   ├── test-center/
│       │   ├── spot-checks/
│       │   └── users/
│       ├── auth/                 # 认证路由
│       │   └── login.tsx
│       └── not-found.tsx
│
├── components/                   # 全局共享组件
│   ├── errors/                   # 错误处理
│   │   └── main-error-fallback.tsx
│   ├── layouts/                  # 布局组件
│   │   ├── app-layout.tsx
│   │   ├── auth-layout.tsx
│   │   └── content-layout.tsx
│   ├── seo/                      # SEO 组件
│   │   └── head.tsx
│   └── ui/                       # ShadCN UI 组件
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── form.tsx
│       ├── input.tsx
│       ├── select.tsx
│       ├── table.tsx
│       ├── data-table/           # 复杂表格组件
│       │   ├── data-table.tsx
│       │   ├── data-table-pagination.tsx
│       │   └── data-table-toolbar.tsx
│       └── ...
│
├── config/                       # 全局配置
│   ├── index.ts                  # 环境变量
│   └── routes.ts                 # 路由常量
│
├── features/                     # 功能模块
│   ├── auth/
│   │   ├── api/
│   │   │   ├── login.ts
│   │   │   └── logout.ts
│   │   ├── components/
│   │   │   └── login-form.tsx
│   │   ├── hooks/
│   │   │   └── use-auth.ts
│   │   └── types.ts
│   ├── dashboard/
│   ├── knowledge/
│   ├── tasks/
│   ├── grading/
│   ├── questions/
│   ├── quizzes/
│   ├── spot-checks/
│   ├── submissions/
│   └── users/
│
├── hooks/                        # 全局共享 hooks
│   └── use-role-menu.tsx
│
├── lib/                          # 预配置的库
│   ├── api-client.ts             # API 客户端
│   ├── auth.tsx                  # 认证配置 (新增)
│   ├── authorization.tsx         # 授权组件 (新增)
│   ├── react-query.ts            # React Query 配置
│   ├── utils.ts                  # ShadCN 工具函数 (新增)
│   └── dayjs.ts                  # 日期库配置
│
├── testing/                      # 测试工具
│   ├── mocks/
│   │   ├── handlers/
│   │   └── db.ts
│   ├── setup-tests.ts
│   └── test-utils.tsx
│
├── types/                        # 共享类型
│   └── api.ts
│
├── utils/                        # 工具函数
│   └── error-handler.ts
│
├── index.css                     # Tailwind CSS 入口
└── main.tsx                      # 应用入口
```

### 单向架构流程

```
┌─────────────────────────────────────────────────────────────┐
│                        Shared Layer                          │
│  components/  hooks/  lib/  types/  utils/  config/         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                       Features Layer                         │
│  features/auth  features/dashboard  features/tasks  ...     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                         App Layer                            │
│  app/routes/  app/router.tsx  app/provider.tsx              │
└─────────────────────────────────────────────────────────────┘
```

---

## Components and Interfaces

### 1. ShadCN UI 组件配置

```typescript
// components.json (ShadCN 配置文件)
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",  // Tailwind v4 不需要配置文件
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

### 2. Tailwind CSS v4 配置

**重要：Tailwind v4 使用 CSS-first 配置，不再需要 `tailwind.config.js` 文件！**

所有配置都在 CSS 文件中使用 `@theme` 指令完成：

```css
/* src/index.css - Tailwind v4 配置 */
@import "tailwindcss";

/* ============================================
   Tailwind v4 Theme 配置 (CSS-first)
   ============================================ */
@theme {
  /* 主色调 */
  --color-primary-50: #E8EEFF;
  --color-primary-100: #C7D7FF;
  --color-primary-200: #9AB8FF;
  --color-primary-300: #6B94FF;
  --color-primary-400: #4D7CFF;
  --color-primary-500: #4D6CFF;
  --color-primary-600: #3D5FE6;
  --color-primary-700: #2F4AC7;
  
  /* 成功色 */
  --color-success-50: #E6F9F0;
  --color-success-100: #B8EDCE;
  --color-success-500: #10B759;
  --color-success-600: #0DA34F;
  
  /* 警告色 */
  --color-warning-50: #FFFBEB;
  --color-warning-100: #FFF4C7;
  --color-warning-300: #FFE577;
  --color-warning-500: #F5C200;
  
  /* 错误色 */
  --color-error-50: #FFE9ED;
  --color-error-100: #FFC9D3;
  --color-error-500: #FF3D71;
  --color-error-600: #E6355F;
  
  /* 中性色 */
  --color-gray-50: #F8F9FA;
  --color-gray-100: #F1F3F5;
  --color-gray-200: #E9ECEF;
  --color-gray-300: #DEE2E6;
  --color-gray-400: #CED4DA;
  --color-gray-500: #ADB5BD;
  --color-gray-600: #868E96;
  --color-gray-700: #495057;
  --color-gray-800: #343A40;
  --color-gray-900: #212529;
  
  /* ShadCN 需要的颜色变量 */
  --color-background: hsl(0 0% 100%);
  --color-foreground: hsl(222.2 84% 4.9%);
  --color-card: hsl(0 0% 100%);
  --color-card-foreground: hsl(222.2 84% 4.9%);
  --color-popover: hsl(0 0% 100%);
  --color-popover-foreground: hsl(222.2 84% 4.9%);
  --color-secondary: hsl(210 40% 96.1%);
  --color-secondary-foreground: hsl(222.2 47.4% 11.2%);
  --color-muted: hsl(210 40% 96.1%);
  --color-muted-foreground: hsl(215.4 16.3% 46.9%);
  --color-accent: hsl(210 40% 96.1%);
  --color-accent-foreground: hsl(222.2 47.4% 11.2%);
  --color-destructive: hsl(346 84% 61%);
  --color-destructive-foreground: hsl(0 0% 100%);
  --color-border: hsl(214.3 31.8% 91.4%);
  --color-input: hsl(214.3 31.8% 91.4%);
  --color-ring: hsl(231 100% 65%);
  
  /* 字体 */
  --font-sans: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  
  /* 圆角 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 20px;
  
  /* 阴影 */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-base: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1);
}

/* ============================================
   ShadCN CSS 变量 (兼容层)
   ============================================ */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 231 100% 65%;
  --primary-foreground: 0 0% 100%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 346 84% 61%;
  --destructive-foreground: 0 0% 100%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 231 100% 65%;
  --radius: 0.5rem;
}

/* ============================================
   Base Styles
   ============================================ */
@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-gray-100 text-foreground font-sans antialiased;
  }
}
```

### 3. Tailwind v4 与 Ant Design 共存方案

在迁移期间，Tailwind CSS v4 和 Ant Design 需要共存。以下是共存策略：

```css
/* src/index.css - 共存期间的结构 */

/* 1. Tailwind v4 导入 */
@import "tailwindcss";

/* 2. Tailwind v4 主题配置 */
@theme {
  /* ... 主题变量 ... */
}

/* 3. ShadCN CSS 变量 */
:root {
  /* ... ShadCN 变量 ... */
}

/* 4. 保留现有的 CSS 变量（兼容 Ant Design） */
:root {
  /* 保留原有变量，供 Ant Design 覆盖样式使用 */
  --color-primary-500: #4D6CFF;
  /* ... */
}

/* 5. 保留必要的 Ant Design 覆盖样式 */
/* 只保留无法通过 ConfigProvider token 实现的样式 */

/* 6. 保留动画和工具类 */
@keyframes fadeIn { /* ... */ }
.animate-fadeIn { /* ... */ }
```

**共存期间的注意事项：**

1. **样式优先级**：Tailwind 的 utility classes 优先级较低，不会覆盖 Ant Design 的样式
2. **命名冲突**：避免使用与 Ant Design 相同的类名
3. **逐步迁移**：新组件使用 Tailwind，旧组件保持 Ant Design
4. **包体积**：共存期间包体积会增大，迁移完成后移除 Ant Design

### 4. 工具函数

```typescript
// lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 5. 授权组件

```typescript
// lib/authorization.tsx
import * as React from 'react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import type { RoleCode } from '@/types/api';

type AuthorizationProps = {
  allowedRoles?: RoleCode[];
  policyCheck?: () => boolean;
  forbiddenFallback?: React.ReactNode;
  children: React.ReactNode;
};

export const Authorization: React.FC<AuthorizationProps> = ({
  allowedRoles,
  policyCheck,
  forbiddenFallback = null,
  children,
}) => {
  const { currentRole } = useAuth();

  // 检查角色权限
  if (allowedRoles && currentRole && !allowedRoles.includes(currentRole)) {
    return <>{forbiddenFallback}</>;
  }

  // 检查策略权限
  if (policyCheck && !policyCheck()) {
    return <>{forbiddenFallback}</>;
  }

  return <>{children}</>;
};

export const useAuthorization = () => {
  const { currentRole } = useAuth();

  const checkAccess = React.useCallback(
    (allowedRoles: RoleCode[]) => {
      return currentRole ? allowedRoles.includes(currentRole) : false;
    },
    [currentRole]
  );

  return { checkAccess, role: currentRole };
};
```

### 6. 数据表格组件

```typescript
// components/ui/data-table/data-table.tsx
import * as React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTablePagination } from './data-table-pagination';
import { Skeleton } from '@/components/ui/skeleton';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  pagination?: {
    pageIndex: number;
    pageSize: number;
    pageCount: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading,
  pagination,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  暂无数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {pagination && <DataTablePagination table={table} {...pagination} />}
    </div>
  );
}
```

---

## Data Models

### API 请求模式

每个 API 请求文件应包含：

```typescript
// features/users/api/get-users.ts
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// 1. 响应类型定义
export const userSchema = z.object({
  id: z.number(),
  employee_id: z.string(),
  name: z.string(),
  email: z.string().email(),
  department: z.string(),
  role: z.enum(['STUDENT', 'MENTOR', 'DEPT_MANAGER', 'TEAM_MANAGER', 'ADMIN']),
  is_active: z.boolean(),
});

export type User = z.infer<typeof userSchema>;

// 2. 分页响应
export const usersResponseSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(userSchema),
});

export type UsersResponse = z.infer<typeof usersResponseSchema>;

// 3. 查询参数
export interface GetUsersParams {
  page?: number;
  page_size?: number;
  search?: string;
  role?: string;
}

// 4. Fetcher 函数
export const getUsers = async (params: GetUsersParams = {}): Promise<UsersResponse> => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.page_size) searchParams.set('page_size', String(params.page_size));
  if (params.search) searchParams.set('search', params.search);
  if (params.role) searchParams.set('role', params.role);

  const query = searchParams.toString();
  const endpoint = `/users/${query ? `?${query}` : ''}`;
  
  const data = await apiClient.get<UsersResponse>(endpoint);
  return usersResponseSchema.parse(data);
};

// 5. Query Key
export const usersQueryKey = (params: GetUsersParams = {}) => ['users', params];

// 6. React Query Hook
export const useUsers = (params: GetUsersParams = {}) => {
  return useQuery({
    queryKey: usersQueryKey(params),
    queryFn: () => getUsers(params),
  });
};
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### 分析结论

经过对所有验收标准的分析，本项目主要是架构重构项目，涉及：
- 代码组织和目录结构
- 工具配置（ESLint、Tailwind CSS）
- 组件迁移（Ant Design → ShadCN UI）
- 样式迁移（CSS → Tailwind CSS）

这些需求最适合通过以下方式验证：
1. **ESLint 规则** - 验证代码组织和导入限制
2. **TypeScript 编译** - 验证类型安全
3. **手动审查** - 验证架构合规性
4. **集成测试** - 验证组件行为

### Property 1: Zod Schema 验证一致性

*For any* valid API response data, parsing with Zod schema then serializing should produce equivalent data.

**Validates: Requirements 17.1, 31.2**

**注意**: 这是唯一可能需要属性测试的地方，但 Zod 库本身已经过充分测试。如果需要，可以为自定义 schema 添加 round-trip 测试。

---

## Error Handling

### 1. API 错误处理

```typescript
// lib/api-client.ts 中的错误拦截
async request<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
  // ... 请求逻辑

  if (!response.ok) {
    // 显示错误通知
    toast.error(getErrorMessage(response.status, errorData));
    
    // 401 错误处理
    if (response.status === 401) {
      // 尝试刷新 token 或跳转登录
    }
    
    throw new ApiError(response.status, response.statusText, errorData);
  }
}
```

### 2. Error Boundary

```typescript
// components/errors/main-error-fallback.tsx
import { Button } from '@/components/ui/button';

interface MainErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export const MainErrorFallback = ({
  error,
  resetErrorBoundary,
}: MainErrorFallbackProps) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-2xl font-bold text-gray-900">出错了</h1>
      <p className="mt-2 text-gray-600">{error.message}</p>
      <Button onClick={resetErrorBoundary} className="mt-4">
        重试
      </Button>
    </div>
  );
};
```

### 3. 路由级 Error Boundary

```typescript
// app/router.tsx
import { ErrorBoundary } from 'react-error-boundary';
import { MainErrorFallback } from '@/components/errors/main-error-fallback';

const AppRoutes = () => (
  <ErrorBoundary FallbackComponent={MainErrorFallback}>
    <Routes>
      {/* ... */}
    </Routes>
  </ErrorBoundary>
);
```

---

## Testing Strategy

### 测试类型

1. **单元测试** (Vitest + Testing Library)
   - 共享组件测试
   - 工具函数测试
   - Hook 测试

2. **集成测试** (Vitest + Testing Library + MSW)
   - 功能模块测试
   - API 交互测试
   - 表单提交测试

3. **E2E 测试** (Playwright)
   - 关键用户流程
   - 登录流程
   - 核心业务流程

### 测试工具配置

```typescript
// testing/setup-tests.ts
import '@testing-library/jest-dom';
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

```typescript
// testing/test-utils.tsx
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const AllProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

export const renderWithProviders = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllProviders, ...options });

export * from '@testing-library/react';
```

### MSW Handler 示例

```typescript
// testing/mocks/handlers/auth.ts
import { http, HttpResponse } from 'msw';
import { config } from '@/config';

export const authHandlers = [
  http.post(`${config.apiUrl}/auth/login/`, async ({ request }) => {
    const body = await request.json();
    if (body.employee_id === 'test' && body.password === 'password') {
      return HttpResponse.json({
        access: 'mock-access-token',
        refresh: 'mock-refresh-token',
        user: {
          id: 1,
          employee_id: 'test',
          name: '测试用户',
          role: 'ADMIN',
        },
      });
    }
    return HttpResponse.json({ detail: '用户名或密码错误' }, { status: 401 });
  }),
];
```

---

## 迁移策略

### 渐进式迁移原则

**核心原则：任何时候页面都必须可用，不能有中间状态导致空白。**

```
┌─────────────────────────────────────────────────────────────┐
│                    迁移前状态                                │
│  100% Ant Design + 自定义 CSS                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    共存阶段                                  │
│  Ant Design (旧页面) + ShadCN + Tailwind v4 (新/迁移页面)   │
│  - 两套 UI 库并行运行                                        │
│  - 按页面逐个迁移                                            │
│  - 每步验证可用性                                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    迁移后状态                                │
│  100% ShadCN UI + Tailwind CSS v4                           │
└─────────────────────────────────────────────────────────────┘
```

### 阶段 1: 基础设施搭建 (1-2 天)

**目标**：安装和配置 Tailwind v4 + ShadCN，确保与现有 Ant Design 共存

1. 安装 Tailwind CSS v4 和相关依赖
2. 配置 Tailwind v4（CSS-first 配置）
3. 初始化 ShadCN UI
4. 添加基础 UI 组件（button, card, input 等）
5. 创建 `lib/utils.ts` 工具函数
6. **验证**：确保现有页面正常工作

### 阶段 2: 核心组件创建 (2-3 天)

**目标**：创建可复用的核心组件，为页面迁移做准备

1. 创建 DataTable 组件（基于 TanStack Table）
2. 创建 Form 组件（基于 React Hook Form + Zod）
3. 创建布局组件（app-layout, content-layout）
4. 创建错误处理组件（error-boundary, error-fallback）
5. **验证**：组件可以独立使用，不影响现有页面

### 阶段 3: 页面迁移 (3-5 天)

**目标**：按页面逐个迁移，每个页面迁移后立即验证

**迁移顺序**（从简单到复杂）：

1. **登录页面** (试点)
   - 最简单的页面，只有表单
   - 验证 ShadCN Form 组件
   - 成功后继续下一个

2. **仪表盘页面**
   - 主要是卡片和统计数据
   - 验证 Card 组件

3. **列表页面** (知识库、用户管理等)
   - 使用新的 DataTable 组件
   - 验证分页、搜索、筛选

4. **表单页面** (创建/编辑)
   - 使用新的 Form 组件
   - 验证表单验证

5. **详情页面**
   - 混合展示和操作

**每个页面迁移步骤**：

```
1. 创建新组件文件（不删除旧文件）
2. 在路由中切换到新组件
3. 验证页面功能正常
4. 提交代码（可回滚点）
5. 删除旧组件文件
```

### 阶段 4: 清理和优化 (1-2 天)

**目标**：移除 Ant Design，清理旧代码

1. 确认所有页面已迁移
2. 移除 Ant Design 依赖
3. 清理 index.css 中的 Ant Design 覆盖样式
4. 移除 theme.ts 中的 Ant Design 配置
5. 创建 Steering 规则
6. 更新文档

### 总计: 7-12 天

### 回滚策略

每个阶段都应该可以回滚：

1. **阶段 1 回滚**：删除 Tailwind 配置，恢复原 index.css
2. **阶段 2 回滚**：删除新组件文件
3. **阶段 3 回滚**：在路由中切换回旧组件
4. **阶段 4 回滚**：重新安装 Ant Design（不推荐到这一步再回滚）

### 验证清单

每个步骤完成后检查：

- [ ] 页面可以正常加载
- [ ] 所有交互功能正常
- [ ] 样式显示正确
- [ ] 控制台无错误
- [ ] 构建成功
