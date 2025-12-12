# LMS Backend API

Learning Management System (LMS) 后端API系统，基于Django + Django REST Framework构建。

## 项目概述

本项目实现了一个完整的学习管理系统后端API，支持"学、练、考、评"完整闭环。

### 核心功能

- 用户认证与授权（JWT）
- 多角色权限系统（学员、导师、室经理、团队经理、管理员）
- 知识库管理（三级分类体系）
- 题库管理（单选、多选、判断、简答）
- 测验管理（组卷、评分）
- 任务管理（学习、练习、考试）
- 答题与评分（自动评分、人工评分）
- 现场抽查记录
- 数据统计与分析
- 通知系统

## 技术栈

- **后端框架**: Django 4.2+ / Django REST Framework 3.14+
- **数据库**: MySQL 8.0+ (本地开发)
- **认证**: JWT (djangorestframework-simplejwt)
- **缓存**: Redis (可选)
- **异步任务**: Celery + Redis (可选)
- **API文档**: drf-spectacular (OpenAPI 3.0)

## 📚 文档

完整文档请查看 [docs/](./docs/) 目录：

- [项目概述](./docs/PROJECT_OVERVIEW.md) - 项目介绍、技术栈、功能模块
- [API文档](./docs/API_DOCUMENTATION.md) - 完整的API接口文档
- [数据库设计](./docs/DATABASE_DESIGN.md) - 数据库表结构和关系
- [开发指南](./docs/DEVELOPMENT_GUIDE.md) - 开发规范和最佳实践

## 快速开始

### 环境要求

- Python 3.10+
- MySQL 8.0+
- Redis 6.0+ (可选，用于缓存和异步任务)

### 安装步骤

1. **创建虚拟环境**
```bash
conda create -n lms python=3.10
conda activate lms
```

2. **安装依赖**
```bash
pip install -r requirements.txt
```

3. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，设置数据库连接信息和密钥
```

4. **数据库迁移**
```bash
python manage.py migrate
```

5. **初始化数据**
```bash
# 初始化角色
python manage.py init_roles

# 创建测试用户
python manage.py create_test_user

# 初始化知识库数据（可选）
python manage.py init_knowledge_data
```

6. **启动开发服务器**
```bash
python manage.py runserver
```

7. **访问API文档**
打开浏览器访问: http://localhost:8000/api/docs/

## 项目结构

```
lms_backend/
├── apps/                       # Django应用
│   ├── users/                 # 用户模块 ✅
│   ├── knowledge/             # 知识库模块 ✅
│   ├── questions/             # 题库模块 🔄
│   └── ...                    # 其他模块
├── lms_backend/               # 项目配置
│   ├── settings.py           # Django设置
│   ├── urls.py               # URL路由
│   └── utils/                # 工具模块
│       ├── permissions.py    # 权限类 ✅
│       ├── middleware.py     # 中间件 ✅
│       ├── mixins.py         # 数据过滤Mixins ✅
│       └── decorators.py     # 权限装饰器 ✅
├── docs/                      # 文档 📚
│   ├── README.md
│   ├── PROJECT_OVERVIEW.md
│   ├── API_DOCUMENTATION.md
│   ├── DATABASE_DESIGN.md
│   └── DEVELOPMENT_GUIDE.md
├── tests/                     # 测试
├── logs/                      # 日志
├── .env                       # 环境变量
├── requirements.txt           # 依赖包
└── manage.py                  # Django管理脚本
```

## 已完成的任务

- ✅ Task 1: Django项目结构和核心配置
- ✅ Task 2: 用户和角色模型
- ✅ Task 3: JWT认证系统
- ✅ Task 4: 权限系统和中间件
- ✅ Task 5: 知识库模型和基本CRUD
- ✅ Task 6: 知识库API端点
- 🔄 Task 7: 题库和测验模型（进行中）

## API文档

启动服务器后，访问以下地址查看API文档：

- Swagger UI: http://localhost:8000/api/docs/
- ReDoc: http://localhost:8000/api/redoc/
- OpenAPI Schema: http://localhost:8000/api/schema/

## 测试

```bash
# 运行所有测试
python manage.py test

# 运行特定应用的测试
python manage.py test apps.users

# 测试覆盖率
coverage run --source='.' manage.py test
coverage report
```

## 开发指南

详见 [开发指南](./docs/DEVELOPMENT_GUIDE.md)

## 许可证

[待定]
