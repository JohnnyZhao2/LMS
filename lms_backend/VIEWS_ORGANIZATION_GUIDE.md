# Views文件组织规范

本文档定义了项目中Views文件组织的标准和最佳实践。

## 组织原则

### 选项A：按角色拆分（推荐）

适用于：
- 视图数量 >= 5个
- 有明显的角色区分（管理员、学员、导师等）
- 不同角色有不同的视图逻辑

**结构**：
```
views/
  __init__.py      # 统一导出所有视图
  admin.py         # 管理员视图
  student.py        # 学员视图
  common.py         # 通用视图（可选）
```

**示例**：
- `apps/tasks/views/` - 分为 `admin.py` 和 `student.py`
- `apps/analytics/views/` - 分为 `student.py`, `mentor.py`, `team_manager.py`

### 选项B：按资源拆分

适用于：
- 视图数量 >= 5个
- 有明显的资源划分（主资源和子资源）
- 资源之间有清晰的边界

**结构**：
```
views/
  __init__.py      # 统一导出所有视图
  {resource1}.py   # 主资源视图
  {resource2}.py   # 子资源视图
```

**示例**：
- `apps/knowledge/views/` - 分为 `knowledge.py` 和 `tags.py`

### 选项C：按功能拆分

适用于：
- 视图数量 >= 5个
- 有明显的功能模块划分
- 功能模块之间有清晰的边界

**结构**：
```
views/
  __init__.py      # 统一导出所有视图
  {feature1}.py    # 功能模块1
  {feature2}.py    # 功能模块2
```

**示例**：
- `apps/users/views/` - 分为 `auth.py` 和 `management.py`
- `apps/submissions/views/` - 分为 `common.py`, `practice.py`, `exam.py`, `grading.py`

### 选项D：单文件（适用于小型模块）

适用于：
- 视图数量 < 5个
- 所有视图都属于同一角色或功能
- 视图逻辑简单，不需要拆分

**结构**：
```
views.py           # 所有视图在一个文件中
```

**示例**：
- `apps/notifications/views.py` - 1个ViewSet
- `apps/spot_checks/views.py` - 2个视图
- `apps/questions/views.py` - 3个视图
- `apps/quizzes/views.py` - 6个视图（都是管理员视图，保持单文件）

## 当前组织情况

### 使用单文件（选项D）

| 模块 | 视图数量 | 说明 |
|------|---------|------|
| `notifications` | 1个 | ViewSet，单文件合理 |
| `spot_checks` | 2个 | 视图数量少，单文件 |
| `questions` | 3个 | 视图数量少，单文件 |
| `quizzes` | 6个 | 都是管理员视图，单文件合理 |

### 按角色拆分（选项A）

| 模块 | 文件结构 | 说明 |
|------|---------|------|
| `tasks` | `views/admin.py` + `views/student.py` | 管理员和学员视图分离 |
| `analytics` | `views/student.py` + `views/mentor.py` + `views/team_manager.py` | 按角色拆分 |

### 按资源拆分（选项B）

| 模块 | 文件结构 | 说明 |
|------|---------|------|
| `knowledge` | `views/knowledge.py` + `views/tags.py` | 知识文档和标签分离 |

### 按功能拆分（选项C）

| 模块 | 文件结构 | 说明 |
|------|---------|------|
| `users` | `views/auth.py` + `views/management.py` | 认证和用户管理分离 |
| `submissions` | `views/common.py` + `views/practice.py` + `views/exam.py` + `views/grading.py` | 按功能模块拆分 |

## 拆分标准

### 何时拆分？

当满足以下条件时，应该拆分：

1. **视图数量**：视图数量 >= 5个
2. **角色区分**：有明显的角色区分（管理员、学员等）
3. **资源划分**：有明显的资源划分（主资源、子资源）
4. **功能模块**：有明显的功能模块划分
5. **可维护性**：单文件过大，影响可读性和维护性

### 拆分优先级

1. **优先按角色拆分**：如果有明显的角色区分，优先按角色拆分
2. **其次按资源拆分**：如果有明显的资源划分，按资源拆分
3. **最后按功能拆分**：如果既没有角色区分也没有资源划分，按功能拆分

## 统一导出

所有拆分的views模块都应该在 `views/__init__.py` 中统一导出：

```python
"""
Module views.

Split into:
- admin.py: Admin views
- student.py: Student views
"""
from .admin import (
    AdminView1,
    AdminView2,
)
from .student import (
    StudentView1,
    StudentView2,
)

__all__ = [
    # Admin views
    'AdminView1',
    'AdminView2',
    # Student views
    'StudentView1',
    'StudentView2',
]
```

## 最佳实践

1. **保持一致性**：同一类型的模块使用相同的组织方式
2. **命名清晰**：文件名应该清晰表达视图类型或功能
3. **适度拆分**：不要过度拆分，保持合理的粒度
4. **统一导出**：拆分时，使用 `__init__.py` 统一导出
5. **文档注释**：在 `__init__.py` 中说明拆分逻辑
6. **按角色优先**：如果有角色区分，优先按角色拆分

## 更新记录

- 2024-01-XX: 初始版本，定义Views文件组织规范
