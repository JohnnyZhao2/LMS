# 测试指南

## 快速开始

```bash
# 运行所有测试
pytest

# 运行特定测试
pytest tests/test_database.py

# 显示详细输出
pytest -v -s
```

## 可用的 Fixtures

### 基础数据
- `test_department`: 测试部门
- `admin_role`: 管理员角色
- `student_role`: 学员角色
- `mentor_role`: 导师角色

### 测试用户
- `admin_user`: 管理员（username='admin', password='admin123'）
- `student_user`: 学员（username='student', password='student123'）
- `mentor_user`: 导师（username='mentor', password='mentor123'）

### API 客户端
- `api_client`: 未认证的 API 客户端
- `authenticated_client`: 已认证的管理员客户端
- `student_client`: 已认证的学员客户端
- `mentor_client`: 已认证的导师客户端

## 示例

### 测试模型

```python
import pytest
from apps.users.models import User

@pytest.mark.django_db
def test_create_user(test_department):
    user = User.objects.create(
        username='test',
        employee_id='TEST001',
        department=test_department
    )
    assert user.username == 'test'
```

### 测试 API

```python
import pytest

@pytest.mark.django_db
def test_api_endpoint(authenticated_client):
    response = authenticated_client.get('/api/users/')
    assert response.status_code == 200
```

### 测试权限

```python
import pytest

@pytest.mark.django_db
def test_student_cannot_access_admin(student_client):
    response = student_client.get('/api/admin/users/')
    assert response.status_code == 403
```

## 更多信息

查看 [README_TEST.md](../README_TEST.md) 了解完整的测试数据库配置和最佳实践。
