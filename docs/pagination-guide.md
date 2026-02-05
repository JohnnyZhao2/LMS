# 分页统一规范

## 概述

本项目已统一分页实现，所有分页接口遵循相同的格式和实现方式。

## 后端实现

### 1. 统一响应格式

所有分页接口返回统一的包裹格式：

```json
{
  "code": "SUCCESS",
  "message": "success",
  "data": {
    "count": 123,
    "total_pages": 7,
    "current_page": 1,
    "page_size": 20,
    "next": "http://api.example.com/resource/?page=2",
    "previous": null,
    "results": [...]
  }
}
```

### 2. 分页类

项目提供两个分页类（位于 `lms_backend/core/pagination.py`）：

- **StandardResultsSetPagination**：默认每页 20 条，最大 100 条
- **SmallResultsSetPagination**：默认每页 10 条，最大 50 条

### 3. View 层实现

**推荐方式**：使用 DRF 的 `pagination_class`

```python
from core.pagination import StandardResultsSetPagination

class MyListView(BaseAPIView):
    pagination_class = StandardResultsSetPagination
    service_class = MyService

    def get(self, request):
        # 1. 获取 QuerySet（不要在 Service 层分页）
        queryset = self.service.get_queryset(filters=..., search=...)

        # 2. 使用分页器
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)

        # 3. 序列化并返回
        if page is not None:
            serializer = MySerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        # 不分页的情况
        serializer = MySerializer(queryset, many=True)
        return Response(serializer.data)
```

### 4. Service 层实现

**Service 层只返回 QuerySet，不处理分页**：

```python
class MyService(BaseService):
    def get_queryset(self, filters=None, search=None, ordering='-created_at'):
        """
        获取 QuerySet（用于分页）
        """
        queryset = MyModel.objects.all()

        # 应用过滤
        if filters:
            queryset = queryset.filter(**filters)

        # 应用搜索
        if search:
            queryset = queryset.filter(name__icontains=search)

        # 排序
        if ordering:
            queryset = queryset.order_by(ordering)

        return queryset
```

### 5. 分页参数

统一使用以下查询参数：

- `page`：页码（从 1 开始）
- `page_size`：每页数量（可选，有默认值和最大值限制）

示例：`/api/questions/?page=2&page_size=50`

## 前端实现

### 1. 类型定义

使用统一的 `PaginatedResponse<T>` 类型（位于 `lms_frontend/src/types/common.ts`）：

```typescript
export interface PaginatedResponse<T> {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
```

### 2. API 调用

```typescript
import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse } from '@/types/common';

// 获取分页数据
const response = await apiClient.get<PaginatedResponse<MyType>>(
  `/api/resource/?page=${page}&page_size=${pageSize}`
);

// 访问数据
console.log(response.results);       // 当前页数据
console.log(response.count);         // 总记录数
console.log(response.total_pages);   // 总页数
console.log(response.current_page);  // 当前页码
```

### 3. React Query Hook

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse } from '@/types/common';

export const useMyList = (page: number = 1, pageSize: number = 20) => {
  return useQuery({
    queryKey: ['my-list', page, pageSize],
    queryFn: async () => {
      return await apiClient.get<PaginatedResponse<MyType>>(
        `/api/resource/?page=${page}&page_size=${pageSize}`
      );
    },
  });
};
```

## 迁移指南

### 从手动分页迁移到统一分页

**步骤 1**：修改 Service 层

```python
# 旧代码（手动分页）
def get_list(self, page=1, page_size=20):
    queryset = MyModel.objects.all()
    total = queryset.count()
    start = (page - 1) * page_size
    results = queryset[start:start + page_size]
    return {
        'count': total,
        'results': list(results),
        'page': page,
        'page_size': page_size,
        'total_pages': (total + page_size - 1) // page_size
    }

# 新代码（返回 QuerySet）
def get_queryset(self, filters=None, search=None, ordering='-created_at'):
    queryset = MyModel.objects.all()
    # 应用过滤、搜索、排序
    return queryset
```

**步骤 2**：修改 View 层

```python
# 旧代码（手动构建响应）
def get(self, request):
    page = int(request.query_params.get('page', 1))
    page_size = int(request.query_params.get('page_size', 20))
    result = self.service.get_list(page=page, page_size=page_size)
    serializer = MySerializer(result['results'], many=True)
    return Response({
        'count': result['count'],
        'results': serializer.data,
        'page': result['page'],
        'page_size': result['page_size'],
        'total_pages': result['total_pages']
    })

# 新代码（使用 pagination_class）
pagination_class = StandardResultsSetPagination

def get(self, request):
    queryset = self.service.get_queryset(filters=..., search=...)
    paginator = self.pagination_class()
    page = paginator.paginate_queryset(queryset, request)
    if page is not None:
        serializer = MySerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
    serializer = MySerializer(queryset, many=True)
    return Response(serializer.data)
```

**步骤 3**：更新前端类型（如果有重复定义）

```typescript
// 删除局部定义
// interface PaginatedResponse<T> { ... }

// 使用统一定义
import type { PaginatedResponse } from '@/types/common';
```

## 注意事项

1. **不要在 Service 层处理分页**：Service 层只返回 QuerySet，分页由 View 层的 pagination_class 处理
2. **统一使用 page 和 page_size 参数**：不要使用 offset/limit 或其他参数名
3. **响应格式必须包裹在 {code, message, data} 中**：使用 `pagination_class.get_paginated_response()` 自动处理
4. **前端类型定义统一**：不要在各个 feature 中重复定义 `PaginatedResponse`
5. **非分页列表**：如果是下拉选项等小列表，明确声明为非分页接口，不要混用分页参数

## 常见问题

### Q: 如何处理复杂查询（聚合、跨表）？

A: 仍然返回 QuerySet，DRF 的分页器可以处理复杂的 QuerySet。如果必须返回 list（如跨模块拼接数据），可以在 View 层使用 `paginator.paginate_queryset(list_data, request)`。

### Q: 如何自定义分页大小？

A: 前端通过 `page_size` 参数控制，后端会限制在 `max_page_size` 范围内。

### Q: 如何处理无限滚动？

A: 使用 `next` 字段判断是否有下一页，前端递增 `page` 参数加载更多数据。

## 相关文件

- 后端分页类：`lms_backend/core/pagination.py`
- 后端响应工具：`lms_backend/core/responses.py`
- 前端类型定义：`lms_frontend/src/types/common.ts`
- 示例实现：
  - `lms_backend/apps/questions/views.py`
  - `lms_backend/apps/spot_checks/views.py`
