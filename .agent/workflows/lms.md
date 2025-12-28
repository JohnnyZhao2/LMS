---
description: LMS 项目开发工作流 - 涵盖启动服务、新增功能、数据库操作、调试等常用场景
---

# LMS 项目开发工作流

## 项目概述

- **前端**: `lms_frontend/` - Vite + React + TypeScript + Ant Design v5
- **后端**: `lms_backend/` - Django 4.2+ / DRF 3.14+ / MySQL 8.0+
- **角色**: 学员、导师、室经理、管理员、团队经理

---

## 一、启动开发服务

### 1.1 启动后端服务
```bash
cd lms_backend
python manage.py runserver
```
服务运行在 http://localhost:8000

### 1.2 启动前端服务
// turbo
```bash
cd lms_frontend
npm run dev
```
服务运行在 http://localhost:5173

---

## 二、项目目录结构

### 前端结构
```
lms_frontend/src/
├── app/                 # 应用入口
│   ├── router.tsx      # 路由配置（添加新页面在此注册）
│   ├── provider.tsx    # 全局 Provider (AuthContext)
│   └── App.tsx         # 根组件
├── components/          # 全局共享组件
│   ├── ui/             # 基础 UI (Button, Modal, Card)
│   └── layout/         # 布局 (Sidebar, Header)
├── config/              # 全局配置
│   ├── api.ts          # API 端点
│   └── constants.ts    # 常量
├── features/            # 功能模块（核心）
│   ├── auth/           # 认证登录
│   ├── dashboard/      # 仪表盘
│   ├── knowledge/      # 知识库
│   ├── questions/      # 题库
│   ├── quizzes/        # 试卷
│   ├── tasks/          # 任务管理
│   ├── submissions/    # 答题提交
│   ├── grading/        # 评分
│   ├── spot-checks/    # 抽查
│   ├── users/          # 用户管理
│   └── test-center/    # 考试中心
├── hooks/               # 全局 Hooks
├── lib/                 # 三方库封装 (axios, react-query)
├── types/               # 全局 TS 类型
├── utils/               # 工具函数
└── index.css            # 全局样式（CSS 变量）
```

### 后端结构
```
lms_backend/
├── config/              # 项目配置
│   ├── settings/       # 环境配置 (base, dev, prod)
│   ├── urls.py         # 根路由
│   └── wsgi.py
├── apps/                # 业务应用
│   ├── users/          # 用户与权限
│   ├── knowledge/      # 知识库
│   ├── questions/      # 题库
│   ├── quizzes/        # 试卷
│   ├── tasks/          # 任务
│   ├── submissions/    # 答题与评分
│   ├── spot_checks/    # 抽查
│   ├── notifications/  # 通知
│   └── analytics/      # 统计分析
├── core/                # 核心模块
│   ├── permissions.py  # 通用权限类
│   ├── pagination.py   # 分页
│   ├── exceptions.py   # 异常处理
│   └── mixins.py       # TimestampMixin, SoftDeleteMixin
└── tests/               # 测试
```

### 前后端模块对应
| 前端 Feature | 后端 App |
|--------------|----------|
| auth | users |
| dashboard | analytics |
| knowledge | knowledge |
| questions | questions |
| quizzes | quizzes |
| tasks | tasks |
| submissions | submissions |
| grading | submissions |
| spot-checks | spot_checks |
| users | users |
| test-center | (综合) |

---

## 三、新增 Feature 功能

### 3.1 后端 - 创建新业务模块

1. 在 `lms_backend/apps/` 下创建新 app
2. 需要包含的文件：
   - `models.py` - 数据模型（使用 TimestampMixin, SoftDeleteMixin）
   - `serializers.py` - 序列化器（区分 List/Detail/Create）
   - `views.py` - 视图端点
   - `urls.py` - URL 路由
   - `permissions.py` - 权限类（如需要）
   - `services.py` - 业务逻辑层（如需要）
3. 在 `config/urls.py` 注册路由

### 3.2 前端 - 创建新 Feature

在 `lms_frontend/src/features/` 下创建：
```
src/features/new-feature/
├── api/           # API 请求 + React Query hooks
├── components/    # 内部组件
├── types/         # TypeScript 类型
├── hooks/         # UI 逻辑 hooks
└── index.ts       # 公共导出
```

### 3.3 注册路由

