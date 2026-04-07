# LMS

企业内部学习管理系统，覆盖“学、练、考、评”全流程。

当前仓库以前后端分离方式组织：

- `lms_backend/`：Django REST API + MySQL
- `lms_frontend/`：React 19 + Vite + TypeScript + Tailwind CSS 4

后续如果继续精简文档，以本文件为主，其他 README/说明文档建议逐步归档或删除。

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
│   ├── apps/         # 业务模块
│   ├── config/       # Django 配置、路由、settings
│   ├── core/         # 共享基类、异常、响应、分页
│   └── tests/        # 集成测试
├── lms_frontend/
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

先复制模板文件：

```bash
cp lms_backend/.env.example lms_backend/.env
cp lms_frontend/.env.example lms_frontend/.env
```

若对接统一认证扫码登录，建议按环境直接切换：

```bash
cp lms_backend/.env.test lms_backend/.env   # 测试
cp lms_backend/.env.prod lms_backend/.env   # 生产
```

说明：

- 后端统一读取 `lms_backend/.env`
- 前端本地环境变量放在 `lms_frontend/.env`
- `manage.py` 默认使用 `config.settings.development`
- `pytest` 也默认走开发配置
- 前端默认请求 `http://127.0.0.1:8000/api`

### 3. 启动后端

```bash
cd lms_backend
pip install -r requirements.txt
python manage.py migrate --settings=config.settings.development
python manage.py init_data --settings=config.settings.development
python manage.py runserver
```

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
