# Requirements Document

## Introduction

本文档基于 [bulletproof-react](https://github.com/alan2207/bulletproof-react) 项目的最佳实践，对 lms_frontend 项目进行深度分析，生成前端框架规则文档和改进建议。bulletproof-react 是一个可扩展、可维护的 React 应用架构参考实现，本文档将其核心原则与 lms_frontend 现状进行对比，提出具体改进方案。

## Glossary

- **Feature**: 功能模块，包含特定业务功能的所有相关代码
- **Unidirectional_Architecture**: 单向代码架构，代码流向为 shared → features → app
- **Cross_Feature_Import**: 跨功能模块导入，应当被禁止
- **Barrel_File**: 桶文件，用于统一导出模块内容（不推荐使用）
- **Code_Splitting**: 代码分割，按路由懒加载组件
- **Error_Boundary**: 错误边界，用于捕获组件树中的错误
- **MSW**: Mock Service Worker，用于 API 模拟
- **RBAC**: Role-Based Access Control，基于角色的访问控制
- **PBAC**: Permission-Based Access Control，基于权限的访问控制

---

## Part 1: Bulletproof-React 框架规则文档

### Requirement 1: 项目结构规范

**User Story:** As a developer, I want a well-organized project structure, so that I can easily navigate and maintain the codebase.

#### Acceptance Criteria

1. THE Project_Structure SHALL follow the standard directory layout:
   ```
   src/
   ├── app/               # 应用层：路由、入口、全局 Provider
   │   ├── index.tsx      # 应用入口
   │   ├── provider.tsx   # 全局 Provider
   │   ├── router.tsx     # 路由配置
   │   └── routes/        # 路由页面组件 ⭐
   │       ├── app/       # 应用内路由（需要认证）
   │       ├── auth/      # 认证相关路由
   │       ├── landing.tsx
   │       └── not-found.tsx
   ├── assets/            # 静态资源
   ├── components/        # 全局共享组件
   │   ├── errors/        # 错误处理组件 ⭐ (如 main.tsx)
   │   ├── layouts/       # 布局组件 ⭐ (如 dashboard-layout.tsx)
   │   ├── seo/           # SEO 组件 ⭐ (如 head.tsx)
   │   └── ui/            # UI 基础组件 (button/, dialog/, form/...)
   ├── config/            # 全局配置
   ├── features/          # 功能模块
   ├── hooks/             # 全局共享 hooks
   ├── lib/               # 预配置的库
   ├── stores/            # 全局状态存储
   ├── testing/           # 测试工具和 mocks
   ├── types/             # 共享类型定义
   └── utils/             # 工具函数
   ```
   
   **⭐ 标注的是 bulletproof-react 实际存在的目录结构，已验证**

2. WHEN organizing feature modules, THE Feature_Structure SHALL contain:
   ```
   src/features/awesome-feature/
   ├── api/           # API 请求和 hooks
   ├── assets/        # 功能专属静态资源
   ├── components/    # 功能专属组件
   ├── hooks/         # 功能专属 hooks
   ├── stores/        # 功能专属状态
   ├── types/         # 功能专属类型
   └── utils/         # 功能专属工具函数
   ```

3. THE Feature_Module SHALL only include necessary subdirectories based on actual needs

---

### Requirement 2: 单向代码架构

**User Story:** As a developer, I want a unidirectional codebase architecture, so that the code flow is predictable and easy to understand.

#### Acceptance Criteria

1. THE Code_Flow SHALL follow the direction: shared → features → app
2. WHEN importing modules, THE Shared_Modules (components, hooks, lib, types, utils) SHALL NOT import from features or app
3. WHEN importing modules, THE Feature_Modules SHALL NOT import from app layer
4. WHEN importing modules, THE App_Layer SHALL be able to import from both features and shared modules
5. IF cross-feature import is detected, THEN THE ESLint SHALL report an error

---

### Requirement 3: 禁止跨功能模块导入

**User Story:** As a developer, I want features to be independent, so that I can modify one feature without affecting others.

#### Acceptance Criteria

1. THE Feature_Module SHALL NOT import from other feature modules
2. WHEN features need to communicate, THE App_Layer SHALL compose them together
3. THE ESLint_Config SHALL enforce cross-feature import restrictions with `import/no-restricted-paths` rule
4. IF a feature needs shared functionality, THEN it SHALL be moved to shared modules (components, hooks, lib, utils)

---

### Requirement 4: 文件命名规范

**User Story:** As a developer, I want consistent file naming conventions, so that the codebase is easier to navigate.

#### Acceptance Criteria

1. THE File_Names SHALL use kebab-case format (e.g., `user-profile.tsx`, `api-client.ts`)
2. THE Folder_Names SHALL use kebab-case format (e.g., `user-management/`, `api-hooks/`)
3. THE ESLint_Config SHALL enforce naming conventions using `check-file` plugin
4. WHEN naming test files, THE Test_Files SHALL use `.test.ts` or `.test.tsx` suffix
5. WHEN naming story files, THE Story_Files SHALL use `.stories.tsx` suffix

---

### Requirement 5: API 层规范

**User Story:** As a developer, I want a well-structured API layer, so that API calls are consistent and maintainable.

#### Acceptance Criteria

1. THE API_Client SHALL be a single pre-configured instance used throughout the application
2. WHEN defining API requests, THE Request_Declaration SHALL include:
   - Types and validation schemas for request/response data
   - A fetcher function using the API client
   - A React Query hook for data fetching and caching
3. THE API_Requests SHALL be colocated within feature modules under `api/` directory
4. WHEN handling API errors, THE API_Client SHALL implement interceptors for:
   - Error notification toasts
   - Unauthorized user logout
   - Token refresh requests

---

### Requirement 6: 状态管理规范

**User Story:** As a developer, I want clear state management patterns, so that state is predictable and performant.

#### Acceptance Criteria

1. THE State_Management SHALL be categorized into:
   - Component State: Local state using useState/useReducer
   - Application State: Global UI state (modals, notifications, themes)
   - Server Cache State: Remote data using React Query
   - Form State: Form data using React Hook Form + Zod
   - URL State: URL parameters using react-router-dom

2. WHEN managing server state, THE Application SHALL use React Query (TanStack Query)
3. WHEN managing form state, THE Application SHALL use React Hook Form with Zod validation
4. THE State SHALL be kept as close as possible to where it is used
5. WHEN using React Context, THE Context SHALL be used for low-velocity data only

---

### Requirement 7: 组件规范

**User Story:** As a developer, I want consistent component patterns, so that components are reusable and maintainable.

#### Acceptance Criteria

1. THE Components SHALL be colocated with their related code (styles, tests, stories)
2. WHEN a component grows large, THE Nested_Rendering_Functions SHALL be extracted into separate components
3. THE Component_Props SHALL be limited in number; if too many, consider composition via children or slots
4. THE Shared_Components SHALL be abstracted into a component library under `components/ui/`
5. WHEN wrapping 3rd party components, THE Wrapper SHALL adapt them to application needs
6. THE UI_Components SHALL be organized in subdirectories (e.g., `button/`, `dialog/`, `form/`)

---

### Requirement 8: 路由和代码分割

**User Story:** As a developer, I want optimized routing with code splitting, so that the application loads efficiently.

#### Acceptance Criteria

1. THE Routes SHALL be defined in `app/routes/` directory
2. WHEN defining routes, THE Route_Components SHALL use React.lazy() for code splitting
3. THE Code_Splitting SHALL be implemented at route level
4. WHEN loading lazy components, THE Suspense SHALL provide a fallback UI
5. THE Router_Config SHALL be centralized in `app/router.tsx`

---

### Requirement 9: 错误处理规范

**User Story:** As a developer, I want comprehensive error handling, so that errors are caught and handled gracefully.

#### Acceptance Criteria

1. THE API_Errors SHALL be handled by interceptors with user notifications
2. THE In_App_Errors SHALL be caught by Error Boundaries
3. THE Error_Boundaries SHALL be placed at multiple levels, not just at the app root
4. WHEN an error occurs in a component, THE Error_Boundary SHALL contain it locally
5. THE Production_Errors SHALL be tracked using tools like Sentry

---

### Requirement 10: 安全规范

**User Story:** As a developer, I want secure authentication and authorization, so that the application is protected.

#### Acceptance Criteria

1. THE Authentication_Tokens SHALL be stored in HttpOnly cookies (preferred) or localStorage
2. WHEN storing tokens in localStorage, THE Application SHALL sanitize all user inputs to prevent XSS
3. THE User_Data SHALL be managed as global state accessible throughout the application
4. THE Authorization SHALL support both RBAC (Role-Based) and PBAC (Permission-Based) access control
5. WHEN protecting routes, THE Protected_Route SHALL check both authentication and authorization

---

### Requirement 11: 测试规范

**User Story:** As a developer, I want comprehensive testing, so that the application is reliable.

#### Acceptance Criteria

1. THE Testing_Strategy SHALL include:
   - Unit Tests: For shared components and utility functions
   - Integration Tests: For feature workflows (primary focus)
   - E2E Tests: For critical user flows
2. THE Testing_Tools SHALL include Vitest, Testing Library, and Playwright
3. THE API_Mocking SHALL use MSW (Mock Service Worker)
4. THE Test_Files SHALL be colocated with source files in `__tests__/` directories
5. THE Testing_Utilities SHALL be centralized in `testing/` directory

---

### Requirement 12: 项目标准

**User Story:** As a developer, I want enforced project standards, so that code quality is maintained.

#### Acceptance Criteria

1. THE ESLint SHALL be configured with comprehensive rules for code quality
2. THE Prettier SHALL be configured for consistent code formatting
3. THE TypeScript SHALL be used for type safety
4. THE Husky SHALL be configured for pre-commit hooks
5. THE Absolute_Imports SHALL be configured using `@/*` path alias
6. THE Import_Order SHALL be enforced with alphabetical sorting and grouping

---

## Part 2: LMS Frontend 改进需求

### Requirement 13: 路由结构重构

**User Story:** As a developer, I want the router to follow bulletproof-react patterns, so that routes are lazy-loaded and well-organized.

#### Acceptance Criteria

1. WHEN defining routes, THE Router SHALL use React.lazy() for all route components
2. THE Route_Components SHALL be moved to `app/routes/` directory
3. THE Router_Config SHALL use createBrowserRouter instead of Routes/Route components
4. WHEN loading routes, THE Suspense SHALL wrap lazy components with loading fallback
5. THE Route_Definitions SHALL be separated from route rendering logic

**⚠️ 重要注意事项:**
- 不要在路由文件中直接导入所有组件，这会导致初始包过大
- 使用 `React.lazy()` 和动态 `import()` 实现按需加载
- 每个路由应该是独立的代码块

---

### Requirement 14: ESLint 配置增强

**User Story:** As a developer, I want comprehensive ESLint rules, so that code quality and architecture are enforced.

#### Acceptance Criteria

1. THE ESLint_Config SHALL add `import/no-restricted-paths` rule to enforce:
   - Cross-feature import restrictions
   - Unidirectional architecture enforcement
2. THE ESLint_Config SHALL add `check-file` plugin for:
   - File naming convention (kebab-case)
   - Folder naming convention (kebab-case)
3. THE ESLint_Config SHALL add `import/order` rule for consistent import ordering
4. THE ESLint_Config SHALL add `import/no-cycle` rule to prevent circular dependencies

**⚠️ 重要注意事项:**
- 必须配置跨功能模块导入限制，否则功能模块会相互耦合
- 单向架构规则是保持代码可维护性的关键

---

### Requirement 15: 组件目录结构优化

**User Story:** As a developer, I want UI components to be well-organized, so that they are easy to find and maintain.

#### Acceptance Criteria

1. THE UI_Components SHALL be organized in subdirectories under `components/ui/`:
   ```
   components/ui/
   ├── button/
   │   ├── button.tsx
   │   ├── button.stories.tsx
   │   └── __tests__/
   ├── card/
   │   ├── card.tsx
   │   └── ...
   └── form/
       ├── form.tsx
       ├── input.tsx
       └── ...
   ```
2. THE Components_Directory SHALL add `errors/` subdirectory for error handling components
3. THE Components_Directory SHALL add `seo/` subdirectory for SEO-related components
4. WHEN creating new components, THE Component SHALL have its own directory with related files

**⚠️ 重要注意事项:**
- 每个组件应该有自己的目录，包含组件文件、测试文件和 stories 文件
- 不要使用 barrel files (index.ts) 导出所有组件，这会影响 tree shaking

---

### Requirement 16: 添加缺失的核心模块

**User Story:** As a developer, I want all necessary modules in place, so that the application is complete.

#### Acceptance Criteria

1. THE Lib_Directory SHALL add `auth.tsx` for authentication configuration
2. THE Lib_Directory SHALL add `authorization.tsx` for RBAC/PBAC components
3. THE Components_Directory SHALL add error boundary components
4. THE Testing_Directory SHALL add:
   - `setup-tests.ts` for test configuration
   - `test-utils.tsx` for custom render functions
   - `data-generators.ts` for test data generation
   - `mocks/handlers/` for MSW handlers
   - `mocks/db.ts` for mock database

**⚠️ 重要注意事项:**
- `auth.tsx` 应该集中管理用户认证状态和相关 hooks
- `authorization.tsx` 应该提供 RBAC 组件用于权限控制

---

### Requirement 17: API 层重构

**User Story:** As a developer, I want API requests to follow consistent patterns, so that they are maintainable.

#### Acceptance Criteria

1. WHEN defining API requests, THE Request_File SHALL include:
   - TypeScript types for request/response
   - Zod schema for validation
   - Fetcher function
   - React Query hook (useQuery/useMutation)
2. THE API_Files SHALL follow naming convention: `get-{resource}.ts`, `create-{resource}.ts`, etc.
3. THE API_Client SHALL add error notification interceptor
4. THE Query_Keys SHALL be centralized and type-safe

**⚠️ 重要注意事项:**
- 每个 API 请求应该是独立的文件，包含完整的类型定义和 hook
- 使用 Zod 进行运行时类型验证，不仅仅依赖 TypeScript

---

### Requirement 18: 文件命名规范修正

**User Story:** As a developer, I want consistent file naming, so that the codebase is uniform.

#### Acceptance Criteria

1. THE File `Header.tsx` SHALL be renamed to `header.tsx`
2. THE File `App.tsx` SHALL be removed (use `app/index.tsx` instead)
3. THE File `App.css` SHALL be removed (styles should be in `index.css` or component-specific)
4. ALL TypeScript files SHALL use kebab-case naming
5. ALL directories SHALL use kebab-case naming

**⚠️ 重要注意事项:**
- 文件命名不一致会导致在不同操作系统上出现问题（macOS 不区分大小写，Linux 区分）
- 统一使用 kebab-case 可以避免这类问题

---

### Requirement 19: 添加 Error Boundary 组件

**User Story:** As a developer, I want error boundaries, so that errors are contained and handled gracefully.

#### Acceptance Criteria

1. THE Components_Directory SHALL add `errors/main-error-fallback.tsx`
2. THE Error_Boundary SHALL be placed at:
   - App root level
   - Route level
   - Feature level (for critical features)
3. THE Error_Fallback SHALL provide:
   - User-friendly error message
   - Retry button
   - Option to report error

**⚠️ 重要注意事项:**
- 不要只在应用根部放置一个 Error Boundary
- 在路由级别放置 Error Boundary 可以防止一个页面的错误影响整个应用

---

### Requirement 20: 性能优化

**User Story:** As a developer, I want optimized performance, so that the application is fast.

#### Acceptance Criteria

1. THE State SHALL not be stored in a single centralized store to avoid unnecessary re-renders
2. THE State SHALL be kept as close as possible to where it is used
3. WHEN initializing expensive state, THE useState SHALL use initializer function
4. THE Styling_Solution SHALL use zero-runtime solution (Tailwind CSS) for better performance
5. THE Images SHALL be lazy loaded when not in viewport
6. THE Data_Prefetching SHALL be implemented for predictable navigation

**⚠️ 重要注意事项:**
- 使用 `useState(() => expensiveFn())` 而不是 `useState(expensiveFn())`
- 考虑使用 `children` prop 优化来避免不必要的重渲染

---

### Requirement 21: 测试基础设施

**User Story:** As a developer, I want testing infrastructure, so that I can write and run tests.

#### Acceptance Criteria

1. THE Testing_Directory SHALL be properly structured:
   ```
   testing/
   ├── mocks/
   │   ├── handlers/
   │   │   ├── auth.ts
   │   │   ├── users.ts
   │   │   └── index.ts
   │   ├── db.ts
   │   └── server.ts
   ├── data-generators.ts
   ├── setup-tests.ts
   └── test-utils.tsx
   ```
2. THE MSW_Handlers SHALL mock all API endpoints
3. THE Test_Utils SHALL provide custom render with providers
4. THE Data_Generators SHALL create realistic test data

**⚠️ 重要注意事项:**
- MSW 可以在开发和测试中使用，提供一致的 API 模拟
- 不要在测试中直接 mock fetch，使用 MSW 拦截请求

---

### Requirement 22: 授权组件

**User Story:** As a developer, I want authorization components, so that I can control access to features.

#### Acceptance Criteria

1. THE Lib_Directory SHALL add `authorization.tsx` with:
   - `useAuthorization` hook
   - `Authorization` component for RBAC
   - Policy-based access control support
2. THE Authorization_Component SHALL support:
   - `allowedRoles` prop for RBAC
   - `policyCheck` prop for PBAC
   - `forbiddenFallback` prop for custom forbidden UI
3. THE Protected_Route SHALL be refactored to use Authorization component

**⚠️ 重要注意事项:**
- RBAC 适用于基于角色的简单权限控制
- PBAC 适用于更细粒度的权限控制（如：只有资源所有者可以删除）

---

## Part 3: 改进优先级和实施建议

### 高优先级（立即修复）

1. **ESLint 配置增强** (Requirement 14)
   - 添加跨功能模块导入限制
   - 添加单向架构规则
   - 添加文件命名规范

2. **路由代码分割** (Requirement 13)
   - 使用 React.lazy() 懒加载路由组件
   - 添加 Suspense 和加载状态

3. **文件命名修正** (Requirement 18)
   - 统一使用 kebab-case

### 中优先级（近期修复）

4. **组件目录重构** (Requirement 15)
   - 将 UI 组件组织到子目录
   - 添加 errors 和 seo 目录

5. **添加核心模块** (Requirement 16)
   - 添加 auth.tsx 和 authorization.tsx
   - 添加 Error Boundary 组件

6. **API 层重构** (Requirement 17)
   - 统一 API 请求模式
   - 添加 Zod 验证

### 低优先级（后续优化）

7. **测试基础设施** (Requirement 21)
   - 完善 MSW 配置
   - 添加测试工具函数

8. **性能优化** (Requirement 20)
   - 状态优化
   - 数据预取

---

---

## Part 4: 样式解决方案建议

### 当前状况分析

你的项目目前使用：
- **Ant Design 5.x** - 全功能组件库
- **大量自定义 CSS** - 约 1400+ 行的 `index.css`，包含：
  - CSS 变量（设计令牌）
  - Ant Design 组件覆盖样式
  - 自定义动画
  - 工具类
  - 特定组件样式（如 task-form）

### 问题分析

1. **样式冲突风险**：自定义 CSS 使用 `!important` 覆盖 Ant Design 样式，维护困难
2. **样式分散**：部分样式在 `index.css`，部分在 `theme.ts`，不够集中
3. **运行时开销**：Ant Design 使用 CSS-in-JS（emotion），有运行时性能开销
4. **Tree Shaking 问题**：Ant Design 的样式不能完全 tree shake

### Bulletproof-React 推荐方案

根据 bulletproof-react 文档，推荐的样式方案分为两类：

#### 全功能组件库（你当前的选择）
- **Ant Design** ✅ 你正在使用
- Chakra UI
- MUI
- Mantine

#### 无头组件库 + 样式方案（更灵活）
- **Radix UI** + Tailwind CSS
- **Headless UI** + Tailwind CSS
- **ShadCN UI**（基于 Radix + Tailwind，提供预设样式代码）
- **Park UI**（基于 Ark UI + Panda CSS）

### 针对你项目的建议

#### 方案 A：保持 Ant Design，优化样式管理（推荐，改动最小）

**优点**：
- 改动最小，风险最低
- Ant Design 组件丰富，适合企业级应用
- 你已经有完整的主题配置

**改进措施**：

1. **统一样式管理**
   - 将 CSS 变量移到 `theme.ts` 中统一管理
   - 使用 Ant Design 的 `ConfigProvider` 和 `token` 系统
   - 减少 `!important` 的使用

2. **组件级样式**
   - 将特定组件样式（如 `.task-form-*`）移到组件目录
   - 使用 CSS Modules 或 styled-components 隔离样式

3. **减少全局样式**
   - 只保留真正全局的样式（reset、typography、scrollbar）
   - 组件特定样式应该跟随组件

```
src/
├── index.css              # 只保留全局样式（~200行）
├── components/
│   └── ui/
│       └── task-form/
│           ├── task-form.tsx
│           └── task-form.module.css  # 组件专属样式
```

#### 方案 B：迁移到 Tailwind CSS + Ant Design（中等改动）

**优点**：
- 零运行时，性能更好
- 原子化 CSS，更容易维护
- 可以逐步迁移

**改进措施**：

1. **安装 Tailwind CSS**
   ```bash
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```

2. **配置 Tailwind 使用你的设计令牌**
   ```javascript
   // tailwind.config.js
   module.exports = {
     theme: {
       extend: {
         colors: {
           primary: {
             50: '#E8EEFF',
             500: '#4D6CFF',
             // ...
           },
         },
         // 复用你现有的设计令牌
       },
     },
   };
   ```

3. **逐步替换自定义 CSS**
   - 新组件使用 Tailwind
   - 旧组件逐步迁移

4. **保留 Ant Design 组件**
   - 继续使用 Ant Design 的复杂组件（Table、Form、DatePicker）
   - 简单组件可以用 Tailwind 重写

#### 方案 C：迁移到 ShadCN UI（大改动，长期最优）

**优点**：
- 组件代码在你的项目中，完全可控
- 基于 Radix UI，无障碍性好
- Tailwind CSS 样式，零运行时
- 可以按需复制组件，不是整个库

**缺点**：
- 需要重写大部分 UI
- 迁移成本高
- 复杂组件（如 Table）需要额外工作

**适用场景**：
- 新项目
- 有足够时间重构
- 需要高度定制化

### 最终建议

**你选择了方案 C（ShadCN UI）- 彻底重构，使用 Tailwind CSS + 无头组件**

这是一个明智的选择，可以从根本上解决 AI 生成代码导致样式混乱的问题。

---

## Part 5: ShadCN UI 迁移需求

### Requirement 24: 安装和配置 Tailwind CSS v4

**User Story:** As a developer, I want Tailwind CSS v4 configured, so that I can use utility-first styling with CSS-first configuration.

#### Acceptance Criteria

1. THE Project SHALL install Tailwind CSS v4:
   ```bash
   npm install tailwindcss @tailwindcss/vite
   ```

2. THE Vite_Config SHALL add Tailwind plugin:
   ```typescript
   // vite.config.ts
   import tailwindcss from '@tailwindcss/vite'
   
   export default defineConfig({
     plugins: [react(), tailwindcss()],
   })
   ```

3. THE Index_CSS SHALL use Tailwind v4 CSS-first configuration:
   ```css
   @import "tailwindcss";
   
   @theme {
     /* 所有主题配置在这里 */
     --color-primary-500: #4D6CFF;
     /* ... */
   }
   ```

4. THE Project SHALL NOT create `tailwind.config.js` file (Tailwind v4 uses CSS-first config)

5. THE CSS_Variables SHALL be defined using `@theme` directive for Tailwind v4

**⚠️ 重要注意事项 (Tailwind v4 变化):**
- Tailwind v4 不再需要 `tailwind.config.js` 文件
- 使用 `@import "tailwindcss"` 而不是 `@tailwind base/components/utilities`
- 主题配置使用 `@theme { }` 指令
- 需要安装 `@tailwindcss/vite` 插件

---

### Requirement 25: 安装和配置 ShadCN UI

**User Story:** As a developer, I want ShadCN UI configured, so that I can use pre-built accessible components.

#### Acceptance Criteria

1. THE Project SHALL initialize ShadCN UI:
   ```bash
   npx shadcn@latest init
   ```

2. THE ShadCN_Config SHALL use:
   - Style: Default
   - Base color: Slate (or custom based on your design)
   - CSS variables: Yes
   - Tailwind CSS config: tailwind.config.js
   - Components directory: src/components/ui
   - Utils directory: src/lib/utils

3. THE Components_Directory SHALL follow ShadCN structure:
   ```
   src/components/ui/
   ├── button.tsx
   ├── card.tsx
   ├── dialog.tsx
   ├── form.tsx
   ├── input.tsx
   ├── select.tsx
   ├── table.tsx
   └── ...
   ```

4. THE Utils_File SHALL be created at `src/lib/utils.ts` with `cn()` function

**⚠️ 重要注意事项:**
- ShadCN UI 组件是复制到你项目中的，不是 npm 包
- 你可以完全自定义这些组件
- 使用 `npx shadcn@latest add <component>` 添加组件

---

### Requirement 26: 安装复杂组件替代方案

**User Story:** As a developer, I want alternatives for complex Ant Design components, so that I can replace them.

#### Acceptance Criteria

1. THE Project SHALL install TanStack Table for data tables:
   ```bash
   npm install @tanstack/react-table
   ```

2. THE Project SHALL install date picker solution:
   ```bash
   npm install react-day-picker date-fns
   # 或者使用 ShadCN 的 calendar 组件
   npx shadcn@latest add calendar
   ```

3. THE Project SHALL install form validation:
   ```bash
   npm install react-hook-form @hookform/resolvers zod
   ```

4. THE Project SHALL install toast notifications:
   ```bash
   npx shadcn@latest add sonner
   # 或者
   npm install sonner
   ```

5. THE Project SHALL install icons:
   ```bash
   npm install lucide-react
   ```

**⚠️ 重要注意事项:**
- TanStack Table 比 Ant Design Table 更灵活但需要更多配置
- ShadCN 的 Calendar 组件基于 react-day-picker
- Lucide React 是 ShadCN 推荐的图标库

---

### Requirement 27: 渐进式迁移策略

**User Story:** As a developer, I want a gradual migration strategy, so that the application remains functional throughout the migration process.

#### Acceptance Criteria

1. THE Migration SHALL follow the principle: "任何时候页面都必须可用，不能有中间状态导致空白"

2. THE Migration SHALL support parallel running:
   - Ant Design and ShadCN UI SHALL coexist until all pages are migrated
   - Both UI libraries SHALL work without conflicts

3. THE Migration SHALL be page-by-page:
   - One page SHALL be migrated at a time
   - Other pages SHALL remain unaffected during migration

4. THE Migration SHALL verify after each step:
   - Page functionality SHALL be verified after each change
   - Console errors SHALL be checked

5. THE Migration SHALL follow "add before remove":
   - New components SHALL be added first
   - Old components SHALL be removed only after new ones are confirmed working

6. THE Migration SHALL be rollback-friendly:
   - Each step SHALL be easily reversible
   - Git commits SHALL be granular for easy rollback

**⚠️ 重要注意事项:**
- 不要一次性迁移所有页面
- 每个页面迁移后立即验证
- 保持 git 提交粒度小，方便回滚
- 共存期间包体积会增大，这是预期的

---

### Requirement 28: 移除 Ant Design（迁移完成后）

**User Story:** As a developer, I want Ant Design removed, so that there are no style conflicts.

#### Acceptance Criteria

1. THE Project SHALL uninstall Ant Design packages:
   ```bash
   npm uninstall antd @ant-design/icons @ant-design/v5-patch-for-react-19
   ```

2. THE Provider_File SHALL remove Ant Design providers:
   - Remove `ConfigProvider`
   - Remove `App as AntApp`
   - Remove `zhCN` locale

3. THE Theme_File SHALL be refactored to Tailwind config

4. THE Index_CSS SHALL remove all Ant Design overrides

**⚠️ 重要注意事项:**
- 这是破坏性更改，需要逐步迁移
- 建议先添加 ShadCN 组件，再移除 Ant Design
- 可以两者共存一段时间

---

### Requirement 28: 移除 Ant Design（迁移完成后）

**User Story:** As a developer, I want Ant Design removed after migration is complete, so that there are no style conflicts and bundle size is reduced.

#### Acceptance Criteria

1. THE Project SHALL uninstall Ant Design packages only after ALL pages are migrated:
   ```bash
   npm uninstall antd @ant-design/icons @ant-design/v5-patch-for-react-19
   ```

2. THE Provider_File SHALL remove Ant Design providers:
   - Remove `ConfigProvider`
   - Remove `App as AntApp`
   - Remove `zhCN` locale

3. THE Theme_File SHALL be removed (replaced by Tailwind v4 @theme config)

4. THE Index_CSS SHALL remove all Ant Design overrides

**⚠️ 重要注意事项:**
- 这是破坏性更改，只在所有页面迁移完成后执行
- 执行前确保所有页面都已使用 ShadCN 组件
- 建议在单独的 git 分支上操作

---

### Requirement 29: 创建基础 UI 组件

**User Story:** As a developer, I want base UI components, so that I can build pages.

#### Acceptance Criteria

1. THE Project SHALL add essential ShadCN components:
   ```bash
   npx shadcn@latest add button
   npx shadcn@latest add card
   npx shadcn@latest add input
   npx shadcn@latest add label
   npx shadcn@latest add select
   npx shadcn@latest add dialog
   npx shadcn@latest add dropdown-menu
   npx shadcn@latest add form
   npx shadcn@latest add table
   npx shadcn@latest add tabs
   npx shadcn@latest add badge
   npx shadcn@latest add avatar
   npx shadcn@latest add skeleton
   npx shadcn@latest add spinner
   npx shadcn@latest add toast
   npx shadcn@latest add calendar
   npx shadcn@latest add popover
   npx shadcn@latest add command
   npx shadcn@latest add sheet
   npx shadcn@latest add separator
   npx shadcn@latest add scroll-area
   ```

2. THE Components SHALL be customized to match your design system:
   - Primary color: #4D6CFF
   - Success color: #10B759
   - Warning color: #F5C200
   - Error color: #FF3D71
   - Font family: Outfit

3. THE Components SHALL support Chinese locale where applicable

**⚠️ 重要注意事项:**
- 添加组件后可以自由修改
- 建议先添加所有需要的组件，再统一调整样式

---

### Requirement 29: 创建基础 UI 组件

**User Story:** As a developer, I want base UI components, so that I can build pages.

#### Acceptance Criteria

1. THE Project SHALL add essential ShadCN components:
   ```bash
   npx shadcn@latest add button card input label select dialog dropdown-menu form table tabs badge avatar skeleton toast calendar popover command sheet separator scroll-area
   ```

2. THE Components SHALL be customized to match your design system:
   - Primary color: #4D6CFF
   - Success color: #10B759
   - Warning color: #F5C200
   - Error color: #FF3D71
   - Font family: Outfit

3. THE Components SHALL support Chinese locale where applicable

**⚠️ 重要注意事项:**
- 添加组件后可以自由修改
- 建议先添加所有需要的组件，再统一调整样式

---

### Requirement 30: 创建布局组件

**User Story:** As a developer, I want layout components, so that I can structure pages.

#### Acceptance Criteria

1. THE Layout_Components SHALL include:
   - `layout.tsx` - Main layout with header and sidebar
   - `header.tsx` - Application header
   - `sidebar.tsx` - Navigation sidebar (if needed)
   - `page-header.tsx` - Page title and actions
   - `container.tsx` - Content container

2. THE Layout SHALL use Tailwind CSS for styling

3. THE Layout SHALL be responsive

**⚠️ 重要注意事项:**
- ShadCN 没有内置布局组件，需要自己创建
- 可以参考你现有的布局结构

---

### Requirement 30: 创建布局组件

**User Story:** As a developer, I want layout components, so that I can structure pages.

#### Acceptance Criteria

1. THE Layout_Components SHALL include:
   - `app-layout.tsx` - Main layout with header and sidebar
   - `header.tsx` - Application header (using Tailwind, not Ant Design)
   - `sidebar.tsx` - Navigation sidebar (if needed)
   - `page-header.tsx` - Page title and actions
   - `content-layout.tsx` - Content container

2. THE Layout SHALL use Tailwind CSS for styling

3. THE Layout SHALL be responsive

**⚠️ 重要注意事项:**
- ShadCN 没有内置布局组件，需要自己创建
- 可以参考你现有的布局结构
- 布局组件应该先创建，再迁移页面

---

### Requirement 31: 创建数据表格组件

**User Story:** As a developer, I want a data table component, so that I can display tabular data.

#### Acceptance Criteria

1. THE DataTable_Component SHALL be based on TanStack Table + ShadCN Table

2. THE DataTable SHALL support:
   - Sorting
   - Filtering
   - Pagination
   - Row selection
   - Column visibility
   - Loading state
   - Empty state

3. THE DataTable SHALL be reusable across features

4. THE DataTable SHALL support Chinese locale for pagination

**⚠️ 重要注意事项:**
- TanStack Table 是 headless 的，需要自己实现 UI
- ShadCN 有 DataTable 示例可以参考
- 这是最复杂的组件，需要仔细实现

---

### Requirement 31: 创建数据表格组件

**User Story:** As a developer, I want a data table component, so that I can display tabular data.

#### Acceptance Criteria

1. THE DataTable_Component SHALL be based on TanStack Table + ShadCN Table

2. THE DataTable SHALL support:
   - Sorting
   - Filtering
   - Pagination
   - Row selection
   - Column visibility
   - Loading state
   - Empty state

3. THE DataTable SHALL be reusable across features

4. THE DataTable SHALL support Chinese locale for pagination

**⚠️ 重要注意事项:**
- TanStack Table 是 headless 的，需要自己实现 UI
- ShadCN 有 DataTable 示例可以参考
- 这是最复杂的组件，需要仔细实现

---

### Requirement 32: 创建表单组件

**User Story:** As a developer, I want form components, so that I can build forms.

#### Acceptance Criteria

1. THE Form_Components SHALL be based on React Hook Form + Zod + ShadCN Form

2. THE Form SHALL include:
   - `form.tsx` - Form wrapper with validation
   - `form-field.tsx` - Field wrapper with label and error
   - Input fields (text, number, textarea)
   - Select fields
   - Date picker
   - Checkbox and radio
   - File upload

3. THE Form SHALL support:
   - Validation with Zod
   - Error messages in Chinese
   - Loading state
   - Disabled state

**⚠️ 重要注意事项:**
- ShadCN Form 组件已经集成了 React Hook Form
- 使用 Zod 进行类型安全的验证

---

### Requirement 32: 创建表单组件

**User Story:** As a developer, I want form components, so that I can build forms.

#### Acceptance Criteria

1. THE Form_Components SHALL be based on React Hook Form + Zod + ShadCN Form

2. THE Form SHALL include:
   - `form.tsx` - Form wrapper with validation
   - `form-field.tsx` - Field wrapper with label and error
   - Input fields (text, number, textarea)
   - Select fields
   - Date picker
   - Checkbox and radio
   - File upload

3. THE Form SHALL support:
   - Validation with Zod
   - Error messages in Chinese
   - Loading state
   - Disabled state

**⚠️ 重要注意事项:**
- ShadCN Form 组件已经集成了 React Hook Form
- 使用 Zod 进行类型安全的验证

---

### Requirement 33: 迁移现有页面

**User Story:** As a developer, I want existing pages migrated, so that they use new components.

#### Acceptance Criteria

1. THE Migration SHALL follow this order:
   - Login page (简单，作为试点)
   - Dashboard pages
   - List pages (使用新 DataTable)
   - Form pages (使用新 Form)
   - Detail pages

2. THE Migration SHALL be incremental:
   - 一次迁移一个页面
   - 确保功能正常后再迁移下一个

3. THE Migration SHALL preserve existing functionality

**⚠️ 重要注意事项:**
- 不要一次性迁移所有页面
- 先迁移简单页面，积累经验
- 保持 git 提交粒度小，方便回滚

---

### Requirement 33: 迁移现有页面

**User Story:** As a developer, I want existing pages migrated, so that they use new components.

#### Acceptance Criteria

1. THE Migration SHALL follow this order (from simple to complex):
   - Login page (简单，作为试点)
   - Dashboard pages
   - List pages (使用新 DataTable)
   - Form pages (使用新 Form)
   - Detail pages

2. THE Migration SHALL be incremental:
   - 一次迁移一个页面
   - 确保功能正常后再迁移下一个
   - 每个页面迁移后立即验证

3. THE Migration SHALL preserve existing functionality

4. EACH Page_Migration SHALL follow these steps:
   - Create new component file (don't delete old file)
   - Switch to new component in router
   - Verify page functionality
   - Commit code (rollback point)
   - Delete old component file

**⚠️ 重要注意事项:**
- 不要一次性迁移所有页面
- 先迁移简单页面，积累经验
- 保持 git 提交粒度小，方便回滚

---

### Requirement 34: 创建 Steering 规则

**User Story:** As a developer, I want steering rules, so that AI generates consistent code.

#### Acceptance Criteria

1. THE Steering_File SHALL be created at `.kiro/steering/frontend-components.md`

2. THE Steering SHALL include:
   - 组件使用规范
   - 样式编写规范
   - 文件命名规范
   - 禁止事项

3. THE Steering SHALL enforce:
   - 使用 ShadCN UI 组件
   - 使用 Tailwind CSS 类名
   - 禁止自定义 CSS 文件
   - 禁止内联样式（除非必要）
   - 使用 Tailwind v4 的 @theme 配置

**⚠️ 重要注意事项:**
- Steering 规则是防止 AI 乱写代码的关键
- 规则要具体、可执行

### Requirement 23: 样式管理优化

**User Story:** As a developer, I want organized styles, so that they are maintainable and performant.

#### Acceptance Criteria

1. THE Global_CSS SHALL be reduced to only truly global styles:
   - CSS reset
   - Typography base styles
   - Scrollbar styles
   - CSS variables (design tokens)
   - Animation keyframes

2. THE Component_Specific_Styles SHALL be moved to component directories:
   - `.task-form-*` styles → `features/tasks/components/task-form/`
   - `.login-*` styles → `features/auth/components/`

3. THE Ant_Design_Overrides SHALL be minimized:
   - Use `ConfigProvider` token system instead of CSS overrides
   - Remove `!important` where possible
   - Document necessary overrides

4. THE CSS_Variables SHALL be synchronized with `theme.ts`:
   - Single source of truth for design tokens
   - Generate CSS variables from TypeScript

5. WHEN creating new components, THE Styles SHALL be colocated with components using CSS Modules

**⚠️ 重要注意事项:**
- 不要在全局 CSS 中添加组件特定样式
- 使用 Ant Design 的 token 系统而不是 CSS 覆盖
- CSS Modules 可以避免样式冲突

---

## 附录：关键代码示例

### ESLint 配置示例

```javascript
// eslint.config.js 中需要添加的规则
'import/no-restricted-paths': [
  'error',
  {
    zones: [
      // 禁止跨功能模块导入
      {
        target: './src/features/auth',
        from: './src/features',
        except: ['./auth'],
      },
      // ... 其他功能模块
      
      // 强制单向架构
      {
        target: './src/features',
        from: './src/app',
      },
      {
        target: [
          './src/components',
          './src/hooks',
          './src/lib',
          './src/types',
          './src/utils',
        ],
        from: ['./src/features', './src/app'],
      },
    ],
  },
],
```

### 路由懒加载示例

```typescript
// app/router.tsx
import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';

const Dashboard = lazy(() => import('./routes/dashboard'));
const Knowledge = lazy(() => import('./routes/knowledge'));

export const router = createBrowserRouter([
  {
    path: '/dashboard',
    element: (
      <Suspense fallback={<Spinner />}>
        <Dashboard />
      </Suspense>
    ),
  },
  // ...
]);
```

### API 请求文件示例

```typescript
// features/users/api/get-users.ts
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// 类型定义
export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

export type User = z.infer<typeof userSchema>;

// Fetcher 函数
export const getUsers = async (): Promise<User[]> => {
  const data = await apiClient.get('/users');
  return z.array(userSchema).parse(data);
};

// React Query Hook
export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });
};
```
