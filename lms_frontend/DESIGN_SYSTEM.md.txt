# LMS Design System

## 📊 组件清单

### UI 基础组件 (39个)
**表单类**
- Button, Input, Textarea
- Checkbox, Radio Group, Select, Searchable Select
- Segmented Control, Form, Date Picker, Calendar

**数据展示**
- Table, Data Table (+ Pagination, Column Header, Cells)
- Badge, Status Badge
- Progress, Skeleton
- Card, Stat Card, Action Card, Content Panel

**反馈类**
- Alert, Dialog, Confirm Dialog
- Popover, Tooltip, Sonner (Toast)
- Spinner, Empty State, Error Boundary

**导航/布局**
- Tabs, Dropdown Menu, Pagination
- Page Header, Separator, Scroll Area

**其他**
- Avatar

### 通用组件 (11个)
- User Avatar, Avatar Circle, Avatar Picker Popover
- User Info Row, User Picker Panel
- Status Dot, Category Badge, Metric Badge
- Icon Box, Option Item, Micro Label, Action Dropdown

### 布局组件 (3个)
- App Layout, Sidebar, Auth Layout

### 业务组件 (60+个)
按功能模块分类，详见各 feature 目录

---

## 🎨 Design Tokens

### 颜色系统

**主色 (Primary - Trust Blue)**
```css
--theme-primary: #2563EB
--theme-primary-hover: #1D4ED8
色阶: 50-700 (完整蓝色系)
```

**辅助色 (Secondary - Emerald)**
```css
--theme-secondary: #10B981
--theme-secondary-hover: #059669
色阶: 50-900 (完整翠绿系)
别名: success-*
```

**强调色 (Accent - Orange)**
```css
--theme-accent: #F97316
--theme-accent-hover: #EA580C
```

**警告色 (Warning - Amber)**
```css
--theme-warning: #F59E0B
--theme-warning-hover: #D97706
色阶: 50-900
```

**危险色 (Destructive - Red)**
```css
--theme-destructive: #EF4444
--theme-destructive-hover: #DC2626
色阶: 50-900
别名: error-*
```

**中性色 (Gray)**
```css
色阶: 50-900 (Slate 系)
--theme-gray-50: #F8FAFC
--theme-gray-500: #64748B
--theme-gray-900: #0F172A
```

**语义色**
```css
--theme-background: #FFFFFF (卡片背景)
--theme-foreground: #1E293B (主文本)
--theme-muted: #F1F5F9 (次要背景)
--theme-border: #E2E8F0 (边框)
--theme-text-muted: #64748B (次要文本)
```

### 间距系统
使用 Tailwind 标准间距 (4px 基准)
```
0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24...
对应: 0, 2px, 4px, 6px, 8px, 10px, 12px, 16px, 20px, 24px...
```

### 圆角系统
```css
--theme-radius-sm: 4px   /* 小元素 */
--theme-radius-md: 6px   /* 按钮、输入框 */
--theme-radius-lg: 8px   /* 卡片 */
--theme-radius-xl: 12px  /* 大卡片、模态框 */
```

### 字体系统
```css
--theme-font-sans: system-ui, PingFang SC, Microsoft YaHei
--theme-font-heading: 同上
```

**字号**
- xs: 12px
- sm: 13px
- base: 14px
- lg: 16px
- xl: 18px
- 2xl: 20px
- 3xl: 24px

**字重**
- normal: 400
- medium: 500
- semibold: 600
- bold: 700

### 阴影系统
```css
/* 当前未使用阴影，采用扁平设计 */
box-shadow: none
```

### 动画系统
```css
--theme-transition: 150ms ease

/* 预定义动画 */
fadeIn: 0.4s cubic-bezier(0.16, 1, 0.3, 1)
fadeInUp: 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)
shimmer: 2s infinite
soft-press: scale(0.96) on active
```

---

## 🔍 组件重复分析

### 🔴 高优先级整合

**1. Badge 组件族** (4个 → 1个)
- `Badge` (基础)
- `Status Badge` (状态)
- `Category Badge` (分类)
- `Metric Badge` (指标)

**建议**: 统一为 `Badge` + variants
```tsx
<Badge variant="default|status|category|metric" />
```

