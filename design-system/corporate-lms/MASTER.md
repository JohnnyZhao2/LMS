# 设计系统主文件

> **逻辑：** 构建特定页面时，首先检查 `design-system/corporate-lms/pages/[页面名称].md`。
> 如果该文件存在，其规则**覆盖**此主文件。
> 如果不存在，严格遵循以下规则。

---

**项目：** Corporate LMS (企业培训系统)
**生成时间：** 2026-01-22
**类别：** B2B 服务 / 企业培训平台
**技术栈：** React + TypeScript + Tailwind CSS 4.x + Radix UI + Framer Motion

---

## 🎨 色彩系统（扁平设计）

### 主要颜色

| 角色 | 十六进制 | CSS 变量 | Tailwind | 用途 |
|------|-----|--------------|----------|-------|
| **主色** | `#3B82F6` | `--color-primary` | `blue-600` | 主要操作、链接、焦点状态 |
| 主色悬停 | `#2563EB` | `--color-primary-hover` | `blue-700` | 主要元素的悬停状态 |
| **辅助色** | `#10B981` | `--color-secondary` | `emerald-500` | 成功状态、积极操作 |
| 辅助色悬停 | `#059669` | `--color-secondary-hover` | `emerald-600` | 辅助元素的悬停状态 |
| **强调色** | `#F59E0B` | `--color-accent` | `amber-500` | 高亮、徽章、警告 |
| 强调色悬停 | `#D97706` | `--color-accent-hover` | `amber-600` | 强调元素的悬停状态 |
| **行动号召** | `#F97316` | `--color-cta` | `orange-500` | 行动号召按钮（推荐用于新设计） |

### 基础颜色

| 角色 | 十六进制 | CSS 变量 | Tailwind | 用途 |
|------|-----|--------------|----------|-------|
| 背景 | `#FFFFFF` | `--color-background` | `white` | 页面背景 |
| 前景 | `#111827` | `--color-foreground` | `gray-900` | 主要文本颜色 |
| 柔和 | `#F3F4F6` | `--color-muted` | `gray-100` | 次要背景、禁用状态 |
| 柔和悬停 | `#E5E7EB` | `--color-muted-hover` | `gray-200` | 柔和元素的悬停状态 |
| 边框 | `#E5E7EB` | `--color-border` | `gray-200` | 边框、分隔线 |
| 文本柔和 | `#6B7280` | `--color-text-muted` | `gray-500` | 次要文本、描述 |

### 状态颜色

| 角色 | 十六进制 | CSS 变量 | Tailwind | 用途 |
|------|-----|--------------|----------|-------|
| 成功 | `#10B981` | `--color-success-500` | `emerald-500` | 成功消息、已完成任务 |
| 错误 | `#EF4444` | `--color-error-500` | `red-500` | 错误消息、破坏性操作 |
| 警告 | `#F59E0B` | `--color-warning-500` | `amber-500` | 警告消息、待处理状态 |

### 主色色阶（蓝色）

| 色阶 | 十六进制 | CSS 变量 | Tailwind |
|-------|-----|--------------|----------|
| 50 | `#EFF6FF` | `--color-primary-50` | `blue-50` |
| 100 | `#DBEAFE` | `--color-primary-100` | `blue-100` |
| 200 | `#BFDBFE` | `--color-primary-200` | `blue-200` |
| 300 | `#93C5FD` | `--color-primary-300` | `blue-300` |
| 400 | `#60A5FA` | `--color-primary-400` | `blue-400` |
| 500 | `#3B82F6` | `--color-primary-500` | `blue-500` |
| 600 | `#2563EB` | `--color-primary-600` | `blue-600` |
| 700 | `#1D4ED8` | `--color-primary-700` | `blue-700` |

### 灰度色阶

