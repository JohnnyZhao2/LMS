---
name: code-cleanup
description: 代码清理与重构工具。用于：(1) 发现并删除冗余/重复代码，(2) 识别并清理旧代码与兼容代码，(3) 合并相似逻辑，(4) 统一代码风格。当用户提到"清理代码"、"删除冗余"、"重构"、"统一风格"、"找重复代码"时触发。
---

# Code Cleanup Skill

清理 vibecoding 产生的代码混乱：冗余逻辑、重复实现、旧代码、兼容层。

## 工作流程

### 1. 扫描阶段

按优先级扫描：

```
1. 死代码（未使用的导入、函数、变量）
2. 重复实现（相似功能的多个版本）
3. 兼容代码（TODO/FIXME/DEPRECATED 标记、旧 API 适配）
4. 风格不一致（命名、结构、模式）
```

### 2. 分析工具

**死代码检测**：
```bash
# 前端
npx knip                           # 未使用导出/依赖
npx ts-prune                       # 未使用 TS 导出

# 后端
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
```
grep -r "TODO\|FIXME\|DEPRECATED\|HACK\|XXX" --include="*.py" --include="*.ts" --include="*.tsx"
grep -r "# old\|// old\|legacy\|compat\|backward" --include="*.py" --include="*.ts" --include="*.tsx"
```

### 3. 清理策略

| 类型 | 策略 |
|------|------|
| 未使用导入 | 直接删除 |
| 未使用函数/变量 | 确认无引用后删除 |
| 重复实现 | 保留最完整版本，其他改为调用 |
| 兼容代码 | 确认旧格式无使用后删除 |
| 风格不一致 | 统一到项目主流风格 |

### 4. 安全检查

删除前必须验证：
```
1. LSP 引用检查：lsp_find_references 确认无使用
2. 全局搜索：grep 确认无字符串引用
3. 测试运行：确认删除后测试通过
```

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

### 死代码
- [ ] `path/file.py:L10` - 未使用函数 `old_handler`
- [ ] `path/file.ts:L25` - 未使用导入 `lodash`

### 重复代码
- [ ] `a.py:L10-30` 与 `b.py:L50-70` 相似度 85%

### 兼容代码
- [ ] `utils.py:L100` - DEPRECATED 标记

### 风格问题
- [ ] `services/` 目录混用 camelCase 和 snake_case
```

## 注意事项

- 不删除测试代码（除非用户明确要求）
- 不删除注释文档（除非明确是过时的）
- 每次清理后运行 `lsp_diagnostics` 验证
- 大规模清理分批进行，每批验证
