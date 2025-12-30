# Implementation Plan: Frontend Bulletproof Refactor

## Overview

本实施计划采用渐进式迁移策略，将 lms_frontend 从 Ant Design 迁移到 ShadCN UI + Tailwind CSS v4，同时按照 bulletproof-react 规范重构项目结构。

**核心原则：任何时候页面都必须可用，不能有中间状态导致空白。**

## Tasks

- [x] 1. 阶段一：基础设施搭建
  - 安装和配置 Tailwind CSS v4 + ShadCN UI
  - 确保与现有 Ant Design 共存
  - _Requirements: 24, 25, 26, 27_

- [x] 1.1 安装 Tailwind CSS v4 依赖
  - 运行 `npm install tailwindcss @tailwindcss/vite`
  - 更新 `vite.config.ts` 添加 Tailwind 插件
  - _Requirements: 24.1, 24.2_

- [x] 1.2 配置 Tailwind v4 CSS-first 主题
  - 在 `src/index.css` 顶部添加 `@import "tailwindcss"`
  - 添加 `@theme { }` 配置块，包含设计令牌
  - 保留现有 CSS 变量和 Ant Design 覆盖样式（共存）
  - _Requirements: 24.3, 24.4, 24.5_

- [x] 1.3 安装 ShadCN UI 相关依赖
  - 运行 `npm install clsx tailwind-merge class-variance-authority`
  - 运行 `npm install lucide-react`
  - 运行 `npm install @radix-ui/react-slot`
  - _Requirements: 25, 26.5_

- [x] 1.4 创建 ShadCN 工具函数
  - 创建 `src/lib/utils.ts` 包含 `cn()` 函数
  - _Requirements: 25.4_

- [x] 1.5 初始化 ShadCN UI 配置
  - 创建 `components.json` 配置文件
  - 配置组件目录为 `src/components/ui`
  - _Requirements: 25.1, 25.2, 25.3_

- [x] 1.6 验证基础设施
  - 确保现有页面正常工作
  - 确保 Tailwind 类名可用
  - 确保构建成功
  - _Requirements: 27.1_

- [x] 2. Checkpoint - 基础设施验证
  - 确保所有测试通过，现有页面正常工作
  - 如有问题请告知

- [x] 3. 阶段二：添加基础 ShadCN 组件
  - 添加核心 UI 组件
  - _Requirements: 29_

- [x] 3.1 添加 Button 组件
  - 创建 `src/components/ui/button.tsx`
  - 基于 ShadCN Button 组件
  - 自定义主色调为 #4D6CFF
  - _Requirements: 29.1, 29.2_

- [x] 3.2 添加 Card 组件
  - 创建 `src/components/ui/card.tsx`
  - 基于 ShadCN Card 组件
  - _Requirements: 29.1_

- [x] 3.3 添加 Input 和 Label 组件
  - 创建 `src/components/ui/input.tsx`
  - 创建 `src/components/ui/label.tsx`
  - _Requirements: 29.1_

- [x] 3.4 添加 Select 组件
  - 安装 `@radix-ui/react-select`
  - 创建 `src/components/ui/select.tsx`
  - _Requirements: 29.1_

- [x] 3.5 添加 Dialog 组件
  - 安装 `@radix-ui/react-dialog`
  - 创建 `src/components/ui/dialog.tsx`
  - _Requirements: 29.1_

- [x] 3.6 添加 Dropdown Menu 组件
  - 安装 `@radix-ui/react-dropdown-menu`
  - 创建 `src/components/ui/dropdown-menu.tsx`
  - _Requirements: 29.1_

- [x] 3.7 添加 Table 组件
  - 创建 `src/components/ui/table.tsx`
  - 基于 ShadCN Table 组件
  - _Requirements: 29.1_

- [x] 3.8 添加 Badge 组件
  - 创建 `src/components/ui/badge.tsx`
  - _Requirements: 29.1_

