# LMS

企业内部学习管理系统，覆盖“学、练、考、评”全流程。

当前仓库以前后端分离方式组织：

- `lms_backend/`：Django REST API + MySQL
- `lms_frontend/`：React 19 + Vite + TypeScript + Tailwind CSS 4

后续如果继续精简文档，以本文件为主，其他 README/说明文档建议逐步归档或删除。
前后端说明文档现分别归档在 `lms_backend/docs/` 与 `lms_frontend/docs/`。

## 核心能力

- 用户认证与角色切换
- 角色权限与用户级权限覆盖
- 知识库、题库、试卷管理
- 学习/练习/考试任务分配
- 提交记录、自动评分、人工阅卷
- 抽查记录、仪表盘、操作日志

## 目录结构

```text
LMS/
├── lms_backend/
│   ├── docs/         # 后端维护/设计文档
│   ├── apps/         # 业务模块
│   ├── config/       # Django 配置、路由、settings
│   ├── core/         # 共享基类、异常、响应、分页
│   └── tests/        # 集成测试
├── lms_frontend/
│   ├── docs/         # 前端规范/ADR/生成文档
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
- pytest / pytest-django / hypothesis / factory-boy

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
- `pytest` 默认走 `config.settings.test`，不需要额外 env 文件
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

- `migrate` 后会自动同步权限目录与日志策略目录
- `init_data` 只初始化部门、角色和权限，不会创建默认超管账号
- 不需要额外手动执行 `sync_authorization`

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

后端测试位于 `lms_backend/tests/`，默认使用开发配置并自动创建测试库 `test_<DB_NAME>`。

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