| 色阶 | 十六进制 | CSS 变量 | Tailwind |
|-------|-----|--------------|----------|
| 50 | `#F9FAFB` | `--color-gray-50` | `gray-50` |
| 100 | `#F3F4F6` | `--color-gray-100` | `gray-100` |
| 200 | `#E5E7EB` | `--color-gray-200` | `gray-200` |
| 300 | `#D1D5DB` | `--color-gray-300` | `gray-300` |
| 400 | `#9CA3AF` | `--color-gray-400` | `gray-400` |
| 500 | `#6B7280` | `--color-gray-500` | `gray-500` |
| 600 | `#4B5563` | `--color-gray-600` | `gray-600` |
| 700 | `#374151` | `--color-gray-700` | `gray-700` |
| 800 | `#1F2937` | `--color-gray-800` | `gray-800` |
| 900 | `#111827` | `--color-gray-900` | `gray-900` |

---

## 🔤 字体系统

### 当前字体（生产环境）

- **字体家族：** Outfit（几何无衬线字体）
- **字重：** 400（常规）、500（中等）、600（半粗）、700（粗体）、800（特粗）
- **Google Fonts：** https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap

**CSS 导入：**
```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
```

**Tailwind 配置：**
```js
fontFamily: {
  sans: ['Outfit', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
}
```

### 备选字体推荐

- **标题字体：** Poppins（几何无衬线字体）
- **正文字体：** Open Sans（人文主义无衬线字体）
- **风格：** 现代、专业、清晰、企业、友好、平易近人

**CSS 导入：**
```css
@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap');
```

**Tailwind 配置：**
```js
fontFamily: {
  heading: ['Poppins', 'sans-serif'],
  body: ['Open Sans', 'sans-serif'],
}
```

### 字体规则

- **标题：** `font-bold tracking-tight` 配合 `letter-spacing: -0.02em`
- **正文：** `font-sans antialiased`
- **主要文本：** `#111827`（gray-900）高对比度
- **次要文本：** `#6B7280`（gray-500）柔和内容
- **选择颜色：** `bg-[#3B82F6] text-white`

---

## 📐 间距系统

| 令牌 | 值 | Tailwind | 用途 |
|-------|-------|----------|-------|
| `--space-xs` | `4px` / `0.25rem` | `space-1` | 紧密间隙、图标间距 |
| `--space-sm` | `8px` / `0.5rem` | `space-2` | 图标间隙、行内间距 |
| `--space-md` | `16px` / `1rem` | `space-4` | 标准内边距、间隙 |
| `--space-lg` | `24px` / `1.5rem` | `space-6` | 区块内边距 |
| `--space-xl` | `32px` / `2rem` | `space-8` | 大间隙、卡片内边距 |
| `--space-2xl` | `48px` / `3rem` | `space-12` | 区块外边距 |
| `--space-3xl` | `64px` / `4rem` | `space-16` | 英雄区内边距、页面区块 |

---

## 🔘 圆角

| 令牌 | 值 | Tailwind | 用途 |
|-------|-------|----------|-------|
| `--radius-sm` | `4px` | `rounded` | 小元素、徽章 |
| `--radius-md` | `6px` | `rounded-md` | 按钮、输入框 |
| `--radius-lg` | `8px` | `rounded-lg` | 卡片、模态框 |
| `--radius-xl` | `12px` | `rounded-xl` | 大卡片 |
| `--radius-2xl` | `16px` | `rounded-2xl` | 英雄区 |
| `--radius-3xl` | `24px` | `rounded-3xl` | 特色卡片 |

---

## 🎭 动画系统

### 动画类型

| 动画 | 持续时间 | 缓动 | 用途 |
|-----------|----------|--------|-------|
| `fadeIn` | `0.4s` | `cubic-bezier(0.16, 1, 0.3, 1)` | 通用入场 |
| `fadeInUp` | `0.5s` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | 卡片、区块 |
| `fadeInDown` | `0.5s` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | 下拉菜单、模态框 |
| `scaleIn` | `0.3s` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | 按钮、徽章 |
| `slideInLeft` | `0.4s` | `cubic-bezier(0.16, 1, 0.3, 1)` | 侧边栏 |
| `slideInRight` | `0.4s` | `cubic-bezier(0.16, 1, 0.3, 1)` | 面板 |
| `shimmer` | `2s` | `linear`（无限循环） | 加载状态 |

### 持续时间预设