- [x] 3.9 添加 Avatar 组件
  - 安装 `@radix-ui/react-avatar`
  - 创建 `src/components/ui/avatar.tsx`
  - _Requirements: 29.1_

- [x] 3.10 添加 Skeleton 组件
  - 创建 `src/components/ui/skeleton.tsx`
  - _Requirements: 29.1_

- [x] 3.11 添加 Toast/Sonner 组件
  - 安装 `sonner`
  - 创建 `src/components/ui/sonner.tsx`
  - _Requirements: 26.4, 29.1_

- [x] 3.12 添加 Tabs 组件
  - 安装 `@radix-ui/react-tabs`
  - 创建 `src/components/ui/tabs.tsx`
  - _Requirements: 29.1_

- [x] 3.13 添加 Popover 组件
  - 安装 `@radix-ui/react-popover`
  - 创建 `src/components/ui/popover.tsx`
  - _Requirements: 29.1_

- [x] 3.14 添加 Calendar 和 DatePicker 组件
  - 安装 `react-day-picker date-fns`
  - 创建 `src/components/ui/calendar.tsx`
  - 创建 `src/components/ui/date-picker.tsx`
  - _Requirements: 26.2, 29.1_

- [x] 3.15 添加 Separator 组件
  - 安装 `@radix-ui/react-separator`
  - 创建 `src/components/ui/separator.tsx`
  - _Requirements: 29.1_

- [x] 3.16 添加 ScrollArea 组件
  - 安装 `@radix-ui/react-scroll-area`
  - 创建 `src/components/ui/scroll-area.tsx`
  - _Requirements: 29.1_

- [x] 4. Checkpoint - 基础组件验证
  - 确保所有组件可以正常导入
  - 确保现有页面不受影响
  - 如有问题请告知

- [x] 5. 阶段三：创建核心复合组件
  - 创建 DataTable、Form、Layout 等复合组件
  - _Requirements: 30, 31, 32_

- [x] 5.1 安装表单相关依赖
  - 运行 `npm install react-hook-form @hookform/resolvers zod`
  - _Requirements: 26.3_

- [x] 5.2 创建 Form 组件
  - 创建 `src/components/ui/form.tsx`
  - 集成 React Hook Form
  - 支持 Zod 验证
  - _Requirements: 32.1, 32.2, 32.3_

- [x] 5.3 安装 TanStack Table
  - 运行 `npm install @tanstack/react-table`
  - _Requirements: 26.1_

- [x] 5.4 创建 DataTable 组件
  - 创建 `src/components/ui/data-table/data-table.tsx`
  - 创建 `src/components/ui/data-table/data-table-pagination.tsx`
  - 创建 `src/components/ui/data-table/data-table-column-header.tsx`
  - 支持排序、筛选、分页
  - 支持中文分页文案
  - _Requirements: 31.1, 31.2, 31.3, 31.4_

- [x] 5.5 创建布局组件
  - 创建 `src/components/layouts/app-layout.tsx`
  - 创建 `src/components/layouts/content-layout.tsx`
  - 创建 `src/components/layouts/auth-layout.tsx`
  - 使用 Tailwind CSS 样式
  - _Requirements: 30.1, 30.2, 30.3_

- [x] 5.6 创建错误处理组件
  - 创建 `src/components/errors/main-error-fallback.tsx`
  - 使用 ShadCN Button 组件
  - _Requirements: 19.1, 19.2, 19.3_

- [x] 6. Checkpoint - 核心组件验证
  - 确保 DataTable 组件可以正常渲染数据
  - 确保 Form 组件可以正常验证
  - 确保布局组件可以正常使用
  - 如有问题请告知

- [x] 7. 阶段四：页面迁移 - 登录页面（试点）
  - 迁移登录页面作为试点
  - _Requirements: 33.1, 33.2, 33.3, 33.4_

- [x] 7.1 创建新的登录表单组件
  - 创建 `src/features/auth/components/login-form-new.tsx`
  - 使用 ShadCN Form + Input + Button
  - 使用 Zod 验证
  - 保留原有登录逻辑
  - _Requirements: 33.1_

