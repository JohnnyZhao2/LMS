# LMS

企业内部学习管理系统，覆盖“学、练、考、评”全流程。

当前仓库以前后端分离方式组织：

- `lms_backend/`：Django REST API + MySQL
- `lms_frontend/`：React 19 + Vite + TypeScript + Tailwind CSS 4

后续如果继续精简文档，以本文件为主，其他 README/说明文档建议逐步归档或删除。
前端说明文档归档在 `lms_frontend/docs/`。

## 核心能力

- 用户认证与工作台切换
- 基于 Django `auth.Group` + `auth.Permission` + `RoleProfile` 的角色权限与数据范围控制
- 知识库、题库、试卷管理
- 学习/练习/考试任务分配
- 提交记录、自动评分、人工阅卷
- 抽查记录、仪表盘、操作日志

## 目录结构

```text
LMS/
├── lms_backend/
│   ├── apps/         # 业务模块
│   ├── config/       # Django 配置、路由、settings
│   ├── core/         # 共享基类、异常、响应、分页
│   └── tests/        # 集成测试
├── lms_frontend/
│   ├── docs/         # 前端规范
│   ├── src/app/      # 应用壳、路由
│   ├── src/features/ # 按业务拆分的前端模块
│   ├── src/components/ui/
│   └── src/lib/
└── README.md
```

## 技术栈

### 后端

- Python 3.9+
- Django 4.2
- Django REST Framework
- MySQL 8.0
- drf-spectacular
- pytest / pytest-django

### 前端

- React 19
- Vite 7
- TypeScript 5
- Tailwind CSS 4
- React Router
- TanStack Query
- Radix UI
- Zod

## 快速开始

### 1. 准备环境

建议本机安装：

- Python 3.9+
- Node.js 20+
- MySQL 8.0

先创建数据库：

```bash
mysql -u root -p -e "CREATE DATABASE lms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 2. 配置环境变量

说明：

- 后端开发读取本地 `lms_backend/.env.development`
- 前端开发读取本地 `lms_frontend/.env.development`
- 后端生产读取仓库内 `lms_backend/.env.production`
- 前端生产构建读取仓库内 `lms_frontend/.env.production`
- `manage.py` 默认使用 `config.settings.development`
- `python manage.py` 会按 settings 自动选择对应环境文件
- `pytest` 默认走 `config.settings.test`，复用 `.env.development` 连接本机 MySQL（自动隔离到 `test_<DB_NAME>`，开启 `--reuse-db`；新增迁移后加 `--create-db`）
- 前端默认请求 `http://127.0.0.1:8000/api`

### 3. 启动后端

```bash
conda activate lms
cd lms_backend
pip install -r requirements.txt
python manage.py migrate --settings=config.settings.development
python manage.py init_data --settings=config.settings.development
python manage.py runserver
```

说明：

- 权限实体基于 Django `auth.Group`、`auth.Permission` 与轻量扩展模型 `RoleProfile`（承载显示名、数据范围及启停状态），可配置目录与资源策略在 `apps/authorization/registry.py` 声明
- `migrate` 后会自动同步 `auth_permission`、初始化内置角色配置与日志策略目录
- `init_data` 只初始化部门与系统内置角色，不会创建默认超管账号

启动后可访问：

- API 根路径：`http://127.0.0.1:8000/api`
- Swagger：`http://127.0.0.1:8000/api/docs/`
- Redoc：`http://127.0.0.1:8000/api/redoc/`

### 4. 启动前端

```bash
cd lms_frontend
npm install
npm run dev
```

常用命令：

```bash
npm run build
npm run lint
npm run preview
```

## 测试

后端测试位于 `lms_backend/tests/`，默认走 `config.settings.test`，复用 `.env.development` 的本机 MySQL 并自动创建测试库 `test_<DB_NAME>`（执行完整迁移）。

```bash
cd lms_backend
python -m pytest
```

常见单测入口：

```bash
python -m pytest tests/integration/test_auth_refresh.py -q -x
python -m pytest tests/integration/test_api_contracts.py -q -x
python -m pytest tests/integration/test_dashboard.py -q -x
```

说明：

- 运行 Django 测试和迁移前，需要本机 MySQL 可连接
- 前端当前没有成体系测试基建，只有少量零散测试文件

## 开发约定

- 不做向后兼容，旧格式可直接破坏性调整
- API 响应统一为 `{ code, message, data }`
- 前端按 `features` 组织业务代码
- 后端复杂读查询优先抽到 `selectors.py`
- 复杂业务链路优先补模块级、流程级注释，不写“逐行翻译式”注释

## 新增功能与权限同步

权限实体使用 Django 原生 `auth.Permission`（自定义业务权限在对应 Model `Meta.permissions` 中声明），`lms_backend/apps/authorization/registry.py` 维护可配置白名单、权限依赖（`PERMISSION_IMPLIES`）与资源/范围策略：

1. **后端新增权限**：标准模型增删改查权限由 Django 迁移自动写入 `auth_permission`，自定义权限在模型 `Meta.permissions` 声明并生成迁移；然后在 `apps/authorization/registry.py` 将权限码纳入可配置目录并绑定资源策略（如需范围隔离）。
2. **角色扩展与数据范围**：系统内置 `ADMIN`、`DEPT_MANAGER`、`MENTOR` 三类互斥岗位，同时支持在「角色授权」页面新建可叠加的自定义专项角色；每个角色通过 `RoleProfile` 配置 `data_scope`（`ALL`/`DEPT`/`CUSTOM_DEPT`/`SELF`），`AuthorizationEngine` 按具体权限码聚合所属激活角色的范围。
3. **后端接口校验**：在 View / Service 中通过 `get_engine(request)` 调用 `require_permission`、`enforce` 或 `scope_filter`。
4. **前端接入**：
   - 路由与菜单：在 `lms_frontend/src/app/route-registry.tsx` 配置 `requiredPermissions`。
   - 页面按钮/区块：使用 `useAuth().hasCapability(...)` 判断授权中心同步下发的 `capabilities`。
   - 模块名称、中文标签与前端依赖映射在 `lms_frontend/src/features/authorization/lib/permission-presentation.ts` 按需补充。
5. **已有角色授权说明**：超管实时拥有全部权限；其他内置或自定义角色的权限由超管在「角色授权」页面按需开关与配置数据范围。

## 改动同步
查看本次提交改了哪些文件：

```bash
git show --name-only --stat
```

公司电脑手动替换对应文件后执行：

```bash
cd lms_backend
conda activate lms
python manage.py migrate
```

## 当前模块

后端已启用模块：

- `users`
- `authorization`
- `auth`
- `tags`
- `knowledge`
- `questions`
- `quizzes`
- `tasks`
- `grading`
- `submissions`
- `spot_checks`
- `dashboard`
- `activity_logs`

## 清理建议

仓库里仍有一批历史文档、设计稿、模板 README 和本地产物，后续可以继续精简。建议优先保留：

- 根目录 `README.md`
- `AGENTS.md`
- 真正仍在维护的设计/规范文档

其余说明文件可视内容合并后再删。
