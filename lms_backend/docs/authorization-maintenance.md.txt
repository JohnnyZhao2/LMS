# 权限系统维护说明

## 真相源

- 权限声明入口：各模块自己的 `authorization.py`
- 汇总注册：`lms_backend/apps/authorization/registry.py`
- 导出常量：`lms_backend/apps/authorization/constants.py`
- 运行时判定入口：`lms_backend/apps/authorization/engine.py`
- 数据同步入口：`lms_backend/apps/authorization/services.py`
- 数据表承载：
  - 代码默认权限同步到 `Permission`
  - 角色模板差异在 `RolePermission`
  - 用户能力例外在 `UserPermissionOverride`
  - 范围组默认规则来自代码注册表
  - 用户范围覆盖在 `UserScopeGroupOverride`
- 前端说明：`lms_frontend/src/entities/authorization/constants/permission-presentation.ts`

现在已经没有 `policies.py` 这个运行时中心。附加约束走两条主链：

- 资源级约束：各模块 `authorization.py` 里的 `resource_authorization_handlers`
- 范围过滤：各模块 `authorization.py` 里的 `scope_filter_handlers` / `scope_rules`

现在的范围模型已经不是“按模块共享”，而是：

- 权限自己声明 `scope_group_key`
- 默认范围按 `scope_group_key + role` 从代码注册表解析
- 用户页面改的是 `scope_group`，不是单个 permission 的范围
- `scope-aware permission` 的开关和范围分离：
  - 能力开关看 `RolePermission / UserPermissionOverride`
  - 默认范围看权限注册表，用户例外范围看 `UserScopeGroupOverride`

## 日常改动

### 新增或修改权限

去对应模块 `authorization.py` 改：

- `permissions`：权限点定义
- `role_defaults`：角色默认权限
- `role_system_defaults` / `system_managed_codes`：系统保留权限
- `scope_rules`：默认范围规则
- `scope_group_key`：该权限归属的范围组
- `resource_authorization_handlers`：资源级条件约束
- `scope_filter_handlers`：列表/查询过滤约束

### 前端同步

- 权限说明：`lms_frontend/src/entities/authorization/constants/permission-presentation.ts`
- 路由守卫、菜单显隐、页面入口

## 同步与校验

先进入后端目录：

```bash
cd /Users/johnnyzhao/Documents/LMS/lms_backend
```

同步权限目录与默认模板：

```bash
python manage.py sync_authorization --settings=config.settings.development
```

现在只要部署流程里正常执行 `python manage.py migrate`，权限目录和日志策略目录都会自动同步。
`sync_authorization` 只在你想本地手动立即收敛时再用，不再是部署必需步骤。

如果要强制把角色模板覆盖重置回代码默认值：

```bash
python manage.py sync_authorization --settings=config.settings.development --overwrite-existing-role-templates
```

当前没有 `check_authorization` 命令。静态一致性检查在测试里：

```bash
python -m pytest tests/test_authorization_consistency.py
```

## 常见场景

### 新增一个权限点

1. 在对应模块 `authorization.py` 增加权限定义
2. 需要默认授予时补 `role_defaults`
3. 需要范围规则时补 `scope_rules`
4. 需要资源级限制时补 `resource_authorization_handlers`
5. 前端补说明和守卫
6. 执行 `sync_authorization`
7. 跑 `tests/test_authorization_consistency.py`

### 只调整默认角色模板

改对应模块 `role_defaults`，然后执行：

```bash
python manage.py sync_authorization --settings=config.settings.development
```

### 删除一个权限点

1. 先删业务代码中的引用
2. 再删对应模块 `authorization.py` 里的定义
3. 删前端说明、菜单和路由引用
4. 执行 `sync_authorization`
5. 跑一致性测试

## 不要这样做

- 不要直接改库表维护默认权限
- 不要只改前端，不改后端声明
- 不要把运行时约束散回 service / view
- 不要继续引用不存在的 `check_authorization`

## 一句话原则

`各模块 authorization.py 声明 -> registry/constants 汇总 -> sync_authorization 同步 -> engine 统一判定 -> 前端消费结果`
