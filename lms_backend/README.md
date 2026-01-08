# LMS 学习管理系统 - 后端 API

企业级学习管理系统后端，实现"学、练、考、评"能力闭环。

## 技术栈

### 核心框架
- **Python** 3.9+
- **Django** 4.2
- **Django REST Framework** 3.14
- **MySQL** 8.0

### 认证与安全
- **djangorestframework-simplejwt** 5.3+ - JWT 认证
- **django-cors-headers** 4.3+ - 跨域支持

### API 文档
- **drf-spectacular** 0.27+ - OpenAPI 3.0 文档生成

### 测试框架
- **pytest** 7.4+ - 测试框架
- **pytest-django** 4.7+ - Django 集成
- **pytest-cov** 4.1+ - 测试覆盖率
- **hypothesis** 6.92+ - 属性测试
- **factory-boy** 3.3+ - 测试数据工厂

### 开发工具
- **python-dotenv** 1.0+ - 环境变量管理

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 配置数据库

编辑 `config/settings/development.py`：

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'lms',
        'USER': 'root',
        'PASSWORD': 'your_password',
        'HOST': 'localhost',
        'PORT': '3306',
    }
}
```

### 3. 初始化数据库

```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE lms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 运行迁移
python manage.py migrate --settings=config.settings.development

# 初始化基础数据（部门、角色、管理员账号）
python manage.py init_data --settings=config.settings.development
```

### 4. 启动服务

```bash
python manage.py runserver --settings=config.settings.development
```

服务运行在 http://127.0.0.1:8000

## API 文档

- **Swagger UI**: http://127.0.0.1:8000/api/docs/
- **ReDoc**: http://127.0.0.1:8000/api/redoc/
- **OpenAPI Schema**: http://127.0.0.1:8000/api/schema/

## 测试账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |

## 认证方式

系统使用 JWT Token 认证：

```bash
# 1. 登录获取 token
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# 响应
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "name": "系统管理员",
    "roles": ["STUDENT", "ADMIN"]
  }
}

# 2. 后续请求带上 token
curl http://127.0.0.1:8000/api/users/ \
  -H "Authorization: Bearer <access_token>"

