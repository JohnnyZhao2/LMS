# 仓库指南
用中文回复
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

## 构建、测试与开发命令

### 后端（workdir: `lms_backend/`）
```bash
pip install -r requirements.txt                                    # 安装依赖
python manage.py runserver --settings=config.settings.development  # 启动开发服务器
python manage.py migrate --settings=config.settings.development    # 运行迁移
python manage.py createsuperuser --settings=config.settings.development  # 创建超级用户

# 测试命令
python -m pytest tests/ -v                                         # 运行全部测试
python -m pytest tests/integration/ -v                             # 仅集成测试
python -m pytest tests/properties/ -v                              # 仅属性测试
python -m pytest tests/test_domain_layer.py -v                     # 仅领域层测试
python -m pytest tests/integration/test_exam_task_flow.py -v       # 运行单个测试文件
python -m pytest tests/integration/test_exam_task_flow.py::TestExamTaskFlow::test_xxx -v  # 运行单个测试方法
python -m pytest tests/ -k "keyword" -v                            # 按关键字筛选测试
python -m pytest tests/ --cov=apps --cov-report=html               # 覆盖率报告
python -m pytest tests/ -x                                         # 遇到第一个失败即停止
python -m pytest tests/ --lf                                       # 仅运行上次失败的测试
```

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

### 导入顺序（后端）
```python
# 1. Python 标准库
from typing import Optional, List
from decimal import Decimal
# 2. Django 相关
from django.db import transaction
from django.utils import timezone
# 3. 第三方库
from rest_framework.views import APIView
# 4. 项目核心模块（core/）
from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes
# 5. 其他应用模块（apps/）
from apps.users.models import User
from apps.tasks.models import Task
# 6. 当前应用内模块
from .models import Submission
from .selectors import get_submission_by_id
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
- **测试数据库**：SQLite 内存数据库（`config.settings.test`）
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

## 设计系统使用指南

### 📚 设计系统文件位置

**核心文件（必读）：**
1. **`design-system/corporate-lms/MASTER.md`** — 全局设计系统真理源
   - 完整的颜色系统（Flat Design）
   - 字体系统（当前 Outfit + 推荐 Poppins/Open Sans）
   - 间距、圆角、阴影系统
   - 动画系统（7 种动画类型）
   - 组件规范（Button、Card、Input、Modal）
   - 反模式清单 + 交付前检查清单
   - 40 个共同组件列表

2. **`lms_frontend/src/styles/design-tokens.ts`** — TypeScript 设计令牌
   - 类型安全的颜色、间距、字体、动画配置
   - Tailwind 类名映射
   - CSS 变量映射
   - 辅助函数（`getCSSVar`, `setCSSVar`）

3. **`lms_frontend/src/styles/animations.ts`** — 动画配置
   - 7 种动画类型配置（fadeIn, fadeInUp, scaleIn 等）
   - Framer Motion 变体
   - 交错动画配置
   - 辅助函数（`getAnimationConfig`, `prefersReducedMotion`）

### 🎯 AI 工作流程（强制执行）

**在开始任何 UI/UX 工作之前，必须按以下顺序执行：**

1. **读取全局设计系统**
   ```bash
   # 读取 MASTER.md 了解设计规则
   Read: design-system/corporate-lms/MASTER.md
   ```

2. **检查页面特定覆盖规则**
   ```bash
   # 检查是否存在页面特定的设计规则
   # 例如：design-system/corporate-lms/pages/dashboard.md
   # 如果存在，页面规则会覆盖 MASTER.md 的规则
   Read: design-system/corporate-lms/pages/[page-name].md
   ```

3. **读取设计令牌和动画配置**
   ```bash
   # 了解可用的设计令牌和动画
   Read: lms_frontend/src/styles/design-tokens.ts
   Read: lms_frontend/src/styles/animations.ts
   ```

4. **应用设计系统**
   - 使用 MASTER.md 中定义的颜色、间距、字体
   - 使用 design-tokens.ts 中的类型安全令牌
   - 使用 animations.ts 中的动画配置
   - 遵循组件规范和反模式清单

5. **交付前验证**
   - 对照 MASTER.md 中的"Pre-Delivery Checklist"检查
   - 确保没有违反反模式清单
   - 验证响应式设计（375px, 768px, 1024px, 1440px）

### 💻 代码中使用设计令牌

**使用颜色：**
```typescript
import { designTokens } from '@/styles/design-tokens';

// 方式 1: 使用设计令牌对象
const primaryColor = designTokens.colors.primary; // '#3B82F6'

// 方式 2: 使用 Tailwind 类名
<button className="bg-blue-600 hover:bg-blue-700">按钮</button>