- [x] 7.2 创建新的登录页面
  - 创建 `src/app/routes/auth/login-new.tsx`
  - 使用新的 auth-layout
  - 使用新的 login-form-new
  - _Requirements: 33.1_

- [x] 7.3 切换路由到新登录页面
  - 在路由配置中切换到新登录页面
  - 验证登录功能正常
  - _Requirements: 33.2, 33.3_

- [x] 7.4 清理旧登录页面代码
  - 删除旧的登录组件
  - 重命名新组件（移除 -new 后缀）
  - _Requirements: 33.4_

- [x] 8. Checkpoint - 登录页面验证
  - 确保登录功能正常
  - 确保样式正确
  - 如有问题请告知

- [ ] 9. 阶段五：页面迁移 - 仪表盘页面
  - 迁移仪表盘相关页面
  - ⚠️ **必须保持原页面的视觉设计和布局完全一致**
  - _Requirements: 33.1, 33.2_

- [x] 9.1 迁移主仪表盘页面
  - **迁移前**：先阅读原仪表盘组件代码，记录所有样式细节
  - 使用 ShadCN Card 替换 Ant Design Card，但必须复现原有样式
  - 保持原有的卡片布局、间距、阴影、圆角
  - 保持原有的统计数据展示样式
  - 保留原有数据逻辑和交互
  - **迁移后**：对比原页面，确保视觉效果一致
  - _Requirements: 33.1_

- [x] 9.2 验证并清理仪表盘页面
  - 验证页面功能正常
  - **验证视觉效果与原页面一致**
  - 删除旧组件
  - _Requirements: 33.2, 33.3_

- [x] 10. 阶段六：页面迁移 - 列表页面
  - 迁移使用表格的列表页面
  - ⚠️ **必须保持原页面的视觉设计和布局完全一致**
  - _Requirements: 33.1, 33.2_

- [x] 10.1 迁移用户管理列表页面
  - **迁移前**：先阅读原用户列表组件代码，记录所有样式细节
  - 使用新的 DataTable 组件，但必须复现原有表格样式
  - 保持原有的页面标题、搜索栏、筛选器布局
  - 保持原有的表格行高、列宽、对齐方式
  - 保持原有的操作按钮样式和位置
  - 保留原有数据逻辑和交互
  - **迁移后**：对比原页面，确保视觉效果一致
  - _Requirements: 33.1_

- [x] 10.2 迁移知识库列表页面
  - **迁移前**：先阅读原知识库列表组件代码
  - 使用新的 DataTable 组件，复现原有样式
  - 保持原有布局和视觉效果
  - _Requirements: 33.1_

- [x] 10.3 迁移任务列表页面
  - **迁移前**：先阅读原任务列表组件代码
  - 使用新的 DataTable 组件，复现原有样式
  - 保持原有布局和视觉效果
  - _Requirements: 33.1_

- [x] 10.4 迁移其他列表页面
  - 批改列表、测试中心列表、抽查列表等
  - 每个页面迁移前都要先阅读原组件代码
  - 每个页面迁移后都要对比原页面确保视觉一致
  - _Requirements: 33.1_

- [x] 11. Checkpoint - 列表页面验证
  - 确保所有列表页面功能正常
  - 确保分页、搜索、筛选正常
  - **确保所有列表页面视觉效果与原页面一致**
  - 如有问题请告知

- [x] 12. 阶段七：页面迁移 - 表单页面
  - 迁移创建/编辑表单页面
  - ⚠️ **必须保持原页面的视觉设计和布局完全一致**
  - _Requirements: 33.1, 33.2_

- [x] 12.1 迁移用户创建/编辑表单
  - **迁移前**：先阅读原用户表单组件代码，记录所有样式细节
  - 使用新的 Form 组件，但必须复现原有表单样式
  - 保持原有的表单布局（单列/双列/分组）
  - 保持原有的输入框样式、标签位置、间距
  - 保持原有的按钮样式和位置
  - 使用 Zod 验证，错误提示样式与原页面一致
  - **迁移后**：对比原页面，确保视觉效果一致
  - _Requirements: 33.1_

