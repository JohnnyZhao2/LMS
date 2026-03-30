# Token 审计报告

生成时间: 2026-03-30

## 📊 审计概览

### 发现的问题
- ✅ **自定义间距**: 0 处（良好）
- ⚠️ **硬编码颜色**: 20+ 处（需要修复）
- ⚠️ **自定义圆角**: 多处（需要统一）
- ⚠️ **自定义边框宽度**: 多处（需要统一）

---

## 🎨 硬编码颜色分析

### 知识中心模块 (Knowledge Center)

**文件**: `src/features/knowledge/components/cards/knowledge-card.tsx`

```tsx
// ❌ 问题代码
border-[#a8b8cc]
border-[#d9e0ea]
text-[#1f2937]

// ✅ 应改为
border-gray-300
border-gray-200
text-foreground
```

**文件**: `src/features/knowledge/components/knowledge-center.tsx`

```tsx
// ❌ 问题代码
bg-[#fcfbf8]        // 米白色背景
border-[#9bd1d8]    // 青色圆点
border-[#c8ff00]    // 黄绿色圆点
border-[#ff8aa0]    // 粉色圆点
border-[#2a6ce5]    // 蓝色圆点
text-[#44526d]      // 标题颜色
text-[#6f81a0]      // 描述颜色
border-[#d8e1ee]    // 输入框边框
text-[#667999]      // 输入框文本
placeholder:text-[#8da0be]  // 占位符
focus:border-[#c5d3e7]      // 聚焦边框

// ✅ 应改为
bg-background
border-primary-300
border-secondary-300
border-destructive-300
border-primary-600
text-foreground
text-text-muted
border-border
text-foreground
placeholder:text-text-muted
focus:border-primary
```

### 侧边栏模块 (Sidebar)

**文件**: `src/components/layouts/sidebar.tsx`

```tsx
// ❌ 问题代码
text-[#757575]      // 未激活文本
text-[#D55F5A]      // 危险操作
bg-[#F6F6F6]        // 悬停背景
bg-[#E8E8E8]        // 分隔线

// ✅ 应改为
text-text-muted
text-destructive
bg-muted
bg-border
```

---

## 📐 自定义圆角分析

### 发现的自定义圆角值

```tsx
// Knowledge Card
rounded-[7px]       // 应改为 rounded-lg (8px)

// Knowledge Center Dialog
rounded-[12px]      // 应改为 rounded-xl (12px) ✅ 已对齐

// 其他
rounded-tl-[7px]    // 应改为 rounded-tl-lg
```

**建议**: 统一使用 `rounded-sm/md/lg/xl`

---

## 📏 自定义边框宽度分析

### 发现的自定义边框宽度

```tsx
border-[2.5px]      // 多处使用
border-[1.5px]      // 少量使用

// 标准值
border    = 1px
border-2  = 2px
border-4  = 4px
```

**建议**:
- `border-[2.5px]` → `border-2` (2px)
- `border-[1.5px]` → `border` (1px) 或 `border-2` (2px)

---

## 🎯 优先级修复列表

### P0 - 高优先级 (影响一致性)

1. **知识中心颜色系统**
   - 文件: `knowledge-center.tsx`, `knowledge-card.tsx`
   - 问题: 大量硬编码颜色，与主题不一致
   - 影响: 无法切换主题，维护困难
   - 工作量: 2-3 小时

2. **侧边栏颜色**
   - 文件: `sidebar.tsx`
   - 问题: 硬编码灰色和红色
   - 影响: 与设计系统不一致
   - 工作量: 1 小时

### P1 - 中优先级 (影响可维护性)

3. **圆角统一**
   - 文件: 多个文件
   - 问题: 使用 `rounded-[7px]` 而非标准值
   - 影响: 视觉不一致
   - 工作量: 1-2 小时

4. **边框宽度统一**
   - 文件: 多个文件
   - 问题: 使用 `border-[2.5px]`
   - 影响: 细微视觉差异
   - 工作量: 1 小时

### P2 - 低优先级 (可延后)

5. **其他零散硬编码颜色**
   - 工作量: 按需修复

---

## 🔧 修复建议

### 1. 知识中心主题化

创建知识中心专用的主题变量：

```css
/* index.css */
:root {
  /* Knowledge Center 专用色 */
  --knowledge-bg: #fcfbf8;
  --knowledge-accent-1: #9bd1d8;
  --knowledge-accent-2: #c8ff00;
  --knowledge-accent-3: #ff8aa0;
  --knowledge-accent-4: #2a6ce5;
}

/* 或者映射到现有 token */
:root {
  --knowledge-bg: var(--theme-background);
  --knowledge-accent-1: var(--theme-primary-300);
  --knowledge-accent-2: var(--theme-secondary-300);
  --knowledge-accent-3: var(--theme-destructive-300);
  --knowledge-accent-4: var(--theme-primary-600);
}
```

### 2. 创建迁移脚本

```bash
# 批量替换脚本
sed -i '' 's/text-\[#757575\]/text-text-muted/g' src/**/*.tsx
sed -i '' 's/bg-\[#F6F6F6\]/bg-muted/g' src/**/*.tsx
sed -i '' 's/rounded-\[7px\]/rounded-lg/g' src/**/*.tsx
```

### 3. 添加 ESLint 规则

```js
// .eslintrc.js
rules: {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
      message: '禁止使用硬编码颜色，请使用 design tokens'
    }
  ]
}
```

---

## 📈 修复进度追踪

### 知识中心模块
- [ ] knowledge-card.tsx
- [ ] knowledge-center.tsx
- [ ] knowledge-focus-shell.tsx
- [ ] tag-input.tsx

### 布局模块
- [ ] sidebar.tsx
- [ ] app-layout.tsx

### 其他模块
- [ ] 待扫描

---

## 🎓 最佳实践

### ✅ 推荐做法

```tsx
// 使用 Tailwind 类名
<div className="bg-primary text-white border-border" />

// 使用 CSS 变量
<div style={{ color: 'var(--theme-primary)' }} />

// 使用标准圆角
<div className="rounded-lg" />
```

### ❌ 避免做法

```tsx
// 硬编码颜色
<div className="bg-[#2563EB]" />

// 硬编码间距
<div style={{ padding: '15px' }} />

// 自定义圆角
<div className="rounded-[7px]" />
```

---

## 📊 统计数据

| 指标 | 当前值 | 目标值 | 进度 |
|------|--------|--------|------|
| 硬编码颜色 | 20+ | 0 | 0% |
| 自定义间距 | 0 | 0 | ✅ 100% |
| 自定义圆角 | 5+ | 0 | 0% |
| Token 覆盖率 | ~70% | 100% | 70% |

---

## 🔗 相关文档

- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
- [REFACTOR_PLAN.md](./REFACTOR_PLAN.md)
- [COMPONENT_INVENTORY.md](./COMPONENT_INVENTORY.md)

---

## 下一步

1. 修复知识中心模块的硬编码颜色
2. 修复侧边栏模块的硬编码颜色
3. 统一圆角使用
4. 添加 ESLint 规则防止新增硬编码
5. 定期审计和更新