// 方式 3: 使用 CSS 变量
<div style={{ color: 'var(--color-primary)' }}>文本</div>
```

**使用间距和圆角：**
```typescript
import { designTokens } from '@/styles/design-tokens';

// 使用设计令牌
const padding = designTokens.spacing.md; // '16px'
const borderRadius = designTokens.radius.lg; // '8px'

// 使用 Tailwind 类名
<div className="p-4 rounded-lg">内容</div>
```

**使用动画：**
```typescript
import { animations, getAnimationCSS, motionVariants } from '@/styles/animations';

// CSS 动画
const animationCSS = getAnimationCSS('fadeInUp', 'slow', 100);

// Framer Motion
import { motion } from 'framer-motion';

<motion.div variants={motionVariants.fadeInUp}>
  内容
</motion.div>

// 使用 AnimatedContainer 组件
import { AnimatedContainer } from '@/components/ui/animated-container';

<AnimatedContainer animation="fadeInUp" delay={100}>
  内容
</AnimatedContainer>
```

### 🎨 设计系统层级结构

```
design-system/corporate-lms/
├── MASTER.md                    # 全局设计规则（优先级：低）
└── pages/                       # 页面特定覆盖规则（优先级：高）
    ├── dashboard.md             # 仪表盘页面规则
    ├── knowledge.md             # 知识库页面规则
    └── [page-name].md           # 其他页面规则
```

**规则优先级：**
- 如果存在 `pages/[page-name].md`，其规则**覆盖** MASTER.md
- 如果不存在，严格遵循 MASTER.md

### ✅ 交付前检查清单（必须验证）

**视觉质量：**
- [ ] 没有使用 emoji 作为图标（使用 SVG：Lucide/Heroicons）
- [ ] 所有图标来自一致的图标集
- [ ] 悬停状态不会导致布局偏移
- [ ] 颜色匹配设计令牌
- [ ] 字体遵循系统规则

**交互：**
- [ ] 所有可点击元素有 `cursor-pointer`
- [ ] 悬停状态提供清晰的视觉反馈
- [ ] 过渡动画流畅（150-300ms）
- [ ] 焦点状态对键盘导航可见
- [ ] 活动状态提供反馈（scale, color）

**无障碍：**
- [ ] 文本对比度 4.5:1 最低（WCAG AA）
- [ ] 所有图片有 alt 文本
- [ ] 表单输入有标签
- [ ] 颜色不是唯一指示器
- [ ] 尊重 `prefers-reduced-motion`
- [ ] 键盘导航正常工作

**响应式：**
- [ ] 在 375px（移动端）响应式
- [ ] 在 768px（平板）响应式
- [ ] 在 1024px（桌面）响应式
- [ ] 在 1440px（大桌面）响应式
- [ ] 移动端无横向滚动
- [ ] 内容不被固定导航栏遮挡

### 🚫 反模式清单（严禁使用）

**视觉反模式：**
- ❌ 使用 emoji 作为图标 → 使用 SVG 图标（Lucide, Heroicons）
- ❌ 幼稚/玩闹设计 → 保持专业和清晰
- ❌ AI 紫色/粉色渐变 → 避免通用 AI 美学
- ❌ 到处使用重阴影 → 谨慎使用以表现深度
- ❌ 导致布局偏移的悬停效果 → 避免 scale 变换导致布局偏移

**交互反模式：**
- ❌ 缺少 cursor:pointer → 所有可点击元素必须有 cursor:pointer
- ❌ 瞬间状态变化 → 始终使用过渡动画（150-300ms）
- ❌ 不可见的焦点状态 → 焦点状态必须对无障碍可见

**无障碍反模式：**
- ❌ 低对比度文本 → 保持 4.5:1 最低对比度
- ❌ 缺少 alt 文本 → 所有图片需要描述性 alt 文本
- ❌ 无键盘导航 → 所有交互元素必须支持键盘访问
- ❌ 忽略 reduced motion → 尊重 prefers-reduced-motion 偏好

### 📦 共同组件库

**位置：** `lms_frontend/src/components/ui/`

**关键组件（40 个）：**
- `button.tsx` — 多变体按钮（CVA）
- `card.tsx` — 卡片容器
- `input.tsx` — 表单输入
- `dialog.tsx` — 模态对话框
- `dropdown-menu.tsx` — 下拉菜单
- `form.tsx` — 表单组件（React Hook Form）
- `badge.tsx` — 状态徽章
- `avatar.tsx` — 用户头像
- `skeleton.tsx` — 加载状态
- `spinner.tsx` — 加载指示器
- `animated-container.tsx` — 动画包装器
- `data-table/` — 可复用数据表组件
- `toast/sonner.tsx` — Toast 通知

**模式：** shadcn/ui 风格组件（复制粘贴，非 npm 包）

### 🎨 当前设计系统概览

**风格：** Flat Design with Subtle Depth（扁平设计 + 微妙深度）

**颜色：**
- Primary: `#3B82F6` (Blue 600)
- Secondary: `#10B981` (Emerald 500)
- Accent: `#F59E0B` (Amber 500)
- CTA: `#F97316` (Orange 500) — 推荐用于新设计