**2. Card 组件族** (6个 → 1个)
- `Card` (基础)
- `Stat Card` (统计)
- `Action Card` (操作)
- `Editorial Card` (编辑推荐)
- `Task Card` (任务)
- `Knowledge Card` (知识)

**建议**: 统一为 `Card` + composition
```tsx
<Card>
  <CardHeader />
  <CardContent />
  <CardFooter />
</Card>
```

**3. Avatar 组件族** (4个 → 1个)
- `Avatar` (基础)
- `User Avatar` (用户)
- `Avatar Circle` (圆形)
- `Avatar Picker Popover` (选择器)

**建议**: 统一为 `Avatar` + size variants

### 🟡 中优先级整合

**4. Form 组件族**
- `Task Form`
- `User Form`
- `Spot Check Form`
- `Quiz Form`

**建议**: 提取通用 `FormTemplate` 或 `FormLayout`

**5. List 组件族**
- `Task List`
- `User List`
- 各种业务列表

**建议**: 创建通用 `ListContainer` + `ListItem`

### 🟢 低优先级

**6. 其他业务组件**
保持独立，但遵循统一的设计规范

---

## 📋 重构计划

### Phase 1: Token 标准化 (1-2天)
- [ ] 审查所有组件的颜色使用
- [ ] 替换硬编码颜色为 CSS 变量
- [ ] 统一间距和圆角使用
- [ ] 建立 token 使用规范文档

### Phase 2: 基础组件整合 (3-5天)
- [ ] 重构 Badge 组件族
- [ ] 重构 Card 组件族
- [ ] 重构 Avatar 组件族
- [ ] 更新所有引用

### Phase 3: 组件文档化 (2-3天)
- [ ] 为每个基础组件编写文档
- [ ] 创建 Storybook 或组件展示页
- [ ] 编写使用示例

### Phase 4: 业务组件优化 (持续)
- [ ] 提取通用 Form 模板
- [ ] 提取通用 List 容器
- [ ] 优化长列表性能

---

## 🎯 设计原则

### 1. 一致性优先
- 所有组件使用统一的 design tokens
- 相同功能的组件应有相同的交互模式
- 保持视觉语言的一致性

### 2. 组合优于配置
- 优先使用组合模式而非大量 props
- 保持组件 API 简洁
- 通过组合实现复杂功能

### 3. 可访问性
- 所有交互组件支持键盘导航
- 提供合适的 ARIA 标签
- 保证足够的颜色对比度

### 4. 性能优先
- 避免不必要的重渲染
- 大列表使用虚拟滚动
- 懒加载非关键组件

### 5. 扁平化设计
- 不使用阴影（box-shadow: none）
- 使用边框和背景色区分层级
- 保持视觉简洁

---

## 🛠️ 技术栈

- **React**: 19.2.0
- **Tailwind CSS**: v4.1.18
- **Radix UI**: 各组件最新版
- **CVA**: class-variance-authority
- **Icons**: lucide-react
- **Form**: react-hook-form + zod
- **Toast**: sonner

---

## 📖 使用指南

### 颜色使用
```tsx
// ✅ 推荐：使用 Tailwind 类名
<div className="bg-primary text-white" />

// ✅ 推荐：使用 CSS 变量
<div style={{ color: 'var(--theme-primary)' }} />

// ❌ 避免：硬编码颜色
<div style={{ color: '#2563EB' }} />
```

### 间距使用
```tsx
// ✅ 推荐：使用 Tailwind 间距
<div className="p-4 gap-2" />

// ❌ 避免：自定义间距
<div style={{ padding: '15px' }} />
```

### 组件组合
```tsx
// ✅ 推荐：组合模式
<Card>
  <CardHeader>
    <CardTitle>标题</CardTitle>
  </CardHeader>
  <CardContent>内容</CardContent>
</Card>

// ❌ 避免：过多 props
<Card title="标题" content="内容" showFooter={true} />
```

---

## 🔗 相关文件

- **Token 定义**: `lms_frontend/src/index.css`
- **UI 组件**: `lms_frontend/src/components/ui/`
- **通用组件**: `lms_frontend/src/components/common/`
- **业务组件**: `lms_frontend/src/features/*/components/`