| 预设 | 值 | 用途 |
|--------|-------|-------|
| `fast` | `0.15s` | 微交互、悬停状态 |
| `base` | `0.2s` | 标准过渡 |
| `slow` | `0.3s` | 复杂动画、页面过渡 |

### 交错延迟

| 类名 | 延迟 | 用途 |
|-------|-------|-------|
| `.stagger-delay-1` | `0.1s` | 第一项 |
| `.stagger-delay-2` | `0.2s` | 第二项 |
| `.stagger-delay-3` | `0.3s` | 第三项 |
| `.stagger-delay-4` | `0.4s` | 第四项 |
| `.stagger-delay-5` | `0.5s` | 第五项 |

### 特殊效果

| 效果 | 描述 | 用途 |
|--------|-------------|-------|
| `.clay-shadow` | 带内阴影的拟物化效果 | 交互卡片、按钮 |
| `.soft-press` | 活动时缩小（0.96） | 按钮、可点击元素 |
| `.backdrop-blur-screen` | 背景模糊（40px）+ 饱和度（180%） | 模态框、遮罩层 |

### 减少动画

所有动画都尊重 `prefers-reduced-motion: reduce` 并会自动禁用。

---

## 🧩 组件规范

### 按钮

**变体：**
- `default` - 蓝色背景、白色文本、悬停时缩放
- `destructive` - 红色背景、白色文本、悬停时缩放
- `outline` - 透明背景、蓝色边框、悬停时填充
- `secondary` - 灰色背景、深色文本、悬停时缩放
- `ghost` - 透明背景、深色文本、悬停时灰色背景
- `link` - 蓝色文本、悬停时下划线
- `success` - 翠绿背景、白色文本、悬停时缩放

**尺寸：**
- `sm` - `h-9 px-4 text-sm rounded-md`
- `default` - `h-12 px-6 py-3 text-base rounded-md`
- `lg` - `h-14 px-8 text-lg rounded-lg`
- `icon` - `h-12 w-12 rounded-md`

**基础样式：**
- `font-bold tracking-wide`
- `transition-all duration-200`
- `active:scale-95`
- `focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2`

### 卡片

**基础样式：**
```css
background: white;
border: 1px solid #E5E7EB;
border-radius: 8px;
padding: 24px;
transition: all 200ms ease;
```

**悬停状态：**
```css
transform: translateY(-2px);
box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
```

**变体：**
- 带边框的标准卡片
- 灰色背景的柔和卡片
- 带悬停效果的交互卡片

### 输入框

**基础样式：**
```css
padding: 12px 16px;
border: 1px solid #E5E7EB;
border-radius: 6px;
font-size: 16px;
transition: border-color 200ms ease;
```

**焦点状态：**
```css
border-color: #3B82F6;
outline: none;
box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
```

### 模态框

**遮罩层：**
```css
background: rgba(0, 0, 0, 0.5);
backdrop-filter: blur(4px);
```

**模态框：**
```css
background: white;
border-radius: 16px;
padding: 32px;
box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
max-width: 500px;
```

---

## 🎨 设计风格

**风格：** 扁平设计 + 微妙深度

**关键词：** 清晰、简洁、最小阴影、高对比度、几何、无衬线、色彩聚焦、功能性

**最适合：** 企业应用、仪表盘、培训平台、SaaS 工具、专业服务

**关键特征：**
- 最小使用阴影（仅用于深度层次）
- 清晰边框而非重阴影
- 聚焦于颜色、字体和间距
- 微妙的悬停效果（缩放、颜色过渡）
- 高对比度以提高可读性
- 交互元素的拟物化效果

---

## ❌ 反模式（禁止使用）

### 视觉反模式
- ❌ **使用 emoji 作为图标** — 使用 SVG 图标（Lucide、Heroicons、Simple Icons）
- ❌ **幼稚/玩闹设计** — 保持专业和清晰
- ❌ **AI 紫色/粉色渐变** — 避免通用 AI 美学
- ❌ **到处使用重阴影** — 谨慎使用以表现深度
- ❌ **导致布局偏移的悬停效果** — 避免 scale 变换导致布局偏移

