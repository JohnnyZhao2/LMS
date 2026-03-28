# 仓库指南
用中文回复，言简意赅，不要废话
**No backward compatibility** - Break old formats freely

## 项目结构
- `lms_backend/` — Django REST API（Clean Architecture）
  - `apps/` — 领域模块（users, knowledge, questions, quizzes, tasks, submissions, spot_checks, notifications, dashboard）
  - `core/` — 共享基类与工具（BaseService, exceptions, responses, pagination）
  - `config/` — 配置与路由
  - `tests/` — 集成测试 + 属性测试
- `lms_frontend/` — React 19 + Vite + TypeScript + Tailwind CSS 4
  - `src/app/` — 路由与应用壳
  - `src/features/` — 业务模块（按功能隔离）
  - `src/components/ui/` — 共享 UI 组件（基于 Radix UI）
  - `src/lib/` — 工具库（api-client, react-query, utils）


### 前端（workdir: `lms_frontend/`）
```bash
npm install          # 安装依赖
npm run dev          # 启动 Vite 开发服务器
npm run build        # TypeScript 检查 + 生产构建
npm run lint         # ESLint 检查
npm run preview      # 预览生产构建
```

## 代码风格

### 导入顺序（前端）
```typescript
// 1. React/外部库
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
// 2. 内部模块（@/ 别名）
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
// 3. 相对路径（同模块内）
import { UserForm } from './user-form';
```

### 命名规范

#### 后端
- **类名**：大驼峰 `UserManagementService`, `TaskAssignment`
- **函数/方法**：小写下划线 `get_user_by_id`, `validate_permission`
- **常量**：全大写下划线 `ERROR_CODES`, `MAX_RETRY_COUNT`
- **私有方法**：前缀单下划线 `_get_user`, `_validate_access`
- **Service 类**：后缀 `Service` — `QuizService`, `SubmissionService`
- **Selector 函数**：前缀 `get_` 或 `list_` — `get_task_by_id`, `list_active_users`

#### 前端
- **组件**：大驼峰 PascalCase `LoginForm`, `TaskCard`
- **文件名**：kebab-case `login-form.tsx`, `task-card.tsx`
- **Hook**：前缀 `use` — `useAuth`, `useTasks`
- **类型/接口**：大驼峰 PascalCase `User`, `TaskFormValues`, `ApiResponse`
- **常量**：全大写下划线或 PascalCase `API_BASE_URL`, `ROUTES`

### TypeScript 规范
- **严格模式**：启用所有 strict 检查（tsconfig.json 已配置）
- **类型优先**：优先使用 `interface` 定义对象类型，用 `type` 定义联合类型和工具类型
- **避免 any**：严禁使用 `any`，使用 `unknown` 或具体类型
- **类型推导**：利用 TypeScript 推导，无需显式标注明显类型
- **Zod 验证**：表单使用 Zod schema 定义验证逻辑

### 错误处理

#### 后端
```python
# 使用 BusinessError 抛出业务异常
from core.exceptions import BusinessError, ErrorCodes

if not user:
    raise BusinessError(
        code=ErrorCodes.RESOURCE_NOT_FOUND,
        message=f'用户 {user_id} 不存在'
    )

# Service 层使用 validate_not_none 和 validate_permission
user = self.validate_not_none(user, f'用户 {user_id} 不存在')
self.validate_permission(can_edit, '无权限编辑此资源')
```

#### 前端
```typescript
// API 调用统一处理 ApiError
import { ApiError } from '@/lib/api-client';
import { toast } from 'sonner';

try {
  await apiClient.createTask(data);
  toast.success('创建成功');
} catch (error) {
  if (error instanceof ApiError) {
    toast.error(error.message);
  } else {
    toast.error('操作失败');
  }
}
```

## 测试指南
- **后端框架**：pytest + pytest-django + hypothesis + factory-boy
- **测试位置**：`lms_backend/tests/`（`integration/` 和 `properties/` 子目录）
- **测试命名**：`test_*.py`，测试类 `Test*`，测试方法 `test_*`
- **测试数据库**：沿用 `config.settings.development`，Django 自动创建测试库（默认 `test_<DB_NAME>`）
- **前端测试**：暂无配置，如需添加请显式引入

## 代理特定说明
- **禁止向后兼容**：触及旧代码时优先干净重构
- **角色相关 UI**：检查 student/mentor/dept_manager/admin/team_manager 共享行为
- **API 响应格式**：统一 `{ code, message, data }` 结构

## 后端 Selector 规则
- **必须建**：统计/聚合/多表复杂查询（≈5–10 行+，含 Q/annotate/aggregate/subquery）、跨模块读取需要打破循环依赖
- **建议建**：查询 >3 行且会被 2+ 处复用、需要统一 select_related/prefetch_related、读模型（列表/搜索/筛选/仪表盘）
- **不建**：简单一次性查询（≤3 行）、写流程中临时查询（事务强耦合）
- **默认策略**：先写在 service 私有 helper，命中任一规则即抽到 `selectors.py`

## 全局原则
- 不做向后兼容，旧格式可直接破坏性调整
- 避免冗余与重复代码，优先简化与抽象；能删除就删除
- 组件拆分：超过 200 行或嵌套渲染函数时提取子组件

## 前端审美原则
- 避免"AI 模板感"与泛化设计，输出需有鲜明风格与语境个性
- 字体：选择独特、有审美张力的字体，避免 Inter/Roboto/Arial/系统默认字体
- 配色与主题：确立明确风格，使用 CSS 变量统一；主色占据视觉主导，配以锐利强调色
- 动效：优先 CSS 动画；在 React 场景可用 framer-motion；注重高影响时刻
- 背景：营造氛围与层次，使用渐变、几何图形或环境化纹理，避免单色铺底
- 禁止：紫色渐变白底、可预期的布局与组件套路、无差别的模板化风格
