# LMS 学习管理系统 - 后端 API

企业级学习管理系统后端，实现"学、练、考、评"能力闭环。

## 技术栈

- Python 3.9+
- Django 4.2
- Django REST Framework 3.14
- MySQL 8.0
- JWT 认证 (SimpleJWT)

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
    "username": "系统管理员",
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
| POST | /change-password/ | 修改密码 |

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

### 统计分析 `/api/analytics/`

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

# 运行属性测试（需要安装 hypothesis）
python -m pytest tests/properties/ -v

# 查看测试覆盖率
python -m pytest tests/ --cov=apps --cov-report=html
```

### 安装测试依赖

```bash
# 安装所有依赖（包括测试依赖）
pip install -r requirements.txt

# 如果缺少 hypothesis（用于属性测试）
pip install hypothesis>=6.92,<7.0
```

### 测试说明

- **集成测试**：验证端到端的业务流程
- **属性测试**：使用 Hypothesis 进行属性测试（需要安装 hypothesis）
- **测试数据库**：测试使用 SQLite 内存数据库

## 项目结构

```
├── apps/
│   ├── users/          # 用户、角色、部门
│   │   ├── repositories.py  # 数据访问层
│   │   ├── services.py      # 业务逻辑层
│   │   └── views/           # 视图层
│   ├── knowledge/      # 知识文档
│   ├── questions/      # 题库
│   ├── quizzes/        # 试卷
│   ├── tasks/          # 任务
│   ├── submissions/    # 答题提交、评分
│   ├── spot_checks/    # 抽查
│   ├── notifications/  # 通知
│   └── analytics/      # 统计分析
├── core/
│   ├── base_repository.py  # Repository 基类
│   ├── base_service.py     # Service 基类
│   ├── exceptions.py       # 统一异常定义
│   ├── mixins.py           # 通用 Mixin
│   └── permissions.py      # 权限控制
├── config/
│   ├── settings/       # 配置文件
│   └── urls.py         # URL 路由
├── tests/              # 测试文件
│   ├── integration/    # 集成测试
│   └── properties/     # 属性测试
└── docs/               # 文档
    ├── ARCHITECTURE.md              # 架构设计
    ├── ARCHITECTURE_IMPLEMENTATION_PLAN.md  # 实施计划
    ├── STAGE4_CODE_REVIEW.md        # 代码审查报告
    └── QUICK_START.md               # 快速开始
```

## 架构说明

本项目采用 **Clean Architecture（清洁架构）** 设计：

- **Repository 层**：封装所有数据访问逻辑
- **Service 层**：包含所有业务逻辑
- **View 层**：只处理 HTTP 请求/响应
- **Model 层**：只定义数据模型和字段

详细架构说明请参见 [ARCHITECTURE.md](./ARCHITECTURE.md)
├── core/               # 公共组件
├── tests/              # 测试
└── manage.py
```

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

## License

MIT