- [x] 12.2 迁移知识库创建/编辑表单
  - **迁移前**：先阅读原知识库表单组件代码
  - 使用新的 Form 组件，复现原有样式
  - 保持原有布局和视觉效果
  - _Requirements: 33.1_

- [x] 12.3 迁移任务创建/编辑表单
  - **迁移前**：先阅读原任务表单组件代码（这是最复杂的表单）
  - 使用新的 Form 组件，复现原有样式
  - 特别注意：任务表单有复杂的布局和交互，必须完整复现
  - 保持原有的步骤/分组布局
  - 保持原有的条件显示逻辑
  - _Requirements: 33.1_

- [x] 12.4 迁移其他表单页面
  - 题目、测验、抽查等表单
  - 每个页面迁移前都要先阅读原组件代码
  - 每个页面迁移后都要对比原页面确保视觉一致
  - _Requirements: 33.1_

- [x] 13. Checkpoint - 表单页面验证
  - 确保所有表单功能正常
  - 确保验证正常
  - **确保所有表单页面视觉效果与原页面一致**
  - 如有问题请告知

- [ ] 14. 阶段八：页面迁移 - 详情页面
  - 迁移详情展示页面
  - ⚠️ **必须保持原页面的视觉设计和布局完全一致**
  - _Requirements: 33.1, 33.2_

- [ ] 14.1 迁移用户详情页面
  - **迁移前**：先阅读原用户详情组件代码，记录所有样式细节
  - 使用 ShadCN Card、Badge 等组件，但必须复现原有样式
  - 保持原有的信息展示布局
  - 保持原有的卡片样式、间距、分组
  - **迁移后**：对比原页面，确保视觉效果一致
  - _Requirements: 33.1_

- [ ] 14.2 迁移知识库详情页面
  - **迁移前**：先阅读原知识库详情组件代码
  - 复现原有样式和布局
  - _Requirements: 33.1_

- [ ] 14.3 迁移任务详情页面
  - **迁移前**：先阅读原任务详情组件代码
  - 复现原有样式和布局
  - _Requirements: 33.1_

- [ ] 14.4 迁移其他详情页面
  - 每个页面迁移前都要先阅读原组件代码
  - 每个页面迁移后都要对比原页面确保视觉一致
  - _Requirements: 33.1_

- [ ] 15. Checkpoint - 详情页面验证
  - 确保所有详情页面功能正常
  - **确保所有详情页面视觉效果与原页面一致**
  - 如有问题请告知

- [ ] 16. 阶段九：布局和导航迁移
  - 迁移全局布局和导航组件
  - ⚠️ **必须保持原布局的视觉设计完全一致**
  - _Requirements: 30_

- [ ] 16.1 迁移 Header 组件
  - **迁移前**：先阅读原 Header 组件代码，记录所有样式细节
  - 创建新的 Header 使用 Tailwind CSS，但必须复现原有样式
  - 保持原有的高度、背景色、阴影
  - 保持原有的 Logo、导航项、用户菜单布局
  - 使用 ShadCN DropdownMenu，样式与原下拉菜单一致
  - **迁移后**：对比原 Header，确保视觉效果一致
  - _Requirements: 30.1_

- [ ] 16.2 迁移侧边栏/导航组件
  - **迁移前**：先阅读原侧边栏组件代码
  - 使用 Tailwind CSS 样式，复现原有样式
  - 保持原有的宽度、背景色、菜单项样式
  - 保持原有的展开/收起动画
  - _Requirements: 30.1_

- [ ] 16.3 切换到新布局
  - 在 App 中使用新的布局组件
  - 验证所有页面正常
  - **验证布局视觉效果与原布局一致**
  - _Requirements: 30.1_

- [ ] 17. Checkpoint - 布局验证
  - 确保所有页面布局正常
  - 确保导航功能正常
  - **确保布局视觉效果与原布局一致**
  - 如有问题请告知

