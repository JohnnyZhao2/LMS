# 仓库指南

## 项目结构与模块组织
- `lms_backend/` 为 Django REST API。关键区域：`apps/`（领域模块，如 `users`、`knowledge`、`tasks`）、`core/`（共享工具）、`config/`（配置与路由）、`tests/`（集成测试 + 性质测试）。
- `lms_frontend/` 为 React + Vite 应用。源码位于 `lms_frontend/src/`，其中 `app/` 用于路由与应用壳，`features/` 为业务模块，`components/ui/` 为共享 UI。
- 仓库级文档（例如 `NAMING_CONVENTIONS.md`、`project structure.md`）描述命名与架构规范。

## 构建、测试与开发命令
后端（在 `lms_backend/` 目录执行）：
- `pip install -r requirements.txt` —— 安装 API 依赖。
- `python manage.py runserver --settings=config.settings.development` —— 本地启动 API。
- `python -m pytest tests/ -v` —— 运行全部后端测试。

前端（在 `lms_frontend/` 目录执行）：
- `npm install` —— 安装 UI 依赖。
- `npm run dev` —— 启动 Vite 开发服务器。
- `npm run build` —— 类型检查并构建生产资源。
- `npm run lint` —— 运行 ESLint。

## 编码风格与命名约定
- 后端：遵循 PEP 8；文件/函数用 `snake_case`，类用 `PascalCase`；模块命名如 `services.py`、`repositories.py`。
- 前端：文件名用 `kebab-case`（例如 `task-list.tsx`），组件用 `PascalCase`，变量用 `camelCase`；路由路径使用 `kebab-case` 与 `ROUTES` 常量。
- 前端 `src/` 模块优先使用 `@/` 导入。

## 前端规范参考（轻量）
- 组件与样式规范：`components-and-styling.md`
- 项目结构约定：`project structure.md`
- 工程与代码标准：`project-standards.md`

## 测试指南
- 后端使用 `pytest`、`pytest-django`、`hypothesis`、`factory-boy`。
- 测试位于 `lms_backend/tests/`，命名为 `test_*.py`（包括 `tests/integration/` 与 `tests/properties/`）。
- 未提供前端测试方案；如需添加，请显式引入相关工具。

## 提交与拉取请求指南
- 历史提交信息为简短描述（常为中文），无固定规范；保持简洁与聚焦。
- PR 需包含：摘要、测试说明（运行的命令）、关联 Issue（如有）、UI 变更截图。

## 代理特定说明
- 避免向后兼容补丁；触及旧代码时优先进行干净重构。
- 修改数据库字段时，更新 Django 模型、序列化器、服务与前端类型，并全局搜索更新引用。
- 修改基于角色的 UI 时，检查角色间共享行为（student、mentor、dept manager、admin、team manager）。

## 全局原则
- 不做向后兼容，旧格式可直接破坏性调整。
- 避免冗余与重复代码，优先简化与抽象；能删除就删除。

## 前端审美原则
- 避免“AI 模板感”与泛化设计，输出需有鲜明风格与语境个性。
- 字体：选择独特、有审美张力的字体，避免 Inter/Roboto/Arial/系统默认字体。
- 配色与主题：确立明确风格，使用 CSS 变量统一；主色占据视觉主导，配以锐利强调色；可参考 IDE 主题或文化语境。
- 动效：优先 CSS 动画；在 React 场景可用 Motion；注重高影响时刻（如首屏加载与分段揭示），而非零散微动效。
- 背景：营造氛围与层次，使用渐变、几何图形或环境化纹理，避免单色铺底。
- 禁止：紫色渐变白底、可预期的布局与组件套路、无差别的模板化风格。
