### 📘 Project Best Practices

#### 1. Project Purpose
本项目是一个学习管理系统（LMS），包含后端（Django + DRF）和前端（Vite + React + TypeScript）。核心领域包括知识库、题库、试卷、任务分发与完成、抽查、评分及统计分析，支持五种角色（学员、导师、室经理、管理员、团队经理）的访问控制与数据范围隔离。

#### 2. Project Structure
- Monorepo：
  - lms_backend/ Django 项目（API 服务，RBAC，业务应用）
  - lms_frontend/ 前端应用（Vite + React + TS）
- 后端关键目录：
  - config/settings/{base,development,production,test}.py 环境配置
  - apps/* 按业务子域划分（users, knowledge, questions, quizzes, tasks, submissions, spot_checks, notifications, analytics）
  - core/* 通用能力（权限、异常、分页、mixin、工具）
  - tests/{integration,properties,unit} 测试目录
- 前端关键目录：
  - src/app/ 应用层（router/provider/routes）
  - src/features/* 按功能模块组织（auth, dashboard, knowledge, questions, quizzes, spot-checks, submissions, tasks, users, test-center...）
  - src/components/ui/* 共享基础 UI 组件
  - src/lib/* 第三方库封装（api-client, react-query, dayjs, token-storage）
  - src/config/* 全局配置（routes, index）
  - src/testing/* 测试工具与 mocks（若需要扩展）
- 入口文件：
  - 后端 manage.py，config/urls.py
  - 前端 src/main.tsx + src/app/app.tsx，vite.config.ts

#### 3. Test Strategy
- 后端：
  - 框架：pytest + Django（pytest.ini 已配置 DJANGO_SETTINGS_MODULE=config.settings.test）
  - 目录结构：lms_backend/tests/{integration,properties,unit}
  - 命名：test_*.py / *_tests.py
  - 类型：
    - unit：模型方法、服务层 services、序列化器验证
    - integration：端到端业务流程（任务创建、权限流、提交与评分等）
    - properties：Hypothesis 属性测试（边界覆盖与随机探索）
  - Mock：优先使用工厂/fixtures；复杂依赖隔离在 services 层
  - 覆盖率：关键业务路径（RBAC、软删除、时间窗口）必须覆盖
- 前端：
  - 当前未检入测试。新代码建议使用 Vitest + Testing Library，测试与组件/模块同级放置，统一至 src/testing/ 的公共 mock 工具

#### 4. Code Style
- 后端（Python/Django/DRF）：
  - 命名：下划线命名（snake_case）；布尔 is_ 前缀（is_active, is_deleted）；时间 _at 后缀；外键字段 *_id
  - 模型：使用 core/mixins（TimestampMixin/SoftDeleteMixin/CreatorMixin）提供通用字段
  - 文档：模型 docstring 描述用途、字段、关联与业务规则；序列化器区分列表与详情视图
  - 视图：业务逻辑放 services.py；视图保持薄；复杂查询使用 select_related/prefetch_related；权限通过权限类与 DataScope 统一控制
  - 错误处理：统一响应格式（code/message/details）；使用自定义异常与错误码；HTTP 状态码语义清晰
  - 依赖：使用 DRF、SimpleJWT、drf-spectacular（OpenAPI）
- 前端（TypeScript/React）：
  - 组织：feature-first；避免跨 feature 导入；路径别名 @/；组件按职责拆分
  - 命名：组件 PascalCase，文件 kebab-case 或 PascalCase；API 文件遵循 get-xxx.ts / create-xxx.ts 等动作前缀
  - 数据：React Query 管理服务端状态；本地 UI 状态优先 useState/useReducer；Context 仅用于低频全局状态
  - 样式：Tailwind + 模块化样式可并用；主题变量集中管理；避免臃肿内联样式
  - 注释：保持简洁；复杂逻辑和公共工具函数要有注释或 JSDoc

#### 5. Common Patterns
- 后端：
  - RBAC 与数据范围隔离：基于角色的权限与数据可见性控制
  - 软删除：关键数据统一软删（is_deleted），避免硬删除丢失历史
  - 资源/任务分离：知识、题目、试卷等资源先创建；任务作为分配行为后续发布
  - 服务层：apps/*/services.py 封装业务逻辑，视图层仅编排
  - 序列化器分层：列表/详情/创建/更新可区分不同 Serializer，明确定义 read_only / write_only
- 前端：
  - feature 模块化：api/hooks/components/stores/types/utils 分层
  - API 封装：src/lib/api-client.ts 统一 Axios/Fetch 实例；src/lib/react-query.ts 统一 QueryClient
  - 路由：惰性加载路由组件；受保护路由通过 app 层守卫
  - 设计约束：避免跨 feature 直接依赖；必要时通过应用层组合

#### 6. Do's and Don'ts
- ✅ Do
  - 后端：
    - 使用 mixins 与统一模型规范（snake_case、*_id、is_、*_at）
    - 权限与数据范围在权限类/服务层实现，不在视图中直接写散乱逻辑
    - 复杂查询显式优化（select_related/prefetch_related）
    - 数据库字段变更同步更新 models/serializers/services/前端类型与使用点，并做全局搜索替换
    - 将业务规则转化为可测试的单元/属性/集成测试
  - 前端：
    - 遵循 feature-first 结构，使用 @/ 路径别名
    - 服务端状态用 React Query；保持组件纯粹与可测试
    - UI 组件复用放在 src/components/ui；业务组件留在 feature 内
    - 使用���一错误处理与加载/空状态组件
- ❌ Don't
  - 在视图中写复杂业务或直接数据操作，绕过服务层
  - 硬删除关键数据；绕过软删除策略
  - 跨 feature 导入内部实现；在组件/feature 内创建自定义 mocks 目录（统一放在 src/testing/）
  - 引入调试残留（print/console.log/debugger）或无意义注释

#### 7. Tools & Dependencies
- 后端：
  - Django 4.2+、DRF 3.14+、SimpleJWT、drf-spectacular
  - pytest（integration/properties/unit），pytest.ini 已配置测试路径与设置
  - 配置分层：base/development/production/test
- 前端：
  - Vite、React、TypeScript、React Router、React Query、Day.js、Tailwind
  - tsconfig 路径别名 @/
  - vite.config.ts 项目构建与开发配置
- 本地运行与开发：
  - 后端：manage.py、settings 按环境切换；推荐使用 .env / 环境变量注入敏感配置
  - 前端：pnpm/yarn/npm 安装依赖，Vite dev server 启动；确保 API 基础 URL 配置正确

#### 8. Other Notes
- 全局原则：No backward compatibility — 当发现设计问题或冗余时，优先直接重构/重写，而不是扩展兼容逻辑
- 字段依赖清查必做：新增/重命名/删除字段后必须全局搜索，更新后端（models/serializers/views/services/permissions）与前端类型/调用/文档
- 模型与数据库一致性：变更数据库字段结构时，必须同步更新 Django 模型、序列化器与前端类型；本地验证可直接用 MCP SQL 工具，协作与生产保留迁移
- API 设计：使用复数资源与连字符；嵌套资源用路径参数；错误码与错误响应格式统一
- 访问控制：RBAC 与数据范围隔离必须在服务层和权限类中保持一致性；涉及多角色功能调整时检查所有共享部分
- 前端审美与交互：拒绝通用“AI 风格”，强调主题化、统一变量、动画节奏与背景层次；在组件库与主题中沉淀复用
