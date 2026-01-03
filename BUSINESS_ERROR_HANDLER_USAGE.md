# BusinessErrorHandlerMixin 使用指南

## 概述

`BusinessErrorHandlerMixin` 是一个用于统一处理 `BusinessError` 异常的 Mixin 类，可以显著减少视图中的重复错误处理代码。

## 位置

- **定义**: `lms_backend/core/mixins.py`
- **示例应用**: `lms_backend/apps/quizzes/views.py`

## 使用方法

### 1. 在视图类中继承 Mixin

```python
from rest_framework.views import APIView
from core.mixins import BusinessErrorHandlerMixin
from core.exceptions import BusinessError

class MyView(BusinessErrorHandlerMixin, APIView):
    def post(self, request):
        try:
            result = self.service.create(...)
        except BusinessError as e:
            return self.handle_business_error(e)
```

**注意**: Mixin 必须放在 `APIView` 之前，以确保方法解析顺序（MRO）正确。

### 2. 替换原有的错误处理代码

**重构前**:
```python
except BusinessError as e:
    return Response(
        {'code': e.code, 'message': e.message, 'details': e.details},
        status=status.HTTP_400_BAD_REQUEST
    )
```

**重构后**:
```python
except BusinessError as e:
    return self.handle_business_error(e)
```

## 自动状态码映射

Mixin 会根据错误码自动映射到相应的 HTTP 状态码：

| 错误码 | HTTP 状态码 |
|--------|-------------|
| `RESOURCE_NOT_FOUND` | 404 Not Found |
| `PERMISSION_DENIED` | 403 Forbidden |
| `VALIDATION_ERROR` | 400 Bad Request |
| `INVALID_OPERATION` | 400 Bad Request |
| `INVALID_INPUT` | 400 Bad Request |
| `AUTH_INVALID_CREDENTIALS` | 401 Unauthorized |
| `AUTH_USER_INACTIVE` | 403 Forbidden |
| `AUTH_INVALID_ROLE` | 403 Forbidden |
| 其他错误码 | 400 Bad Request (默认) |

## 响应格式

所有错误响应都使用统一格式：

```json
{
    "code": "ERROR_CODE",
    "message": "错误消息",
    "details": {}
}
```

## 优势

1. **减少重复代码**: 无需在每个视图中重复编写错误处理逻辑
2. **统一响应格式**: 确保所有错误响应格式一致
3. **自动状态码映射**: 根据错误码自动选择正确的 HTTP 状态码
4. **易于维护**: 错误处理逻辑集中在一个地方，便于修改和扩展

## 迁移指南

要迁移现有视图到使用 `BusinessErrorHandlerMixin`：

1. 在视图类继承列表中添加 `BusinessErrorHandlerMixin`（必须在 `APIView` 之前）
2. 导入 Mixin: `from core.mixins import BusinessErrorHandlerMixin`
3. 将所有 `except BusinessError as e:` 块中的 `Response(...)` 替换为 `return self.handle_business_error(e)`
4. 移除不再需要的 `status` 导入（如果仅用于错误响应）

## 示例：完整重构

**重构前** (`quizzes/views.py`):
```python
class QuizListCreateView(APIView):
    def get(self, request):
        try:
            quiz_list = self.service.get_list(...)
        except BusinessError as e:
            return Response(
                {'code': e.code, 'message': e.message, 'details': e.details},
                status=status.HTTP_400_BAD_REQUEST
            )
        # ...
```

**重构后**:
```python
from core.mixins import BusinessErrorHandlerMixin

class QuizListCreateView(BusinessErrorHandlerMixin, APIView):
    def get(self, request):
        try:
            quiz_list = self.service.get_list(...)
        except BusinessError as e:
            return self.handle_business_error(e)
        # ...
```

## 注意事项

1. Mixin 只能处理 `BusinessError` 异常，其他异常需要通过 DRF 的异常处理器处理
2. 如果视图中有特殊的状态码映射需求，可以考虑覆盖 `_get_status_code_for_error` 方法（不推荐）或直接使用原有方式
3. 确保所有使用 Mixin 的视图都正确导入 `BusinessError` 异常类
