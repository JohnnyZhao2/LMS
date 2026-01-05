# 测试数据库使用指南

## 概述

项目使用独立的 MySQL 测试数据库 `lms_test`，与开发数据库 `lms` 分离。测试使用 pytest-django 的事务回滚机制，每个测试后自动清理数据，保持数据库干净。

## 数据库配置

- **开发数据库**: `lms` (localhost:3306)
- **测试数据库**: `lms_test` (localhost:3306)
- **测试配置**: `config/settings/test.py`

## 快速开始

### 1. 运行测试

```bash
cd lms_backend

# 运行所有测试
pytest

# 运行特定测试文件
pytest tests/test_database.py

# 运行特定测试
pytest tests/test_database.py::test_database_connection

# 显示详细输出
pytest -v

# 显示打印语句
pytest -s

# 显示覆盖率
pytest --cov=apps
```

### 2. 测试数据管理

pytest-django 会自动管理测试数据库：
- 首次运行时自动创建 `lms_test` 数据库
- 每次测试前开启事务
- 每次测试后自动回滚，保持数据库干净
- 不需要手动清理数据

## 测试 Fixtures

项目提供了常用的测试 fixtures（在 `tests/conftest.py` 中定义）：

### 基础 Fixtures

```python
@pytest.mark.django_db
def test_example(test_department, admin_role):
    """使用基础 fixtures"""
    # test_department: 测试部门
    # admin_role: 管理员角色
    # student_role: 学员角色
    # mentor_role: 导师角色
```

### 用户 Fixtures

```python
@pytest.mark.django_db
def test_users(admin_user, student_user, mentor_user):
    """使用用户 fixtures"""
    # admin_user: 管理员用户（username='admin', password='admin123'）
    # student_user: 学员用户（username='student', password='student123'）
    # mentor_user: 导师用户（username='mentor', password='mentor123'）
```

### API 客户端 Fixtures

```python
@pytest.mark.django_db
def test_api(authenticated_client, student_client, mentor_client):
    """使用 API 客户端 fixtures"""
    # api_client: 未认证的 API 客户端
    # authenticated_client: 已认证的管理员客户端
    # student_client: 已认证的学员客户端
    # mentor_client: 已认证的导师客户端
    
    response = authenticated_client.get('/api/some-endpoint/')
    assert response.status_code == 200
```

## 测试最佳实践

### 1. 使用 @pytest.mark.django_db 装饰器

```python
import pytest

@pytest.mark.django_db
def test_create_user():
    """需要数据库访问的测试必须使用此装饰器"""
    user = User.objects.create(username='test')
    assert user.username == 'test'
```

### 2. 使用 Fixtures 创建测试数据

```python
@pytest.mark.django_db
def test_with_fixtures(admin_user, test_department):
    """使用 fixtures 而不是手动创建数据"""
    assert admin_user.department == test_department
```

### 3. 测试 API 端点

```python
@pytest.mark.django_db
def test_api_endpoint(authenticated_client):
    """测试需要认证的 API"""
    response = authenticated_client.post('/api/tasks/', {
        'title': '测试任务',
        'task_type': 'LEARNING'
    })
    assert response.status_code == 201
```

### 4. 测试权限

```python
@pytest.mark.django_db
def test_permissions(student_client, admin_user):
    """测试权限控制"""
    # 学员不能访问管理员端点
    response = student_client.get(f'/api/admin/users/{admin_user.id}/')
    assert response.status_code == 403
```

## 常见问题

### Q: 测试数据库在哪里？

A: 测试数据库是 MySQL 的 `lms_test` 数据库，与开发数据库 `lms` 分离。

### Q: 测试数据会污染数据库吗？

A: 不会。pytest-django 使用事务回滚机制，每个测试后自动清理数据。

### Q: 如何查看测试数据库的内容？

A: 测试运行时数据库是空的（除了迁移创建的表结构）。如果需要查看，可以在测试中添加断点：

```python
@pytest.mark.django_db
def test_debug():
    user = User.objects.create(username='test')
    import pdb; pdb.set_trace()  # 在这里可以查看数据库
```

### Q: 测试运行很慢？

A: 考虑：
1. 使用 `pytest-xdist` 并行运行：`pytest -n auto`
2. 只运行特定测试：`pytest tests/test_specific.py`
3. 使用 `--reuse-db` 选项重用数据库：`pytest --reuse-db`

### Q: 如何重置测试数据库？

A: pytest-django 会自动管理。如果需要手动重置：

```bash
# 删除测试数据库
mysql -u root -p -e "DROP DATABASE IF EXISTS lms_test"

# 下次运行测试时会自动重新创建
pytest
```

## 与本地数据库的关系

- **开发数据库 (lms)**: 用于开发和手动测试，包含真实数据
- **测试数据库 (lms_test)**: 仅用于自动化测试，每次测试后清空

两个数据库完全独立，互不影响。测试不会修改或读取开发数据库的数据。

## 相关文件

- `config/settings/test.py` - 测试环境配置
- `tests/conftest.py` - pytest fixtures 定义
- `tests/test_database.py` - 数据库配置测试
- `pytest.ini` - pytest 配置

## 进阶用法

### 使用 Factory Boy 创建测试数据

```python
# tests/factories.py
import factory
from apps.users.models import User

class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
    
    username = factory.Sequence(lambda n: f'user{n}')
    employee_id = factory.Sequence(lambda n: f'EMP{n:03d}')

# 在测试中使用
@pytest.mark.django_db
def test_with_factory():
    user = UserFactory()
    assert user.username.startswith('user')
```

### 使用 Faker 生成随机数据

```python
from faker import Faker

fake = Faker('zh_CN')

@pytest.mark.django_db
def test_with_faker(test_department):
    user = User.objects.create(
        username=fake.user_name(),
        employee_id=fake.random_number(digits=6),
        department=test_department
    )
    assert user.username
```
