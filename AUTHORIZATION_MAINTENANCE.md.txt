# 权限系统维护说明

## 1. 现在这套权限系统的真相源

- 权限点定义：后端各业务模块自己的 `authorization.py`
- 统一汇总：`lms_backend/apps/authorization/registry.py`
- 汇总导出：`lms_backend/apps/authorization/constants.py`
- 运行时判定：`lms_backend/apps/authorization/services.py`
- 运行时额外约束：`lms_backend/apps/authorization/policies.py`
- 角色模板差异覆盖：数据库表 `RolePermission`
- 用户级单独授权：数据库表 `UserPermissionOverride`
- 前端权限说明：`lms_frontend/src/features/authorization/constants/permission-presentation.ts`

结论：

- 不要直接改数据库表来维护权限
- 不要把权限点写死在前端当真相源
- 以后改权限，优先改后端各模块的 `authorization.py`

## 2. 日常改动应该改哪里

### 新增或修改某个业务权限

去对应模块的 `authorization.py` 改：

- 任务：`lms_backend/apps/tasks/authorization.py`
- 知识：`lms_backend/apps/knowledge/authorization.py`
- 标签：`lms_backend/apps/tags/authorization.py`
- 题目：`lms_backend/apps/questions/authorization.py`
- 试卷：`lms_backend/apps/quizzes/authorization.py`
- 看板：`lms_backend/apps/dashboard/authorization.py`
- 用户：`lms_backend/apps/users/authorization.py`

常见改法：

- 新增权限点：加到 `permissions`
- 默认给哪些角色：改 `role_defaults`
- 系统保留权限：改 `system_managed_codes` 或 `role_system_defaults`
- 支持按学员范围覆盖：改 `scope_aware_permissions`
- 默认范围：改 `role_default_scopes`

### 权限点有额外业务约束

如果某个权限不是“有就能用”，还带额外规则，例如：

- 只能编辑自己创建的数据
- 只能看自己创建或分配给自己的任务
- 某类看板按学员范围生效

统一改这里：

- `lms_backend/apps/authorization/policies.py`

不要再把这类规则散落在各业务 service 里。

### 前端需要同步的地方

- 权限说明：`lms_frontend/src/features/authorization/constants/permission-presentation.ts`
- 路由守卫：对应页面的 route 文件
- 菜单显示：对应菜单 hook 或页面入口

## 3. 改完之后怎么更新

进入后端目录：

```bash
cd /Users/johnnyzhao/Documents/LMS/lms_backend
```

执行同步：

```bash
python manage.py sync_authorization --settings=config.settings.development
```

执行校验：

```bash
python manage.py check_authorization --settings=config.settings.development
```

## 4. 常见场景

### 场景 A：新增一个权限点

步骤：

1. 在对应模块 `authorization.py` 新增权限定义
2. 需要默认给某些角色时，补到 `role_defaults`
3. 需要范围覆盖时，补到 `scope_aware_permissions`
4. 如果有额外业务约束，补到 `policies.py`
5. 前端补权限说明和路由/菜单守卫
6. 跑 `sync_authorization`
7. 跑 `check_authorization`

### 场景 B：只调整默认角色模板

直接改对应模块的 `role_defaults`，然后执行：

```bash
python manage.py sync_authorization --settings=config.settings.development
```

说明：

- 代码默认值会自动参与角色模板计算
- 已存在的数据库差异覆盖会继续保留

### 场景 C：强制所有角色回到代码默认值

执行：

```bash
python manage.py sync_authorization --settings=config.settings.development --sync-role-templates --overwrite-existing-role-templates
```

说明：

- 这会清空角色模板差异覆盖
- 只在你明确要“恢复默认模板”时使用

### 场景 D：删除一个权限点

步骤：

1. 先删后端业务代码中的权限引用
2. 再删对应模块 `authorization.py` 里的定义
3. 删前端说明、菜单和路由引用
4. 执行 `sync_authorization`
5. 执行 `check_authorization`

## 5. 不要这样做

- 不要直接手改 `Permission`、`RolePermission`、`UserPermissionOverride` 表来维护系统默认权限
- 不要把新权限只加在前端，不加后端声明
- 不要只改路由守卫，不改后端 `enforce/can`
- 不要把运行时限制继续散落在各业务模块里
- 不要新增功能后不跑 `check_authorization`

## 6. 最小检查清单

每次改权限前后，至少确认这几件事：

- 后端模块 `authorization.py` 已更新
- 前端权限说明已更新
- 后端接口已经使用 `AuthorizationService.enforce` 或 `can`
- 额外业务限制已经收敛到 `policies.py`
- `sync_authorization` 已执行
- `check_authorization` 已通过

## 7. 一句话原则

以后权限系统的维护方式是：

`业务模块自己声明权限 -> registry 汇总 -> sync/check 更新和校验 -> 前端消费结果`

不要再回到“想到哪改哪”的方式。