- [ ] 18. 阶段十：清理和优化
  - 移除 Ant Design，清理旧代码
  - _Requirements: 28_

- [ ] 18.1 移除 Ant Design 依赖
  - 运行 `npm uninstall antd @ant-design/icons @ant-design/v5-patch-for-react-19`
  - _Requirements: 28.1_

- [ ] 18.2 清理 Provider
  - 从 `src/app/provider.tsx` 移除 Ant Design ConfigProvider
  - 移除 AntApp 组件
  - _Requirements: 28.2_

- [ ] 18.3 清理 CSS
  - 从 `src/index.css` 移除所有 Ant Design 覆盖样式
  - 保留 Tailwind v4 配置和通用样式
  - _Requirements: 28.4_

- [ ] 18.4 删除 theme.ts
  - 删除 `src/theme.ts` 文件（已被 Tailwind @theme 替代）
  - _Requirements: 28.3_

- [ ] 18.5 验证构建
  - 运行 `npm run build` 确保构建成功
  - 检查包体积是否减小
  - _Requirements: 28_

- [ ] 19. 阶段十一：ESLint 配置增强
  - 添加架构约束规则
  - _Requirements: 14_

- [ ] 19.1 安装 ESLint 插件
  - 安装 `eslint-plugin-import` 和 `eslint-plugin-check-file`
  - _Requirements: 14.1, 14.2_

- [ ] 19.2 配置跨功能模块导入限制
  - 添加 `import/no-restricted-paths` 规则
  - 禁止 features 之间相互导入
  - _Requirements: 14.1, 3.3_

- [ ] 19.3 配置单向架构规则
  - 禁止 shared 层导入 features 或 app
  - 禁止 features 导入 app
  - _Requirements: 14.1, 2.2, 2.3_

- [ ] 19.4 配置文件命名规范
  - 添加 `check-file` 规则
  - 强制 kebab-case 命名
  - _Requirements: 14.2, 4.1, 4.2_

- [ ] 19.5 配置导入排序
  - 添加 `import/order` 规则
  - _Requirements: 14.3_

- [ ] 20. 阶段十二：创建 Steering 规则
  - 创建 AI 代码生成规范
  - _Requirements: 34_

- [ ] 20.1 创建前端组件 Steering 文件
  - 创建 `.kiro/steering/frontend-components.md`
  - 包含组件使用规范
  - 包含样式编写规范
  - 包含禁止事项
  - _Requirements: 34.1, 34.2, 34.3_

- [ ] 21. Final Checkpoint - 完整验证
  - 确保所有页面功能正常
  - 确保构建成功
  - 确保 ESLint 无错误
  - 如有问题请告知

## ⚠️ 页面迁移核心原则（必读）

**迁移的目标是换组件库，不是重新设计页面！**

每个页面迁移任务必须遵守以下原则：

1. **视觉一致性**：迁移后的页面必须与原页面在视觉上完全一致
2. **布局保持**：页面布局、间距、对齐方式必须与原页面相同
3. **样式复制**：原页面的背景、阴影、圆角、颜色、动画等样式必须完整复制
4. **功能不变**：所有交互功能必须与原页面行为一致

**执行迁移任务前，必须：**
- 先查看原组件的完整代码，理解其样式和布局
- 使用 Tailwind CSS 类或内联样式复现原有样式
- 迁移完成后对比原页面，确保视觉效果一致

**禁止：**
- 使用"简化样式"或"默认样式"替代原有设计
- 省略原页面的背景效果、动画、阴影等视觉元素
- 改变原页面的布局结构

## Notes

- 任务按照渐进式迁移策略设计，每个阶段都有验证点
- 每个 Checkpoint 都是可回滚点
- 共存期间包体积会增大，这是预期的
- 迁移完成后移除 Ant Design 会显著减小包体积
- 使用 Tailwind v4 的 CSS-first 配置，不需要 tailwind.config.js
