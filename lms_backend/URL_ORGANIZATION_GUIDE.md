# URL文件组织规范

本文档定义了项目中URL文件组织的标准和最佳实践。

## 组织原则

### 选项A：单文件组织（推荐用于简单模块）

适用于：
- 路由数量较少（< 10个）
- 功能单一，没有明显功能模块划分
- 所有路由都属于同一业务领域

**结构**：
```
apps/
  {module}/
    urls.py          # 所有路由在一个文件中
```

**示例**：
- `apps/knowledge/urls.py`
- `apps/tasks/urls.py`
- `apps/questions/urls.py`
- `apps/quizzes/urls.py`
- `apps/spot_checks/urls.py`
- `apps/notifications/urls.py`
- `apps/analytics/urls.py`

### 选项B：多文件组织（用于复杂模块）

适用于：
- 路由数量较多（>= 10个）
- 有多个明显不同的功能模块
- 需要按功能或角色拆分路由

**结构**：
```
apps/
  {module}/
    urls/
      __init__.py    # 统一导出所有路由
      {feature1}.py  # 功能模块1的路由
      {feature2}.py  # 功能模块2的路由
```

**命名规范**：
- 使用 kebab-case：`auth.py`, `users.py`, `grading.py`
- 文件名应该清晰表达功能模块

**示例**：
- `apps/users/urls/` - 分为 `auth.py` 和 `users.py`
- `apps/submissions/urls/` - 分为 `submissions.py` 和 `grading.py`

## 当前组织情况

### 使用单文件（选项A）

| 模块 | 路由数量 | 说明 |
|------|---------|------|
| `knowledge` | 10个 | 知识文档和标签管理 |
| `tasks` | 9个 | 任务管理 |
| `questions` | 3个 | 题目管理 |
| `quizzes` | 6个 | 试卷管理 |
| `spot_checks` | 2个 | 抽查管理 |
| `notifications` | 5个 | 通知管理（ViewSet） |
| `analytics` | 8个 | 数据看板 |

### 使用多文件（选项B）

| 模块 | 文件结构 | 说明 |
|------|---------|------|
| `users` | `urls/auth.py` + `urls/users.py` | 认证和用户管理分离 |
| `submissions` | `urls/submissions.py` + `urls/grading.py` | 提交和评分分离 |

## 主URL配置

在 `config/urls.py` 中统一引用：

```python
# 单文件模块
path('api/knowledge/', include('apps.knowledge.urls')),

# 多文件模块
path('api/auth/', include('apps.users.urls.auth')),
path('api/users/', include('apps.users.urls.users')),
path('api/submissions/', include('apps.submissions.urls.submissions')),
path('api/grading/', include('apps.submissions.urls.grading')),
```

## 迁移指南

### 何时从单文件迁移到多文件？

当满足以下条件时，考虑拆分：

1. **路由数量**：路由数量 >= 10个
2. **功能模块**：有明显的功能模块划分（如认证vs管理、提交vs评分）
3. **可维护性**：单文件过大，影响可读性和维护性

### 迁移步骤

1. 创建 `urls/` 目录
2. 创建 `urls/__init__.py`，统一导出
3. 按功能拆分路由到不同文件
4. 更新 `config/urls.py` 中的引用
5. 测试所有路由是否正常工作

## 最佳实践

1. **保持一致性**：同一类型的模块使用相同的组织方式
2. **命名清晰**：文件名应该清晰表达功能模块
3. **适度拆分**：不要过度拆分，保持合理的粒度
4. **统一导出**：多文件时，使用 `__init__.py` 统一导出
5. **文档更新**：拆分后更新相关文档

## 更新记录

- 2024-01-XX: 初始版本，定义URL文件组织规范
