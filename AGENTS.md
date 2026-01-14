# 仓库指南
用中文回复
**No backward compatibility** - Break old formats freely

## 项目结构
- `lms_backend/` — Django REST API（Clean Architecture）
  - `apps/` — 领域模块（users, knowledge, questions, quizzes, tasks, submissions, spot_checks, notifications, dashboard）
  - `core/` — 共享基类（BaseRepository, BaseService, exceptions, permissions）
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

# 测试命令
python -m pytest tests/ -v                                         # 运行全部测试
python -m pytest tests/integration/ -v                             # 仅集成测试
python -m pytest tests/properties/ -v                              # 仅属性测试
python -m pytest tests/test_domain_layer.py -v                     # 仅领域层测试
python -m pytest tests/integration/test_exam_task_flow.py -v       # 运行单个测试文件
python -m pytest tests/integration/test_exam_task_flow.py::TestExamTaskFlow::test_xxx -v  # 运行单个测试方法
python -m pytest tests/ -k "keyword" -v                            # 按关键字筛选测试
python -m pytest tests/ --cov=apps --cov-report=html               # 覆盖率报告
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

### 后端（Python/Django）
- **PEP 8** 风格，文件/函数 `snake_case`，类 `PascalCase`
- **类型提示**：所有函数参数和返回值必须有类型注解
- **Docstring**：服务层方法必须包含 Args/Returns/Raises 文档
- **模块命名**：`models.py`, `repositories.py`, `services.py`, `views/`, `serializers.py`
- **异常处理**：使用 `core.exceptions.BusinessError` 抛出业务异常，包含 `code` 和 `message`
- **分层架构**：View → Service → Repository → Model，业务逻辑只在 Service 层

### 前端（TypeScript/React）
- **文件命名**：`kebab-case`（如 `user-list.tsx`, `api-client.ts`）
- **组件命名**：`PascalCase`（如 `UserList`, `KnowledgeDetail`）
- **变量命名**：`camelCase`
- **导入路径**：使用 `@/` 别名（如 `@/components/ui`, `@/features/auth`）
- **类型定义**：接口用 `interface`，联合类型用 `type`；导出类型与实现分离
- **错误处理**：API 错误使用 `ApiError` 类，UI 层用 `sonner` toast 展示
- **状态管理**：服务端状态用 `@tanstack/react-query`，本地状态用 `useState`/`useReducer`
- **表单**：使用 `react-hook-form` + `zod` 验证

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

## 测试指南
- **后端框架**：pytest + pytest-django + hypothesis + factory-boy
- **测试位置**：`lms_backend/tests/`（`integration/` 和 `properties/` 子目录）
- **测试命名**：`test_*.py`，测试类 `Test*`，测试方法 `test_*`
- **测试数据库**：SQLite 内存数据库（`config.settings.test`）
- **前端测试**：暂无配置，如需添加请显式引入

## 代理特定说明
- **禁止向后兼容**：触及旧代码时优先干净重构
- **数据库字段变更**：同步更新 Model → Serializer → Service → 前端类型，全局搜索引用
- **角色相关 UI**：检查 student/mentor/dept_manager/admin/team_manager 共享行为
- **API 响应格式**：统一 `{ code, message, data }` 结构

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
<name>frontend-design</name>
<description>Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beautifying any web UI). Generates creative, polished code and UI design that avoids generic AI aesthetics.</description>
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
