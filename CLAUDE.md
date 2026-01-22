# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## 项目概览

企业内部培训 LMS（学习管理系统），包含导师-学员关系、应急响应知识库和测验/考试系统。中文界面。

**技术栈：**
- 后端：Django REST Framework（Clean Architecture）
- 前端：React 19 + Vite + TypeScript + Tailwind CSS 4 + Radix UI
- 数据库：PostgreSQL（生产）、SQLite（测试）

## 开发命令

### 后端（工作目录：`lms_backend/`）

```bash
# 开发服务器
python manage.py runserver --settings=config.settings.development

# 数据库迁移
python manage.py migrate --settings=config.settings.development
python manage.py makemigrations --settings=config.settings.development

# 创建超级用户
python manage.py createsuperuser --settings=config.settings.development

# 测试
python -m pytest tests/ -v                                    # 所有测试
python -m pytest tests/integration/ -v                        # 仅集成测试
python -m pytest tests/properties/ -v                         # 仅属性测试
python -m pytest tests/integration/test_exam_task_flow.py -v  # 单个测试文件
python -m pytest tests/ -k "keyword" -v                       # 按关键字筛选
python -m pytest tests/ --cov=apps --cov-report=html          # 覆盖率报告
python -m pytest tests/ -x                                    # 遇到第一个失败即停止
python -m pytest tests/ --lf                                  # 仅运行上次失败的测试
```

### 前端（工作目录：`lms_frontend/`）

```bash
npm install          # 安装依赖
npm run dev          # 启动 Vite 开发服务器
npm run build        # TypeScript 检查 + 生产构建
npm run lint         # ESLint 检查
npm run preview      # 预览生产构建
```

## 架构

### 后端：Clean Architecture + Service 层

**结构：**
```
lms_backend/
├── apps/           # 领域模块（users, knowledge, quizzes, tasks 等）
│   └── [app]/
│       ├── models.py       # Django 模型
│       ├── services.py     # 业务逻辑（继承 BaseService）
│       ├── selectors.py    # 复杂查询（可选，见下方规则）
│       ├── views.py        # API 端点（薄层）
│       └── serializers.py  # 请求/响应序列化
├── core/           # 共享基础设施
│   ├── base_service.py     # BaseService 带请求注入
│   ├── exceptions.py       # BusinessError, ErrorCodes
│   ├── responses.py        # 标准化 API 响应
│   └── pagination.py       # 分页工具
└── config/         # 配置和路由
    └── settings/
        ├── base.py
        ├── development.py
        ├── production.py
        └── test.py
```

**关键模式：**

1. **Service 层（业务逻辑）**
   - 所有服务继承 `BaseService`
   - 构造器注入：`service = MyService(request)`
   - 通过 `self.user` 访问用户，通过 `self.request` 访问请求
   - 使用 `self.validate_not_none()` 和 `self.validate_permission()` 进行验证
   - 抛出 `BusinessError` 表示业务规则违规

2. **Selector 层（复杂查询）**
   - **必须建**：统计/聚合、多表连接（5-10+ 行含 Q/annotate/aggregate）、跨模块读取以打破循环依赖
   - **建议建**：查询 >3 行且被 2+ 处复用、需要统一 select_related/prefetch_related、读模型（列表/搜索/筛选/仪表盘）
   - **不建**：简单一次性查询（≤3 行）、写流程中的临时查询（事务强耦合）
   - **默认策略**：先写在 service 私有 helper，命中任一规则即抽到 `selectors.py`

3. **API 响应格式**
   - 所有响应：`{ code, message, data }`
   - 使用 `core.responses` 工具保持一致性

4. **错误处理**
   ```python
   from core.exceptions import BusinessError, ErrorCodes

   if not user:
       raise BusinessError(
           code=ErrorCodes.RESOURCE_NOT_FOUND,
           message=f'用户 {user_id} 不存在'
       )
   ```

### 前端：基于功能的架构

**结构：**
```
lms_frontend/src/
├── app/                    # 路由和应用壳
├── features/               # 业务模块（按功能隔离）
│   ├── auth/
│   ├── dashboard/
│   ├── knowledge/
│   ├── tasks/
│   └── quizzes/
├── components/ui/          # 共享 UI 组件（40 个组件，shadcn/ui 模式）
├── lib/                    # 工具库
│   ├── api-client.ts       # Axios 包装器带错误处理
│   ├── react-query.ts      # TanStack Query 设置
│   └── utils.ts
└── styles/                 # 设计系统
    ├── design-tokens.ts    # 类型安全的设计令牌
    └── animations.ts       # 动画配置
```

**关键模式：**

1. **组件库**
   - `components/ui/` 中有 40 个共享组件
   - 基于 Radix UI 原语（无头、可访问）
   - 使用 Tailwind CSS 4 样式化
   - 使用 Class Variance Authority (CVA) 管理变体
   - 模式：shadcn/ui 风格（复制粘贴，非 npm 包）

2. **状态管理**
   - TanStack Query 用于服务器状态
   - React Hook Form + Zod 用于表单状态
   - useState/useReducer 用于本地状态

