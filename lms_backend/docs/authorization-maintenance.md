# 权限系统维护说明

## 真相源

- 各业务模块的 `authorization.py` 声明权限、范围、依赖和约束。
- `apps/authorization/registry.py` 自动发现声明并校验唯一性与范围一致性。
- `apps/authorization/constants.py` 导出注册表生成的运行时元数据。
- `Permission` 保存同步后的权限目录。
- `RolePermission / RoleScope` 保存完整角色模板。
- `UserRolePermission / UserRoleScope / UserRoleScopeMember` 保存管理用户的最终授权。
- `apps/authorization/final_authorization_service.py` 直接读取最终权限和最终范围。
- `apps/authorization/engine.py` 统一执行能力判断与资源约束。

运行时不叠加角色模板与用户授权，也不补默认范围或权限依赖。角色模板只在新增管理角色、用户主动重置时复制到用户最终授权；修改模板不会影响已有用户。

## 权限声明

在对应模块的 `authorization.py` 中维护：

- `permissions`：权限定义。
- `scope_kind / scope_group_key / allowed_scope_types`：范围模型。
- `implies`：写入角色模板或用户授权时必须满足的依赖。
- `is_configurable / required_role_codes`：固定权限归属。
- `resource_authorization_handlers`：单对象资源约束。
- `scope_filter_handlers`：列表查询范围过滤。

同一 `scope_group_key` 下的权限必须使用相同的 `scope_kind` 和 `allowed_scope_types`。

## 数据同步

正常执行 migration 后，`post_migrate` 会同步权限目录与固定权限：

```bash
cd /Users/johnnyzhao/Documents/LMS/lms_backend
conda run -n lms python manage.py migrate
```

需要立即手动同步时执行：

```bash
conda run -n lms python manage.py sync_authorization
```

同步规则：

- 新权限默认不授予任何角色或用户，固定权限除外。
- 已删除的声明会被标记为停用，并从角色模板和用户最终授权移除。
- 固定权限按 `required_role_codes` 强制同步到对应角色及已有用户。
- 已失去权限引用的范围记录会被清理。

## 日常改动

### 新增或修改权限

1. 修改业务模块的 `authorization.py`。
2. 更新前端 `src/features/user-management/constants/permission-presentation.ts`、入口和守卫。
3. 涉及模型时生成 migration。
4. 执行 migration；仅需本地立即收敛时再运行 `sync_authorization`。
5. 在授权中心配置角色模板；需要影响已有用户时显式重置对应用户。

### 删除权限

1. 删除后端业务引用和权限声明。
2. 删除前端说明、入口和守卫。
3. 执行 migration 或 `sync_authorization` 收敛目录及授权行。

## 禁止事项

- 不直接修改数据库维护授权。
- 不把默认值或权限依赖补齐放回运行时。
- 不在业务 service / view 中自行拼装权限结果。
- 不只修改前端而遗漏后端声明。

## 数据流

`业务 authorization.py → registry/constants → 权限目录同步 → 角色模板/用户最终授权 → engine 判定`
