---
name: code-cleanup
description: 代码清理与重构工具。用于：(1) 发现并删除冗余/重复代码，(2) 识别并清理旧代码与兼容代码，(3) 合并相似逻辑，(4) 统一代码风格。当用户提到"清理代码"、"删除冗余"、"重构"、"统一风格"、"找重复代码"时触发。
---

# Code Cleanup Skill

清理 vibecoding 产生的代码混乱：冗余逻辑、重复实现、旧代码、兼容层。

## 目标范围识别

用户说"清理 X 模块"时，必须同时扫描前后端：

| 用户说 | 扫描范围 |
|--------|----------|
| "清理 user 模块" | `lms_backend/apps/users/` + `lms_frontend/src/features/users/` |
| "清理 task 模块" | `lms_backend/apps/tasks/` + `lms_frontend/src/features/tasks/` |
| "清理前端" | `lms_frontend/src/` |
| "清理后端" | `lms_backend/apps/` |
| "清理代码" | 全栈扫描 |

## 工作流程

### 1. 扫描阶段

按优先级扫描（前后端并行）：

```
1. 死代码（未使用的导入、函数、变量）
2. 重复实现（相似功能的多个版本）
3. 兼容代码（TODO/FIXME/DEPRECATED 标记、旧 API 适配）
4. 风格不一致（命名、结构、模式）
```

### 2. 分析工具

**前端死代码检测**：
```bash
npx knip                           # 未使用导出/依赖
npx ts-prune                       # 未使用 TS 导出
```

**后端死代码检测**：
```bash
vulture . --min-confidence 80      # Python 死代码
```

**重复代码检测**：
```bash
# 前端
npx jscpd src/ --min-lines 5 --reporters console

# 后端  
pylint --disable=all --enable=duplicate-code lms_backend/
```

**手动扫描模式**（当工具不可用时）：
```bash
# 前后端同时扫描
grep -r "TODO\|FIXME\|DEPRECATED\|HACK\|XXX" --include="*.py" --include="*.ts" --include="*.tsx"
grep -r "# old\|// old\|legacy\|compat\|backward" --include="*.py" --include="*.ts" --include="*.tsx"
```

### 3. 清理策略

| 类型 | 策略 |
|------|------|
| 未使用导入 | 直接删除 |
| 未使用函数/变量 | 确认无引用后删除 |
| 重复实现 | 提取到共享模块（前端 `lib/`，后端 `core/`） |
| 兼容代码 | 确认旧格式无使用后删除 |
| 风格不一致 | 统一到项目主流风格 |

### 4. 前端特定清理

| 问题类型 | 清理方式 |
|----------|----------|
| 重复颜色/样式配置 | 提取到 `lib/` 或 CSS 变量 |
| 重复 API hooks | 提取公共逻辑到辅助函数 |
| 重复组件逻辑 | 提取到共享组件或 hooks |
| 重复类型定义 | 统一到 `types/` |

### 5. 后端特定清理

| 问题类型 | 清理方式 |
|----------|----------|
| 重复验证逻辑 | 提取到 serializer 公共函数 |
| 重复权限检查 | 统一使用 `get_current_role()` |
| 重复查询逻辑 | 提取到 repository |
| 重复业务逻辑 | 提取到 service |

### 6. 安全检查

删除前必须验证：
```
1. LSP 引用检查：lsp_find_references 确认无使用
2. 全局搜索：grep 确认无字符串引用
3. 测试运行：确认删除后测试通过
4. 前端：npm run lint && npm run build
5. 后端：python -m pytest tests/ -v
```

### 7. 前后端对接验证

清理完成后必须验证前后端对接：

| 检查项 | 方法 |
|--------|------|
| API 字段一致性 | 对比前端 `types/api.ts` 与后端 serializer 字段 |
| API 路径一致性 | 对比前端 API hooks 与后端 urls.py |
| 请求/响应格式 | 检查前端请求参数与后端 serializer 输入字段 |
| 错误处理 | 确认前端能正确处理后端返回的错误格式 |

**快速验证命令**：
```bash
# 启动后端
cd lms_backend && python manage.py runserver --settings=config.settings.development &

# 启动前端
cd lms_frontend && npm run dev &

# 或使用 playwright 自动化测试（如果有）
```

**手动检查清单**：
- [ ] 清理涉及的 API 端点能正常调用
- [ ] 前端页面能正常渲染数据
- [ ] 表单提交能正常工作
- [ ] 错误提示能正常显示

## 清理模式

### 模式 A：快速扫描
仅报告问题，不修改代码。用于评估清理工作量。

### 模式 B：交互式清理
逐项确认后删除。适合不确定影响范围时。

### 模式 C：批量清理
自动清理明确的死代码（未使用导入等）。需用户明确授权。

## 输出格式

```markdown
## 清理报告

### 后端 (lms_backend/)

#### 死代码
- [ ] `apps/users/services.py:L78` - 冗余导入 `from .models import UserRole`

#### 重复代码
- [ ] `apps/users/permissions.py` - 7处重复的 current_role 检测逻辑

### 前端 (lms_frontend/)

#### 死代码
- [ ] `features/users/components/user-form.tsx:L163` - 未使用的 roleConfigs

#### 重复代码
- [ ] `user-form.tsx` 与 `user-list.tsx` - 重复的角色颜色配置

### 建议操作
1. 后端：统一使用 `get_current_role()` 函数
2. 前端：提取角色配置到 `lib/role-config.ts`
```

## 注意事项

- 不删除测试代码（除非用户明确要求）
- 不删除注释文档（除非明确是过时的）
- 每次清理后运行 `lsp_diagnostics` 验证
- 大规模清理分批进行，每批验证
- **必须同时考虑前后端**，避免只清理一端