**字体：**
- 当前：Outfit (Geometric Sans-Serif)
- 推荐：Poppins (标题) + Open Sans (正文)

**动画：**
- fadeIn, fadeInUp, fadeInDown, scaleIn, slideInLeft, slideInRight, shimmer
- 持续时间：fast (0.15s), base (0.2s), slow (0.3s)
- 自动尊重 `prefers-reduced-motion`

**组件变体（Button）：**
- default, destructive, outline, secondary, ghost, link, success
- 尺寸：sm, default, lg, icon

### 🔄 设计系统更新流程

**如果需要更换设计系统：**
1. 更新 `design-system/corporate-lms/MASTER.md`
2. 更新 `lms_frontend/src/styles/design-tokens.ts`
3. 更新 `lms_frontend/src/styles/animations.ts`
4. 更新 `lms_frontend/src/index.css` 中的 CSS 变量
5. AI 会自动读取新的设计系统并应用

**页面特定覆盖：**
- 创建 `design-system/corporate-lms/pages/[page-name].md`
- 定义页面特定的颜色、字体、动画规则
- AI 会优先使用页面规则，其次使用 MASTER.md

<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<usage>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

How to use skills:
- Invoke: Bash("openskills read <skill-name>")
- The skill content will load with detailed instructions on how to complete the task
- Base directory provided in output for resolving bundled resources (references/, scripts/, assets/)

Usage notes:
- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already loaded in your context
- Each skill invocation is stateless
</usage>

<available_skills>

<skill>
<name>canvas-design</name>
<description>Create beautiful visual art in .png and .pdf documents using design philosophy. You should use this skill when the user asks to create a poster, piece of art, design, or other static piece. Create original visual designs, never copying existing artists' work to avoid copyright violations.</description>
<location>project</location>
</skill>

<skill>
<name>code-cleanup</name>
<description>代码清理与重构工具。用于：(1) 发现并删除冗余/重复代码，(2) 识别并清理旧代码与兼容代码，(3) 合并相似逻辑，(4) 统一代码风格。当用户提到"清理代码"、"删除冗余"、"重构"、"统一风格"、"找重复代码"时触发。</description>
<location>project</location>
</skill>

<skill>
<name>internal-comms</name>
<description>A set of resources to help me write all kinds of internal communications, using the formats that my company likes to use. Claude should use this skill whenever asked to write some sort of internal communications (status reports, leadership updates, 3P updates, company newsletters, FAQs, incident reports, project updates, etc.).</description>
<location>project</location>
</skill>

<skill>
<name>mcp-builder</name>
<description>Guide for creating high-quality MCP (Model Context Protocol) servers that enable LLMs to interact with external services through well-designed tools. Use when building MCP servers to integrate external APIs or services, whether in Python (FastMCP) or Node/TypeScript (MCP SDK).</description>
<location>project</location>
</skill>

<skill>
<name>theme-factory</name>
<description>Toolkit for styling artifacts with a theme. These artifacts can be slides, docs, reportings, HTML landing pages, etc. There are 10 pre-set themes with colors/fonts that you can apply to any artifact that has been creating, or can generate a new theme on-the-fly.</description>
<location>project</location>
</skill>

<skill>
<name>web-artifacts-builder</name>
<description>Suite of tools for creating elaborate, multi-component claude.ai HTML artifacts using modern frontend web technologies (React, Tailwind CSS, shadcn/ui). Use for complex artifacts requiring state management, routing, or shadcn/ui components - not for simple single-file HTML/JSX artifacts.</description>
<location>project</location>
</skill>

<skill>
<name>webapp-testing</name>
<description>Toolkit for interacting with and testing local web applications using Playwright. Supports verifying frontend functionality, debugging UI behavior, capturing browser screenshots, and viewing browser logs.</description>
<location>project</location>
</skill>

<skill>
<name>xlsx</name>
<description>"Comprehensive spreadsheet creation, editing, and analysis with support for formulas, formatting, data analysis, and visualization. When Claude needs to work with spreadsheets (.xlsx, .xlsm, .csv, .tsv, etc) for: (1) Creating new spreadsheets with formulas and formatting, (2) Reading or analyzing data, (3) Modify existing spreadsheets while preserving formulas, (4) Data analysis and visualization in spreadsheets, or (5) Recalculating formulas"</description>
<location>project</location>
</skill>

</available_skills>
<!-- SKILLS_TABLE_END -->

</skills_system>
