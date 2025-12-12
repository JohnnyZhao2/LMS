# LMS Backend 项目概述

## 项目简介

LMS（Learning Management System）学习管理系统后端API，采用Django + Django REST Framework构建，实现"学、练、考、评"完整闭环。

## 技术栈

- **后端框架**: Django 4.2+ / Django REST Framework 3.14+
- **数据库**: PostgreSQL 14+ (本地MySQL用于开发)
- **认证**: JWT (djangorestframework-simplejwt)
- **缓存**: Redis (可选)
- **异步任务**: Celery + Redis (可选)
- **API文档**: drf-spectacular (OpenAPI 3.0)
- **对象存储**: MinIO / AWS S3 / 阿里云OSS

## 核心功能模块

### 1. 用户认证与授权
- JWT token认证
- 多角色系统（学员、导师、室经理、团队经理、管理员）
- 角色切换功能
- 基于角色的权限控制（RBAC）

### 2. 知识库管理
- 三级分类体系（条线、系统、操作标签）
- 知识文档CRUD
- 软删除和发布状态管理
- 关键词搜索和分类筛选

### 3. 题库管理
- 四种题型（单选、多选、判断、简答）
- Excel批量导入
- 题目难度分级

### 4. 测验管理
- 测验/试卷创建
- 从题库选题组卷
- 题目排序和分值设置

### 5. 任务管理
- 三种任务类型（学习、练习、考试）
- 任务分配和状态管理
- 截止时间和自动逾期

### 6. 答题与评分
- 在线答题
- 客观题自动评分
- 主观题人工评分
- 重做机制（练习可重做，考试不可重做）

### 7. 现场抽查
- 线下抽查记录
- 评分和评语

### 8. 数据统计
- 学员学习统计
- 任务完成情况
- 知识热度分析
- 部门对比分析

### 9. 通知系统
- 任务分配通知
- 评分完成通知
- 截止时间提醒

### 10. 错题本
- 错题记录
- 按任务类型和分类筛选

## 组织架构

### 角色定义

1. **学员 (STUDENT)**
   - 查看知识库
   - 完成任务
   - 查看个人数据

2. **导师 (MENTOR)**
   - 管理名下学员
   - 创建测验资源
   - 发布任务给学员
   - 进行现场抽查

3. **室经理 (DEPT_MANAGER)**
   - 管理本室全员
   - 创建测验资源
   - 发布任务给本室员工
   - 进行现场抽查

4. **团队经理 (TEAM_MANAGER)**
   - 查看全团队数据看板
   - 不参与具体操作

5. **管理员 (ADMIN)**
   - 系统全权管理
   - 基础配置
   - 跨团队任务

### 部门结构

- 一室 (DEPT_ONE)
- 二室 (DEPT_TWO)

## 核心设计原则

### 1. 资源与任务分离
- 知识文档和测验作为可复用资源
- 任务作为资源分配的载体
- 先创建资源，后发布任务

### 2. 权限隔离
- 基于角色的数据过滤
- 导师只能看到自己的学员
- 室经理只能看到本部门员工
- 管理员可以访问所有数据

### 3. 软删除
- 知识文档、题目、测验、任务都支持软删除
- 数据安全，可恢复

### 4. 审计追踪
- 所有操作都有创建人、修改人记录
- 时间戳自动更新

## 项目结构

```
lms_backend/
├── apps/                       # Django应用
│   ├── users/                 # 用户模块
│   ├── knowledge/             # 知识库模块
│   ├── questions/             # 题库模块（待实现）
│   ├── quizzes/               # 测验模块（待实现）
│   ├── tasks/                 # 任务模块（待实现）
│   ├── submissions/           # 答题模块（待实现）
│   ├── grading/               # 评分模块（待实现）
│   ├── spot_checks/           # 现场抽查模块（待实现）
│   ├── statistics/            # 统计模块（待实现）
│   └── notifications/         # 通知模块（待实现）
├── lms_backend/               # 项目配置
│   ├── settings.py           # Django设置
│   ├── urls.py               # URL路由
│   ├── wsgi.py               # WSGI配置
│   └── utils/                # 工具模块
│       ├── permissions.py    # 权限类
│       ├── middleware.py     # 中间件
│       ├── mixins.py         # 数据过滤Mixins
│       ├── decorators.py     # 权限装饰器
│       └── exception_handler.py  # 异常处理
├── docs/                      # 文档
├── tests/                     # 测试
├── logs/                      # 日志
├── .env                       # 环境变量
├── requirements.txt           # 依赖包
└── manage.py                  # Django管理脚本
```

## API设计规范

### RESTful API
- 使用标准HTTP方法（GET, POST, PUT, PATCH, DELETE）
- 资源命名使用复数形式
- 版本控制：`/api/v1/`

### 统一响应格式
```json
{
  "success": true,
  "message": "操作成功",
  "data": {...}
}
```

### 错误响应格式
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误信息",
    "details": {...}
  }
}
```

### 分页
- 默认每页20条
- 支持自定义page_size（最大100）

### 过滤和排序
- 支持字段过滤
- 支持ordering参数排序

## 安全特性

1. **认证授权**
   - JWT token认证
   - 角色权限控制
   - 对象级权限

2. **数据安全**
   - SQL注入防护（ORM参数化查询）
   - XSS防护（自动转义）
   - CSRF防护

3. **密码安全**
   - Django内置密码哈希
   - 密码策略验证

4. **API限流**
   - 防止暴力攻击
   - DDoS防护

## 性能优化

1. **数据库优化**
   - select_related和prefetch_related避免N+1查询
   - 合理添加索引
   - 批量操作

2. **缓存策略**
   - Redis缓存热点数据
   - 查询结果缓存

3. **异步处理**
   - Celery处理耗时任务
   - 定时任务

## 开发环境

### 系统要求
- Python 3.10+
- PostgreSQL 14+ / MySQL 8.0+
- Redis 6.0+ (可选)

### 安装步骤
```bash
# 1. 创建虚拟环境
conda create -n lms python=3.10
conda activate lms

# 2. 安装依赖
pip install -r requirements.txt

# 3. 配置环境变量
cp .env.example .env
# 编辑.env文件，设置数据库密码等

# 4. 数据库迁移
python manage.py migrate

# 5. 初始化角色
python manage.py init_roles

# 6. 创建测试用户
python manage.py create_test_user

# 7. 启动开发服务器
python manage.py runserver
```

### API文档
访问 http://localhost:8000/api/docs/ 查看Swagger UI

## 测试

```bash
# 运行所有测试
python manage.py test

# 运行特定测试
python manage.py test apps.users.tests

# 测试覆盖率
coverage run --source='.' manage.py test
coverage report
```

## 部署

详见 [部署指南](./DEPLOYMENT_GUIDE.md)

---

**最后更新**: 2024-12-12
