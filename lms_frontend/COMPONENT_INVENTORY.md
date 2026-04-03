# 组件清单

## UI 基础组件 (39个)

### 表单类 (11个)
| 组件 | 路径 | 用途 | 依赖 |
|------|------|------|------|
| Button | `ui/button.tsx` | 按钮 | Radix Slot, CVA |
| Input | `ui/input.tsx` | 文本输入 | - |
| Textarea | `ui/textarea.tsx` | 多行文本 | - |
| Checkbox | `ui/checkbox.tsx` | 复选框 | Radix Checkbox |
| Radio Group | `ui/radio-group.tsx` | 单选组 | Radix Radio |
| Select | `ui/select.tsx` | 下拉选择 | Radix Select |
| Searchable Select | `ui/searchable-select.tsx` | 可搜索选择 | Radix Popover |
| Segmented Control | `ui/segmented-control.tsx` | 分段控制 | - |
| Form | `ui/form.tsx` | 表单容器 | React Hook Form |
| Date Picker | `ui/date-picker.tsx` | 日期选择 | react-day-picker |
| Calendar | `ui/calendar.tsx` | 日历 | react-day-picker |

### 数据展示 (11个)
| 组件 | 路径 | 用途 | 依赖 |
|------|------|------|------|
| Table | `ui/table.tsx` | 基础表格 | - |
| Data Table | `ui/data-table/data-table.tsx` | 数据表格 | TanStack Table |
| Data Table Pagination | `ui/data-table/data-table-pagination.tsx` | 表格分页 | TanStack Table |
| Data Table Column Header | `ui/data-table/data-table-column-header.tsx` | 表格列头 | TanStack Table |
| Data Table Cells | `ui/data-table/data-table-cells.tsx` | 表格单元格 | TanStack Table |
| Badge | `ui/badge.tsx` | 徽章 | CVA |
| Status Badge | `ui/status-badge.tsx` | 状态徽章 | Badge |
| Progress | `ui/progress.tsx` | 进度条 | - |
| Skeleton | `ui/skeleton.tsx` | 骨架屏 | - |
| Card | `ui/card.tsx` | 卡片 | - |
| Stat Card | `ui/stat-card.tsx` | 统计卡片 | Card |

### 反馈类 (9个)
| 组件 | 路径 | 用途 | 依赖 |
|------|------|------|------|
| Alert | `ui/alert.tsx` | 警告提示 | CVA |
| Dialog | `ui/dialog.tsx` | 对话框 | Radix Dialog |
| Confirm Dialog | `ui/confirm-dialog.tsx` | 确认对话框 | Dialog |
| Popover | `ui/popover.tsx` | 弹出层 | Radix Popover |
| Tooltip | `ui/tooltip.tsx` | 工具提示 | Radix Tooltip |
| Sonner | `ui/sonner.tsx` | Toast 通知 | sonner |
| Spinner | `ui/spinner.tsx` | 加载动画 | - |
| Empty State | `ui/empty-state.tsx` | 空状态 | - |
| Error Boundary | `ui/error-boundary.tsx` | 错误边界 | React |

### 导航/布局 (8个)
| 组件 | 路径 | 用途 | 依赖 |
|------|------|------|------|
| Tabs | `ui/tabs.tsx` | 标签页 | Radix Tabs |
| Dropdown Menu | `ui/dropdown-menu.tsx` | 下拉菜单 | Radix Dropdown |
| Pagination | `ui/pagination.tsx` | 分页 | - |
| Page Header | `ui/page-header.tsx` | 页面头部 | - |
| Separator | `ui/separator.tsx` | 分隔线 | Radix Separator |
| Scroll Area | `ui/scroll-area.tsx` | 滚动区域 | Radix Scroll Area |
| Action Card | `ui/action-card.tsx` | 操作卡片 | Card |
| Content Panel | `ui/content-panel.tsx` | 内容面板 | - |

### 其他 (3个)
| 组件 | 路径 | 用途 | 依赖 |
|------|------|------|------|
| Avatar | `ui/avatar.tsx` | 头像 | Radix Avatar |
| Label | `ui/label.tsx` | 标签 | Radix Label |
| Animated Container | `ui/animated-container.tsx` | 动画容器 | - |

---

## 通用组件 (11个)