3. **API 客户端**
   ```typescript
   import { apiClient } from '@/lib/api-client';
   import { ApiError } from '@/lib/api-client';

   try {
     await apiClient.createTask(data);
   } catch (error) {
     if (error instanceof ApiError) {
       toast.error(error.message);
     }
   }
   ```

## 设计系统

**位置：** `design-system/corporate-lms/MASTER.md`（全局规则）+ `design-system/corporate-lms/pages/[页面].md`（页面特定覆盖）

**任何 UI/UX 工作前：**
1. 阅读 `design-system/corporate-lms/MASTER.md`
2. 检查 `design-system/corporate-lms/pages/[页面名称].md` 中的页面特定覆盖
3. 使用 `lms_frontend/src/styles/design-tokens.ts` 中的设计令牌
4. 使用 `lms_frontend/src/styles/animations.ts` 中的动画
5. 对照 MASTER.md 中的交付前检查清单验证

**当前设计：**
- 风格：扁平设计 + 微妙深度
- 颜色：主色 `#3B82F6`（蓝色）、辅助色 `#10B981`（翠绿）、强调色 `#F59E0B`（琥珀）
- 字体：Outfit（几何无衬线字体）
- 动画：fadeIn、fadeInUp、scaleIn 等（尊重 `prefers-reduced-motion`）

**使用方式：**
```typescript
import { designTokens } from '@/styles/design-tokens';
import { motionVariants } from '@/styles/animations';

const primaryColor = designTokens.colors.primary;
<motion.div variants={motionVariants.fadeInUp}>内容</motion.div>
```

## 用户角色与权限

**5 种角色：**
1. **STUDENT**（学员）- 默认角色，查看知识、完成任务、参加测验
2. **MENTOR**（导师）- 创建任务/测验、监控学员进度、批改提交
3. **DEPT_MANAGER**（室经理）- 部门级监督 + 导师权限
4. **TEAM_MANAGER**（团队经理）- 团队分析、跨部门可见性
5. **ADMIN**（管理员）- 完全系统访问

**在视图中检查权限：**
```python
from apps.users.permissions import get_current_role, UserRole

role = get_current_role(request)
if role not in [UserRole.MENTOR, UserRole.ADMIN]:
    raise BusinessError(code=ErrorCodes.PERMISSION_DENIED, message='无权限')
```

## 领域模型

**核心实体：**
- **User** - 基于员工（employee_id）、部门、导师关系
- **Knowledge** - 两种类型：EMERGENCY（结构化应急响应）和 OTHER（通用）
- **Task** - 结合知识文档 + 测验，分配给学员
- **Quiz** - 两种类型：PRACTICE（练习）和 EXAM（考试）
- **Question** - 多种类型：单选、多选、判断、简答
- **Submission** - 学员测验提交及批改
- **SpotCheck** - 随机评估系统

## 代码风格

### 导入顺序

**后端：**
```python
# 1. Python 标准库
from typing import Optional, List
# 2. Django
from django.db import transaction
# 3. 第三方库
from rest_framework.views import APIView
# 4. 项目核心
from core.base_service import BaseService
# 5. 其他应用
from apps.users.models import User
# 6. 当前应用
from .models import Task
```

**前端：**
```typescript
// 1. React/外部库
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
// 2. 内部（@/ 别名）
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
// 3. 相对路径（同模块）
import { UserForm } from './user-form';
```

### 命名规范

**后端：**
- 类名：PascalCase `UserManagementService`
- 函数：snake_case `get_user_by_id`
- 常量：UPPER_SNAKE_CASE `ERROR_CODES`
- 私有方法：`_validate_access`
- 服务：后缀 `Service`
- 选择器：前缀 `get_` 或 `list_`

**前端：**
- 组件：PascalCase `LoginForm`
- 文件：kebab-case `login-form.tsx`
- Hook：前缀 `use` - `useAuth`
- 类型：PascalCase `User`、`ApiResponse`

## 测试

**框架：** pytest + pytest-django + hypothesis + factory-boy

**测试数据库：** SQLite 内存（`config.settings.test`）

**测试结构：**
```
lms_backend/tests/
├── integration/        # 集成测试
├── properties/         # 基于属性的测试（hypothesis）
└── test_domain_layer.py
```

## 全局原则

- **无向后兼容** - 可自由破坏旧格式
- **避免冗余** - 简化和抽象，尽可能删除
- **组件拆分** - 超过 200 行或嵌套渲染函数时提取
- **中文语言** - 所有 UI 文本和用户面向消息使用中文
- **类型安全** - 严格 TypeScript，禁用 `any`，使用 Zod 验证

## 环境配置

**后端：** 复制 `lms_backend/.env.example` 到 `lms_backend/.env` 并配置：
- 数据库凭据（生产环境使用 PostgreSQL）
- SECRET_KEY（生成安全密钥）
- DEBUG=True 用于开发

**Settings 模块：**
- `config.settings.development` - 开发
- `config.settings.production` - 生产
- `config.settings.test` - 测试（SQLite 内存）

## API 速率限制

- 匿名：100 请求/小时
- 已认证：1000 请求/小时
- 认证端点：10 请求/分钟
