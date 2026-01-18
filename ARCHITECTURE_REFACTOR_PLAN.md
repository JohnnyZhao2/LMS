# LMS后端重构简化计划（扁平化优先）

## 目标
- 删除过度分层：去掉 Repository 层，只保留 View/Serializer → Service → Model
- 业务逻辑集中在 Service，查询逻辑按需抽到 Selector/Manager
- 不做向后兼容：允许直接破坏旧接口与旧格式，前后端同步调整
- 统一响应结构：`{ code, message, data }`

## 目标结构
```
lms_backend/
├── core/
│   ├── exceptions.py      # BusinessError
│   ├── responses.py       # 统一响应
│   └── base_service.py    # 可选：公共事务/校验
├── apps/
│   ├── users/
│   │   ├── models.py
│   │   ├── services.py
│   │   ├── selectors.py   # 可选：复杂/复用查询
│   │   ├── serializers.py
│   │   ├── views/
│   │   └── urls.py
│   ├── knowledge/
│   ├── questions/
│   ├── quizzes/
│   ├── tasks/
│   ├── submissions/
│   ├── spot_checks/
│   └── dashboard/
└── tests/
    └── integration/
```

## 规则
- View/Serializer：仅做校验、调用 Service、响应包装
- Service：业务规则、权限判断、事务边界、跨模块协作
- Model：ORM 定义 + QuerySet/Manager（无业务流程）
- Selector：仅在“超过 3 行或多处复用”的查询时建立

## 执行步骤

### Phase 1：移除 Repository 层（核心）
1. 删除 `core/base_repository.py` 与各模块 `repositories.py`
2. 迁移仓储逻辑：
   - 复杂查询 → `selectors.py` 或 `QuerySet/Manager`
   - 简单查询 → 直接在 Service 使用 ORM
3. 修复 Service 的 import 与调用
4. 统一异常与响应格式

### Phase 2：合并与清理
1. 合并 `apps/auth` → `apps/users`（认证逻辑归并）
2. 删除空模块 `apps/grading`
3. 清理跨模块重复逻辑，统一通过 Service 入口调用

### Phase 3：收口与回归
1. 删除旧实现与兼容代码
2. 补齐关键流程集成测试
3. 进行小范围回归（登录、任务、提交、抽查、统计）

## 验收标准
- 不再存在 `repositories.py` / `base_repository.py`
- 关键流程集成测试通过
- 所有接口响应符合 `{ code, message, data }`