在 `lms_frontend/src/app/router.tsx` 添加新页面路由。

---

## 四、数据库操作

### 4.1 使用 MCP 直接执行 SQL（本地开发优先）
```sql
-- 查询表结构
DESCRIBE table_name;

-- 查询数据
SELECT * FROM table_name LIMIT 10;

-- 添加列
ALTER TABLE table_name ADD COLUMN new_column VARCHAR(100);

-- 查看所有表
SHOW TABLES;
```

### 4.2 Django 迁移（团队协作/生产环境）
// turbo
```bash
cd lms_backend
python manage.py makemigrations
python manage.py migrate
```

### 4.3 查看数据库对象
使用 MCP 工具 `mcp_dbhub_search_objects` 搜索：
- object_type: schema, table, column, procedure, index
- detail_level: names, summary, full

---

## 五、调试与排错

### 5.1 查看后端日志
后端服务会在终端输出请求日志和错误信息。

### 5.2 查看前端控制台
使用浏览器开发者工具查看网络请求和 JS 错误。

### 5.3 API 测试
// turbo
```bash
curl -X GET http://localhost:8000/api/users/ -H "Authorization: Bearer <token>"
```

### 5.4 运行后端测试
// turbo
```bash
cd lms_backend
pytest tests/ -v
```

---

## 六、代码修改检查清单

### 6.1 修改数据库字段时
1. 更新 `models.py` 字段定义和文档字符串
2. 使用 MCP 执行 SQL 修改数据库
3. 全局搜索 (`rg`) 所有引用位置
4. 更新序列化器、视图、服务层
5. 更新前端类型定义和组件

### 6.2 修改 API 接口时
1. 更新后端视图和序列化器
2. 更新 OpenAPI schema (`openapi-schema.yaml`)
3. 更新前端 API hooks (`features/*/api/`)
4. 更新前端类型定义

### 6.3 修改前端组件时
1. 检查所有角色是否共用该组件
2. 如果共用，确保所有角色正常工作
3. 更新相关测试

---

## 七、常用文件路径

### 后端
| 类型 | 路径 |
|------|------|
| 模型 | `lms_backend/apps/{app}/models.py` |
| 序列化器 | `lms_backend/apps/{app}/serializers.py` |
| 视图 | `lms_backend/apps/{app}/views.py` |
| 路由 | `lms_backend/config/urls.py` |
| 权限 | `lms_backend/core/permissions.py` |
| API Schema | `lms_backend/openapi-schema.yaml` |

### 前端
| 类型 | 路径 |
|------|------|
| 路由 | `lms_frontend/src/app/router.tsx` |
| 全局样式 | `lms_frontend/src/index.css` |
| API 配置 | `lms_frontend/src/config/` |
| Feature | `lms_frontend/src/features/{feature}/` |
| 共享组件 | `lms_frontend/src/components/` |
| 类型 | `lms_frontend/src/types/` |

---

## 八、快捷命令

### 安装依赖
// turbo
```bash
# 前端
cd lms_frontend && npm install

# 后端
cd lms_backend && pip install -r requirements.txt
```

### 格式化代码
// turbo
```bash
# 前端
cd lms_frontend && npm run lint

# 后端
cd lms_backend && black . && isort .
```

### 生成 OpenAPI Schema
// turbo
```bash
cd lms_backend
python manage.py spectacular --file openapi-schema.yaml
```

---

## 九、序列化器规范

```python
# ✅ 区分列表和详情
class KnowledgeListSerializer(serializers.ModelSerializer):
    """列表视图，只包含必要字段"""
    class Meta:
        model = Knowledge
        fields = ['id', 'title', 'line_type', 'created_at']

class KnowledgeDetailSerializer(serializers.ModelSerializer):
    """详情视图，包含完整字段"""
    class Meta:
        model = Knowledge
        fields = '__all__'
```

---

## 十、权限控制

```python
# ✅ 使用权限类
class KnowledgeListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        if not request.user.is_admin:
            raise BusinessError(code=ErrorCodes.PERMISSION_DENIED, ...)
```

---

## 十一、通用 Mixin

```python
# ✅ 使用通用 Mixin
class Knowledge(TimestampMixin, SoftDeleteMixin, CreatorMixin, models.Model):
    title = models.CharField(max_length=200)
    # created_at, updated_at, is_deleted, created_by 自动包含
```