### 交互反模式
- ❌ **缺少 cursor:pointer** — 所有可点击元素必须有 cursor:pointer
- ❌ **瞬间状态变化** — 始终使用过渡动画（150-300ms）
- ❌ **不可见的焦点状态** — 焦点状态必须对无障碍可见

### 无障碍反模式
- ❌ **低对比度文本** — 保持 4.5:1 最低对比度
- ❌ **缺少 alt 文本** — 所有图片需要描述性 alt 文本
- ❌ **无键盘导航** — 所有交互元素必须支持键盘访问
- ❌ **忽略 reduced motion** — 尊重 prefers-reduced-motion 偏好

---

## ✅ 交付前检查清单

交付任何 UI 代码前，请验证：

### 视觉质量
- [ ] 没有使用 emoji 作为图标（使用 SVG 代替）
- [ ] 所有图标来自一致的图标集（Lucide/Heroicons）
- [ ] 悬停状态不会导致布局偏移
- [ ] 颜色匹配设计令牌
- [ ] 字体遵循系统规则

### 交互
- [ ] 所有可点击元素有 `cursor-pointer`
- [ ] 悬停状态提供清晰的视觉反馈
- [ ] 过渡动画流畅（150-300ms）
- [ ] 焦点状态对键盘导航可见
- [ ] 活动状态提供反馈（scale、color）

### 无障碍
- [ ] 文本对比度 4.5:1 最低（WCAG AA）
- [ ] 所有图片有 alt 文本
- [ ] 表单输入有标签
- [ ] 颜色不是唯一指示器
- [ ] 尊重 `prefers-reduced-motion`
- [ ] 键盘导航正常工作

### 响应式
- [ ] 在 375px（移动端）响应式
- [ ] 在 768px（平板）响应式
- [ ] 在 1024px（桌面）响应式
- [ ] 在 1440px（大桌面）响应式
- [ ] 移动端无横向滚动
- [ ] 内容不被固定导航栏遮挡

---

## 📦 组件库

**位置：** `/lms_frontend/src/components/ui/`

**总计组件：** 40 个

**关键组件：**
- `button.tsx` - 多变体按钮（CVA）
- `card.tsx` - 卡片容器
- `input.tsx` - 表单输入
- `dialog.tsx` - 模态对话框
- `dropdown-menu.tsx` - 下拉菜单
- `form.tsx` - 表单组件（React Hook Form）
- `badge.tsx` - 状态徽章
- `avatar.tsx` - 用户头像
- `skeleton.tsx` - 加载状态
- `spinner.tsx` - 加载指示器
- `animated-container.tsx` - 动画包装器
- `data-table/` - 可复用数据表组件
- `toast/sonner.tsx` - Toast 通知

**模式：** shadcn/ui 风格组件（复制粘贴，非 npm 包）

---

## 🔧 技术栈集成

### Tailwind CSS 4.x
- 设计令牌在 `index.css` 的 `@theme` 块中定义
- 实用优先方法
- 自定义实用类用于动画和效果

### Radix UI
- 无头组件原语
- 内置无障碍
- 无样式、完全可定制

### Framer Motion
- 页面过渡
- 组件动画
- 微交互
- 交错动画

### Class Variance Authority (CVA)
- 组件变体管理
- 类型安全变体
- 可组合样式

---

## 📚 AI 使用指南

构建组件时，AI 应该：

1. **首先阅读此文件**以了解设计系统
2. **检查页面特定覆盖规则** 在 `design-system/corporate-lms/pages/[页面名称].md`
3. **使用设计令牌**来自此文件（颜色、间距、字体）
4. **遵循组件规范**以保持一致的样式
5. **应用动画**来自动画系统
6. **对照检查清单验证**交付前
7. **避免反模式**上面列出的

**示例工作流程：**
```
1. AI 读取 MASTER.md
2. AI 检查 design-system/corporate-lms/pages/dashboard.md 是否存在
3. 如果存在，使用页面特定规则 + MASTER.md
4. 如果不存在，严格使用 MASTER.md
5. 遵循设计系统生成代码
6. 对照交付前检查清单验证
```

---

**最后更新：** 2026-01-22
**版本：** 1.0.0
