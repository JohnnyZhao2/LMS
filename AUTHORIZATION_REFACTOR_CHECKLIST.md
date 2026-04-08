# 授权迁移 Checklist

## 统一入口

- [x] 详情/单对象操作统一走 `apps.authorization.engine.enforce`
- [x] 列表/范围查询统一走 `apps.authorization.engine.scope_filter`
- [x] 不再新增业务层二次授权判断

## 后端检索项

- [x] 检查 `AuthorizationService.can(`：业务层已收口，保留认证 payload 与引擎内部依赖
- [x] 检查 `AuthorizationService.enforce(`：业务层直调已清理
- [x] 检查 `has_allow_override(`：仅引擎内部使用
- [x] 检查 `has_deny_override(`：仅授权服务内部使用
- [x] 检查 `get_accessible_students(`：业务层已清理
- [x] 检查 `get_accessible_student_ids(`：业务层已清理
- [x] 检查 `created_by == self.user.id`
- [x] 检查 `checker_id == self.user.id`
- [x] 检查 `is_admin_like_role(`：业务层角色硬编码基本清理，仅引擎内部资源约束保留

## 模块迁移状态

- [x] `tasks`
- [x] `spot_checks`
- [x] `questions`
- [x] `quizzes`
- [x] `knowledge`
- [x] `dashboard`
- [x] `users`
- [x] `grading`
- [x] `tags`
- [x] `activity_logs`
- [x] `authorization`

## 前端待清理项

- [x] 检查 `hasPermission(`：全局页面入口保留，资源级按钮已改为 actions/capabilities
- [x] 检查 `currentRole ===`：授权判断主链已清理，剩少量导航/展示用途
- [x] 清理前端 `allowedRoles` 路由守卫，学生作答/复盘/个人中心与团队看板已改为权限守卫
- [x] 检查 `isAdminLikeRole(`：业务授权链已清理
- [x] 检查 `created_by === user?.id`

## 性能检查

- [x] 列表页不逐条单独查授权
- [x] 先做 `scope_filter` 再算对象级动作
- [x] 动作计算依赖字段已 `select_related/prefetch_related`
- [x] 同请求内重复授权结果已缓存

## 回归检查

- [x] 角色默认权限未变
- [x] 用户 override 行为未变
- [x] 范围过滤结果未变
- [x] 详情/编辑/删除行为未变

## 剩余债务

- [x] 将角色识别与超管常量迁入 `apps.authorization.roles`，授权主链不再依赖 users 域中的角色助手
- [x] 删除 `apps.users.permissions`
- [x] 为同请求内重复 `authorize()` 结果增加 request-scope cache
- [x] Dashboard 入口已改为系统权限模板驱动，不再额外走 `allowed_roles` / dashboard 特判
- [ ] 继续清理前端纯展示层基于角色的文案/布局分支