# 3. token 过期后刷新
curl -X POST http://127.0.0.1:8000/api/auth/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"refresh": "<refresh_token>"}'
```

## API 端点概览

### 认证 `/api/auth/`

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | /login/ | 用户登录 |
| POST | /logout/ | 用户登出 |
| POST | /refresh/ | 刷新 token |
| POST | /switch-role/ | 切换当前角色 |
| GET | /me/ | 获取当前用户信息 |
| POST | /change-password/ | 修改密码（当前用户） |
| POST | /reset-password/ | 重置密码（管理员） |

### 用户管理 `/api/users/`

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | / | 用户列表 |
| POST | / | 创建用户 |
| GET | /{id}/ | 用户详情 |
| PUT | /{id}/ | 更新用户 |
| DELETE | /{id}/ | 删除用户 |
| POST | /{id}/activate/ | 启用用户 |
| POST | /{id}/deactivate/ | 停用用户 |
| POST | /{id}/reset-password/ | 重置密码 |
| POST | /{id}/assign-roles/ | 分配角色 |
| POST | /{id}/assign-mentor/ | 指定导师 |
| GET | /departments/ | 部门列表 |
| GET | /roles/ | 角色列表 |

### 知识文档 `/api/knowledge/`

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | / | 知识列表 |
| POST | / | 创建知识 |
| GET | /{id}/ | 知识详情 |
| PUT | /{id}/ | 更新知识 |
| DELETE | /{id}/ | 删除知识 |
| POST | /{id}/increment-view-count/ | 增加阅读量 |
| GET | /categories/ | 分类列表 |

### 题库 `/api/questions/`

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | / | 题目列表 |
| POST | / | 创建题目 |
| GET | /{id}/ | 题目详情 |
| PUT | /{id}/ | 更新题目 |
| DELETE | /{id}/ | 删除题目 |
| POST | /batch-import/ | 批量导入 |

### 试卷 `/api/quizzes/`

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | / | 试卷列表 |
| POST | / | 创建试卷 |
| GET | /{id}/ | 试卷详情 |
| PUT | /{id}/ | 更新试卷 |
| DELETE | /{id}/ | 删除试卷 |
| POST | /{id}/add-questions/ | 添加题目 |
| POST | /{id}/remove-questions/ | 移除题目 |

### 任务 `/api/tasks/`

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | / | 任务列表 |
| POST | / | 创建任务 |
| GET | /{id}/ | 任务详情 |
| PUT | /{id}/ | 更新任务 |
| DELETE | /{id}/ | 删除任务 |
| POST | /{id}/close/ | 强制结束任务 |
| GET | /my-tasks/ | 我的任务 |
| GET | /assignable-users/ | 可分配学员列表 |

### 答题提交 `/api/submissions/`

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | /learning/{assignment_id}/complete/ | 完成学习子任务 |
| POST | /practice/{assignment_id}/start/ | 开始练习 |
| POST | /practice/{assignment_id}/save-answer/ | 保存练习答案 |
| POST | /practice/{assignment_id}/submit/ | 提交练习 |
| GET | /practice/{assignment_id}/result/ | 练习结果 |
| POST | /exam/{assignment_id}/start/ | 开始考试 |
| POST | /exam/{assignment_id}/save-answer/ | 保存考试答案 |
| POST | /exam/{assignment_id}/submit/ | 提交考试 |
| GET | /exam/{assignment_id}/result/ | 考试结果 |

### 评分 `/api/grading/`

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | /pending/ | 待评分列表 |
| GET | /{submission_id}/ | 评分详情 |
| POST | /{submission_id}/grade/ | 提交评分 |
| POST | /batch-grade/ | 批量评分 |

### 抽查 `/api/spot-checks/`

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | / | 抽查列表 |
| POST | / | 创建抽查 |
| GET | /{id}/ | 抽查详情 |
| PUT | /{id}/ | 更新抽查 |
| DELETE | /{id}/ | 删除抽查 |

### 通知 `/api/notifications/`

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | / | 通知列表 |
| GET | /unread-count/ | 未读数量 |
| POST | /{id}/mark-read/ | 标记已读 |
| POST | /mark-all-read/ | 全部已读 |

### 数据看板 `/api/dashboard/`

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | /student/dashboard/ | 学员仪表盘 |
| GET | /student/knowledge-center/ | 知识中心 |
| GET | /student/task-center/ | 任务中心 |
| GET | /student/personal-center/ | 个人中心 |
| GET | /mentor/dashboard/ | 导师仪表盘 |
| GET | /team-manager/dashboard/ | 团队经理看板 |

## 角色与权限

| 角色 | 代码 | 权限范围 |
|------|------|----------|
| 学员 | STUDENT | 查看分配的任务、完成学习/练习/考试 |
| 导师 | MENTOR | 管理名下学员、创建题目/试卷/任务 |
| 室经理 | DEPT_MANAGER | 管理本室人员、权限同导师但范围为整室 |
| 管理员 | ADMIN | 全平台管理、所有资源的完整 CRUD |
| 团队经理 | TEAM_MANAGER | 只读数据分析、跨室数据查看 |

## 数据模型

### 用户相关
- `User` - 用户
- `Role` - 角色
- `Department` - 部门
- `UserRole` - 用户角色关联

### 资源相关
- `Knowledge` - 知识文档
- `KnowledgeCategory` - 知识分类
- `Question` - 题目
- `Quiz` - 试卷
- `QuizQuestion` - 试卷题目关联

### 任务相关
- `Task` - 任务（学习/练习/考试）
- `TaskAssignment` - 任务分配
- `LearningProgress` - 学习进度

### 提交相关
- `Submission` - 答题提交
- `Answer` - 答案记录

### 其他
- `SpotCheck` - 抽查记录
- `Notification` - 通知

## 运行测试

### 运行所有测试

```bash
# 运行所有测试
python -m pytest tests/ -v --tb=short