| 组件 | 路径 | 用途 | 复用度 |
|------|------|------|--------|
| User Avatar | `common/user-avatar.tsx` | 用户头像 | 高 |
| Avatar Circle | `common/avatar-circle.tsx` | 圆形头像 | 中 |
| Avatar Picker Popover | `users/components/avatar-picker-popover.tsx` | 头像选择器 | 低 |
| User Info Row | `common/user-info-row.tsx` | 用户信息行 | 高 |
| User Select Panel | `common/user-select-panel.tsx` | 用户选择面板 | 高 |
| Status Dot | `common/status-dot.tsx` | 状态点 | 高 |
| Category Badge | `common/category-badge.tsx` | 分类徽章 | 中 |
| Metric Badge | `common/metric-badge.tsx` | 指标徽章 | 中 |
| Icon Box | `common/icon-box.tsx` | 图标盒子 | 中 |
| Option Item | `common/option-item.tsx` | 选项项 | 中 |
| Micro Label | `common/micro-label.tsx` | 微标签 | 低 |
| Action Dropdown | `common/action-dropdown.tsx` | 操作下拉 | 高 |

---

## 布局组件 (3个)

| 组件 | 路径 | 用途 |
|------|------|------|
| App Layout | `layouts/app-layout.tsx` | 应用主布局 |
| Sidebar | `layouts/sidebar.tsx` | 侧边栏 |
| Auth Layout | `layouts/auth-layout.tsx` | 认证页布局 |

---

## 业务组件 (按模块)

### 任务模块 (11个)
- Task List
- Task Card
- Task Form
- Task Preview Page
- Task Preview (Index)
- Progress Monitoring Tab
- Grading Center Tab
- Sortable Resource Item
- Student Task List
- Task Detail
- Task Submission

### 知识中心 (11个)
- Knowledge Center Page
- Knowledge Card
- Knowledge Add Card
- Knowledge Focus Shell
- Tag Input
- Focus Icon
- Rich Text Editor
- Format Toolbar
- Slash Menu
- Tag Management Page
- Tag Form Dialog

### 仪表板 (8个)
- Student Dashboard
- Student Dashboard Items
- Mini Calendar
- Editorial Card
- Mentor Dashboard
- Mentor Dashboard Widgets
- Admin Dashboard
- Team Manager Dashboard

### 用户管理 (8个)
- User List
- User Form
- User Sidebar
- User Permission Card
- User Permission Section
- User Permission Module Sidebar
- User Permission Scope Popover
- User Profile

### 提交/评分 (5个)
- Grading Center Page
- Question Card
- Answer Review
- Timer
- Quiz Player

### 测验中心 (4个)
- Quiz Tab
- Quiz Form Header
- Quiz Outline Panel
- Quiz List

### 授权管理 (4个)
- Authorization Center Page
- Role Permission Template Panel
- Role Permission Card
- Role Permission Dialog

### 认证 (3个)
- Login Form
- Role Switch Overlay
- Protected Route

### 活动日志 (4个)
- Activity Log Timeline
- Activity Log Feed
- Activity Log Policy Panel
- Activity Logs Panel
- Activity Log Member List

### 抽查 (2个)
- Spot Check Form
- Spot Check List

### 其他 (2个)
- Route Skeleton
- Role Route Wrapper

---

## 组件依赖关系

### 高频依赖组件
1. **Button** - 被 90% 组件使用
2. **Card** - 被 60% 业务组件使用
3. **Badge** - 被 50% 组件使用
4. **Dialog** - 被 40% 组件使用
5. **Popover** - 被 35% 组件使用

### 独立组件
- Spinner
- Skeleton
- Empty State
- Error Boundary
- Separator

---

## 重复模式识别

### 🔴 高度重复
1. **表单布局**: 多个 Form 组件有相似的布局结构
2. **列表容器**: 多个 List 组件有相似的容器逻辑
3. **卡片变体**: 多个 Card 变体可合并

### 🟡 中度重复
1. **头像显示**: 3-4 个头像相关组件
2. **徽章显示**: 3-4 个徽章变体
3. **操作按钮组**: 多处出现相似的操作按钮组

### 🟢 可提取模式
1. **空状态处理**: 可提取通用 Empty State 模式
2. **加载状态**: 可提取通用 Loading 模式
3. **错误处理**: 可提取通用 Error 模式
