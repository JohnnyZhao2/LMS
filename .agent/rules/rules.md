---
trigger: always_on
---

# LMS 项目规范 (精简版)

> 详细操作流程请使用 `/lms` 工作流

## 核心原则

- **No backward compatibility** - Break old formats freely
- **多角色检查** - 修改页面时检查学员、导师、室经理、管理员、团队经理是否共用
- **对于用户的贴图或页面代码仅参考布局** - 颜色主题使用现有样式，文字换成英文

## 字段变更必做

1. 更新 `models.py` 字段定义和文档字符串
2. 使用 MCP (`mcp_dbhub_execute_sql`) 直接执行 SQL
3. 全局搜索 (`rg`) 所有引用位置
4. 更新：序列化器 → 视图 → 服务层 → 前端类型/组件

## 代码规范速查

### 文件重命名规范
当需要重命名文件时，必须按以下顺序操作：
1. **先使用 `mv` 命令重命名文件**（保持 git 历史连续性）
2. **更新文件内容**（组件名、接口名等）
3. **最后更新所有导入该文件的地方**

不要采用"创建新文件 → 更新导入 → 删除旧文件"的方式。

### 前端
- 路径别名：`@/` 替代 `../../../`
- API hooks → `features/*/api/`，UI hooks → `features/*/hooks/`
- 禁止跨 feature 导入
- Mock 数据 → `src/testing/mocks/`

### 后端
- URL 连字符：`/api/spot-checks/`
- 字段下划线：`created_at`
- 布尔字段 `is_` 前缀：`is_active`
- 业务逻辑 → `services.py`
- 查询优化：`select_related` / `prefetch_related`

## 错误码参考

| 错误码 | 描述 |
|--------|------|
| AUTH_INVALID_CREDENTIALS | 用户名或密码错误 |
| AUTH_USER_INACTIVE | 用户已被停用 |
| USER_HAS_DATA | 用户已有关联数据 |
| RESOURCE_REFERENCED | 资源被引用 |
| PERMISSION_DENIED | 无权执行此操作 |