# 运行集成测试
python -m pytest tests/integration/ -v

# 运行属性测试（基于 Hypothesis）
python -m pytest tests/properties/ -v

# 运行领域层测试
python -m pytest tests/test_domain_layer.py -v

# 查看测试覆盖率
python -m pytest tests/ --cov=apps --cov-report=html

# 生成覆盖率报告（HTML）
python -m pytest tests/ --cov=apps --cov-report=html
# 报告位置：htmlcov/index.html
```

### 安装测试依赖

所有测试依赖已包含在 `requirements.txt` 中：

```bash
# 安装所有依赖（包括测试依赖）
pip install -r requirements.txt
```

主要测试依赖：
- `pytest>=7.4,<8.0` - 测试框架
- `pytest-django>=4.7,<5.0` - Django 集成
- `pytest-cov>=4.1,<5.0` - 覆盖率工具
- `hypothesis>=6.92,<7.0` - 属性测试
- `factory-boy>=3.3,<4.0` - 测试数据工厂

### 测试说明

- **集成测试** (`tests/integration/`)：验证端到端的业务流程，包括：
  - 学习任务流程
  - 练习任务流程
  - 考试任务流程
  - 权限控制流程
  - 用户管理流程
  - 资源保护流程

- **属性测试** (`tests/properties/`)：使用 Hypothesis 进行基于属性的测试，覆盖：
  - 认证属性
  - 权限属性
  - 任务执行属性
  - 提交属性
  - 评分属性
  - 资源管理属性

- **领域层测试** (`tests/test_domain_layer.py`)：验证 Domain 层的业务逻辑

- **测试数据库**：测试使用 SQLite 内存数据库（配置在 `config/settings/test.py`）

## 项目结构

```
lms_backend/
├── apps/                      # 业务应用模块
│   ├── users/                # 用户、角色、部门
│   │   ├── models.py         # Django ORM 模型
│   │   ├── repositories.py   # 数据访问层
│   │   ├── services.py       # 应用服务层
│   │   ├── views/            # 视图层
│   │   │   ├── auth.py       # 认证视图
│   │   │   └── management.py # 用户管理视图
│   │   ├── permissions.py   # 权限控制
│   │   └── management/       # 管理命令
│   │       └── commands/
│   │           ├── init_data.py
│   │           └── reset_admin_password.py
│   │
│   ├── knowledge/            # 知识文档
│   │   ├── models.py
│   │   ├── repositories.py
│   │   ├── services.py
│   │   ├── domain/           # 领域层
│   │   │   ├── models.py     # 领域模型
│   │   │   ├── services.py   # 领域服务
│   │   │   └── mappers.py    # 映射器
│   │   └── views/
│   │       ├── knowledge.py
│   │       └── tags.py
│   │
│   ├── questions/            # 题库
│   │   ├── models.py
│   │   ├── repositories.py
│   │   ├── services.py
│   │   └── domain/           # 领域层
│   │
│   ├── quizzes/              # 试卷
│   │   ├── models.py
│   │   ├── repositories.py
│   │   ├── services.py
│   │   └── domain/           # 领域层
│   │
│   ├── tasks/                # 任务
│   │   ├── models.py
│   │   ├── repositories.py
│   │   ├── services.py
│   │   └── domain/           # 领域层
│   │
│   ├── submissions/          # 答题提交、评分
│   │   ├── models.py
│   │   ├── repositories.py
│   │   ├── services.py
│   │   ├── domain/           # 领域层
│   │   └── views/
│   │       ├── common.py
│   │       ├── exam.py
│   │       ├── grading.py
│   │       └── practice.py
│   │
│   ├── spot_checks/          # 抽查
│   │   ├── models.py
│   │   ├── repositories.py
│   │   ├── services.py
│   │   └── views.py
│   │
│   ├── notifications/        # 通知
│   │   ├── models.py
│   │   ├── repositories.py
│   │   ├── services.py
│   │   └── views.py
│   │
│   └── dashboard/            # 数据看板
│       ├── services.py
│       └── views/
│           ├── student.py
│           ├── mentor.py
│           └── team_manager.py
│
├── core/                     # 核心公共组件
│   ├── base_repository.py   # Repository 基类
│   ├── base_service.py      # Service 基类
│   ├── exceptions.py        # 统一异常定义
│   ├── permissions.py        # 权限控制基类
│   ├── mixins.py            # 通用 Mixin
│   ├── pagination.py        # 分页工具
│   └── utils.py             # 工具函数
│
├── config/                   # 项目配置
│   ├── settings/            # 环境配置
│   │   ├── base.py          # 基础配置
│   │   ├── development.py   # 开发环境
│   │   ├── production.py    # 生产环境
│   │   └── test.py          # 测试环境
│   ├── urls.py              # URL 路由
│   ├── wsgi.py
│   └── asgi.py
│
├── tests/                    # 测试文件
│   ├── integration/         # 集成测试
│   │   ├── test_exam_task_flow.py
│   │   ├── test_learning_task_flow.py
│   │   ├── test_practice_task_flow.py
│   │   ├── test_permission_flow.py
│   │   ├── test_user_management_flow.py
│   │   └── test_resource_protection_flow.py
│   └── properties/          # 属性测试（基于 Hypothesis）
│       ├── test_auth_properties.py
│       ├── test_exam_submission_properties.py
│       ├── test_grading_properties.py
│       ├── test_learning_task_execution_properties.py
│       ├── test_permission_properties.py
│       ├── test_practice_submission_properties.py
│       ├── test_question_properties.py
│       ├── test_quiz_properties.py
│       ├── test_spot_check_properties.py
│       ├── test_task_properties.py
│       └── test_user_properties.py
│
├── ARCHITECTURE.md                    # 架构设计文档
├── ARCHITECTURE_IMPLEMENTATION_PLAN.md # 架构实施计划
├── CODE_QUALITY_ANALYSIS.md           # 代码质量分析
├── QUICK_START.md                     # 快速开始指南
├── README.md                          # 本文档
├── requirements.txt                   # Python 依赖
├── pytest.ini                         # pytest 配置
└── manage.py                          # Django 管理脚本
```

## 架构说明

本项目采用 **Clean Architecture（清洁架构）** 设计，遵循领域驱动设计（DDD）原则：

### 架构层次

```
┌─────────────────────────────────────┐
│   Presentation Layer (视图层)        │
│   - Views (APIView / ViewSet)       │
│   - Serializers                     │
│   - Permissions                     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Application Layer (应用层)         │
│   - Services (业务逻辑编排)          │
│   - DTOs (数据传输对象)              │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Domain Layer (领域层)              │
│   - Domain Models (领域模型)        │
│   - Domain Services (领域服务)      │
│   - Value Objects (值对象)           │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Infrastructure Layer (基础设施层)  │
│   - Repositories (数据访问)          │
│   - Database Models (Django ORM)     │
└──────────────────────────────────────┘
```

### 各层职责

- **Repository 层**：封装所有数据访问逻辑，提供领域友好的查询接口
- **Service 层（应用服务）**：编排业务逻辑，协调多个 Repository 和 Domain Service
- **Domain 层**：包含领域模型和领域服务，实现核心业务规则（部分核心模块已实现）
- **View 层**：只处理 HTTP 请求/响应，调用 Service 层
- **Model 层**：只定义数据模型和字段，不包含业务逻辑

### 已实现 Domain 层的模块

以下核心模块已引入 Domain 层：
- ✅ `knowledge` - 知识文档模块
- ✅ `questions` - 题库模块
- ✅ `quizzes` - 试卷模块
- ✅ `tasks` - 任务模块
- ✅ `submissions` - 提交模块

详细架构说明请参见 [ARCHITECTURE.md](./ARCHITECTURE.md)

## 管理命令

### 初始化数据

```bash
# 初始化基础数据（部门、角色、管理员账号）
python manage.py init_data --settings=config.settings.development
```

### 重置管理员密码

如果忘记了管理员密码，可以使用以下命令重置：

```bash
# 使用默认密码 admin123
python manage.py reset_admin_password --employee-id ADMIN001 --settings=config.settings.development

# 指定新密码
python manage.py reset_admin_password --employee-id ADMIN001 --password your_new_password --settings=config.settings.development
```

## 常见问题

### Q: 如何创建测试数据？

运行 `init_data` 命令会创建基础数据。如需更多测试数据，可以通过 Swagger UI 手动创建，或编写数据填充脚本。

### Q: 忘记了管理员密码怎么办？

使用 `reset_admin_password` 管理命令重置密码：

```bash
python manage.py reset_admin_password --employee-id ADMIN001 --settings=config.settings.development
```

默认新密码为 `admin123`，也可以使用 `--password` 参数指定新密码。

### Q: Token 过期时间？

- Access Token: 60 分钟
- Refresh Token: 7 天

### Q: 如何处理跨域？

开发环境已配置 `CORS_ALLOW_ALL_ORIGINS = True`，生产环境需要配置具体的允许域名。

### Q: 如何查看 API 文档？

启动服务后访问：
- **Swagger UI**: http://127.0.0.1:8000/api/docs/
- **ReDoc**: http://127.0.0.1:8000/api/redoc/
- **OpenAPI Schema**: http://127.0.0.1:8000/api/schema/

### Q: 项目使用什么架构？

项目采用 **Clean Architecture（清洁架构）**，包含以下层次：
- **Presentation Layer**（视图层）：处理 HTTP 请求/响应
- **Application Layer**（应用层）：业务逻辑编排
- **Domain Layer**（领域层）：核心业务规则（部分模块已实现）
- **Infrastructure Layer**（基础设施层）：数据访问和外部服务

详细说明请参见 [ARCHITECTURE.md](./ARCHITECTURE.md)

### Q: 如何添加新的业务模块？

1. 在 `apps/` 下创建新的应用目录
2. 创建 `models.py`（Django ORM 模型）
3. 创建 `repositories.py`（继承 `BaseRepository`）
4. 创建 `services.py`（继承 `BaseService`）
5. 创建 `views/` 目录和视图文件
6. 创建 `serializers.py`（DRF 序列化器）
7. 在 `config/urls.py` 中注册路由

参考现有模块（如 `knowledge`、`tasks`）的实现。

## 开发指南

### 代码规范

- 使用 JSDoc 风格的注释（Python docstring）
- 遵循 PEP 8 代码风格
- 使用类型提示（Type Hints）
- 所有业务逻辑应在 Service 层，不在 View 或 Model 层

### 添加新功能流程

1. **创建数据模型**：在 `models.py` 中定义 Django ORM 模型
2. **创建 Repository**：在 `repositories.py` 中实现数据访问逻辑
3. **创建 Service**：在 `services.py` 中实现业务逻辑
4. **创建 View**：在 `views/` 中处理 HTTP 请求
5. **创建 Serializer**：在 `serializers.py` 中定义输入/输出格式
6. **编写测试**：添加单元测试和集成测试
7. **更新文档**：更新 API 文档和 README

### 架构重构状态

项目已完成架构重构，采用 Clean Architecture：

- ✅ 所有模块已实现 Repository 层
- ✅ 所有模块已实现 Service 层
- ✅ View 层职责清晰，无业务逻辑
- ✅ 核心模块已引入 Domain 层（knowledge, questions, quizzes, tasks, submissions）

详细重构计划请参见 [ARCHITECTURE_IMPLEMENTATION_PLAN.md](./ARCHITECTURE_IMPLEMENTATION_PLAN.md)

## 相关文档

- [ARCHITECTURE.md](./ARCHITECTURE.md) - 完整架构设计文档
- [ARCHITECTURE_IMPLEMENTATION_PLAN.md](./ARCHITECTURE_IMPLEMENTATION_PLAN.md) - 架构实施计划
- [QUICK_START.md](./QUICK_START.md) - 快速开始指南
- [CODE_QUALITY_ANALYSIS.md](./CODE_QUALITY_ANALYSIS.md) - 代码质量分析

## License

MIT
