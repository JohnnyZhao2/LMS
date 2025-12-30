# Implementation Plan: Frontend Cleanup & Migration Completion

## Overview

本任务列表基于实际代码检查结果，列出所有未完成的迁移工作和清理任务。

**当前状态：**
- 基础设施已搭建（Tailwind v4 + ShadCN UI）
- 部分页面已迁移，但大量组件仍在使用 Ant Design
- 新旧组件混杂，`-new` 后缀文件未清理
- CSS Module 文件残留
- 重复目录结构

## Tasks

### 阶段一：完成剩余组件迁移

- [-] 1. 迁移 submissions 模块组件
  - 这些组件被答题和复习页面使用

- [x] 1.1 迁移 QuestionCard 组件
  - 文件：`src/features/submissions/components/question-card.tsx`
  - 当前使用：`antd` (Radio, Checkbox, Input, Typography) + `@ant-design/icons`
  - 迁移为：ShadCN RadioGroup, Checkbox, Input + lucide-react 图标
  - 保持原有功能和样式

- [x] 1.2 迁移 Timer 组件
  - 文件：`src/features/submissions/components/timer.tsx`
  - 当前使用：`antd` (Typography) + `@ant-design/icons`
  - 迁移为：Tailwind CSS + lucide-react 图标

- [x] 1.3 迁移 QuizPlayer 组件
  - 文件：`src/features/submissions/components/quiz-player.tsx`
  - 当前使用：`antd` (Button, Row, Col, Typography, Modal, message, Spin, Affix, Progress, Card) + `@ant-design/icons`
  - 迁移为：ShadCN 组件 + Tailwind CSS
  - 这是最复杂的组件，需要保持答题功能完整

- [x] 2. Checkpoint - submissions 模块验证
  - 确保答题页面 `/quiz/:id` 和 `/exam/:id` 正常工作
  - 确保复习页面 `/review/practice` 和 `/review/exam` 正常工作

- [ ] 3. 迁移 tasks 模块剩余组件

- [x] 3.1 迁移 TaskList 组件（路由直接使用）
  - 文件：`src/features/tasks/components/task-list.tsx`
  - 当前使用：`antd` + `@ant-design/icons`
  - 迁移为：使用已有的 TaskManagementNew 或创建新版本
  - 更新路由 `router.tsx` 使用新组件

- [x] 3.2 迁移 TaskCard 组件
  - 文件：`src/features/tasks/components/task-card.tsx`
  - 当前使用：`antd` (Typography, Progress, Tag, Dropdown, Button, Modal, message, Card) + `@ant-design/icons`
  - 迁移为：ShadCN 组件

- [x] 3.3 迁移 StudentTaskList 组件
  - 文件：`src/features/tasks/components/student-task-list.tsx`
  - 当前使用：`antd` (Select, Row, Col, Empty, Spin, Typography) + `@ant-design/icons`
  - 迁移为：ShadCN 组件

- [x] 4. Checkpoint - tasks 模块验证
  - 确保任务列表页面 `/tasks` 正常工作
  - 确保不同角色看到正确的任务视图

- [ ] 5. 迁移 users 模块剩余组件

- [x] 5.1 迁移 UserForm 组件（路由直接使用）
  - 文件：`src/features/users/components/user-form.tsx`
  - 当前使用：`antd` (Form, Input, Select, Button, Card, message, Typography, Space)
  - 迁移为：ShadCN Form + react-hook-form + zod
  - 更新路由使用新组件

- [x] 6. Checkpoint - users 模块验证
  - 确保用户创建 `/users/create` 正常工作
  - 确保用户编辑 `/users/:id/edit` 正常工作

- [ ] 7. 迁移 test-center 模块剩余组件

- [x] 7.1 迁移 QuestionTab 组件
  - 文件：`src/features/test-center/components/question-tab.tsx`
  - 当前使用：`antd` + `@ant-design/icons` + CSS Module
  - 迁移为：ShadCN 组件 + Tailwind CSS
  - 更新 TestCenterNew 引用新组件

- [x] 8. Checkpoint - test-center 模块验证
  - 确保测试中心页面 `/test-center` 的题目标签页正常工作

- [ ] 9. 迁移 knowledge 模块 CSS Module 组件

- [x] 9.1 迁移 StudentKnowledgeCenter 组件
  - 文件：`src/features/knowledge/components/student-knowledge-center.tsx`
  - 当前使用：CSS Module (`knowledge-library.module.css`)
  - 迁移为：Tailwind CSS 类
  - 保持原有布局和样式

- [x] 9.2 迁移 SharedKnowledgeCard 组件
  - 文件：`src/features/knowledge/components/shared-knowledge-card.tsx`
  - 当前使用：CSS Module (`knowledge-library.module.css`)
  - 迁移为：Tailwind CSS 类

- [x] 10. Checkpoint - knowledge 模块验证
  - 确保学员知识中心 `/knowledge` 正常工作
  - 确保知识卡片显示正确

### 阶段二：清理旧文件

- [ ] 11. 删除旧组件文件

- [x] 11.1 删除 features/auth 旧文件
  - 检查是否有未使用的旧文件

- [x] 11.2 删除 features/dashboard 旧文件
  - 检查是否有未使用的旧文件（如 admin-dashboard.tsx 如果有旧版）

- [x] 11.3 删除 features/grading 旧文件
  - 删除 `grading-form.tsx`（已有 grading-form-new.tsx）
  - 删除 `grading-list.tsx`（已有 grading-list-new.tsx）

- [x] 11.4 删除 features/knowledge 旧文件
  - 删除 `admin-knowledge-list.tsx`（已有 -new 版本）
  - 删除 `knowledge-detail.tsx`（已有 -new 版本）
  - 删除 `knowledge-form.tsx`（已有 -new 版本）
  - 删除 `knowledge-form-modal.tsx`（已有 -new 版本）
  - 删除所有 `.module.css` 文件

- [x] 11.5 删除 features/questions 旧文件
  - 删除 `question-form.tsx`（已有 -new 版本）
  - 删除 `question-list.tsx`（未被路由使用）
  - 删除所有 `.module.css` 文件

- [x] 11.6 删除 features/quizzes 旧文件
  - 删除 `quiz-form.tsx`（已有 -new 版本）
  - 删除 `quiz-list.tsx`（未被路由使用）

- [x] 11.7 删除 features/spot-checks 旧文件
  - 删除 `spot-check-form.tsx`（已有 -new 版本）
  - 删除 `spot-check-list.tsx`（已有 -new 版本）

- [x] 11.8 删除 features/submissions 旧文件
  - 删除 `answer-review.tsx`（已有 -new 版本）
  - 迁移完成后删除旧的 question-card.tsx, timer.tsx, quiz-player.tsx

- [x] 11.9 删除 features/tasks 旧文件
  - 删除 `task-detail.tsx`（已有 -new 版本）
  - 删除 `task-form.tsx`（已有 -new 版本）
  - 删除 `task-management.tsx`（已有 -new 版本）
  - 迁移完成后删除 task-list.tsx, task-card.tsx, student-task-list.tsx

- [x] 11.10 删除 features/test-center 旧文件
  - 删除 `test-center.tsx`（已有 -new 版本）
  - 删除 `quiz-tab.tsx`（已有 -new 版本）
  - 迁移完成后删除 question-tab.tsx
  - 删除所有 `.module.css` 文件

- [x] 11.11 删除 features/users 旧文件
  - 删除 `user-detail.tsx`（已有 -new 版本）
  - 删除 `user-form-modal.tsx`（已有 -new 版本）
  - 删除 `user-list.tsx`（已有 -new 版本）
  - 迁移完成后删除 user-form.tsx

- [x] 12. Checkpoint - 删除旧文件验证
  - 运行 `npm run build` 确保没有引用错误
  - 确保所有页面正常工作

### 阶段三：重命名新组件（移除 -new 后缀）

- [x] 13. 重命名组件文件

- [x] 13.1 重命名 grading 组件
  - `grading-form-new.tsx` → `grading-form.tsx`
  - `grading-list-new.tsx` → `grading-list.tsx`
  - 更新所有导入路径

- [x] 13.2 重命名 knowledge 组件
  - `admin-knowledge-list-new.tsx` → `admin-knowledge-list.tsx`
  - `knowledge-detail-new.tsx` → `knowledge-detail.tsx`
  - `knowledge-form-new.tsx` → `knowledge-form.tsx`
  - `knowledge-form-modal-new.tsx` → `knowledge-form-modal.tsx`
  - 更新所有导入路径

- [x] 13.3 重命名 questions 组件
  - `question-form-new.tsx` → `question-form.tsx`
  - 更新所有导入路径

- [x] 13.4 重命名 quizzes 组件
  - `quiz-form-new.tsx` → `quiz-form.tsx`
  - 更新所有导入路径

- [x] 13.5 重命名 spot-checks 组件
  - `spot-check-form-new.tsx` → `spot-check-form.tsx`
  - `spot-check-list-new.tsx` → `spot-check-list.tsx`
  - 更新所有导入路径

- [x] 13.6 重命名 submissions 组件
  - `answer-review-new.tsx` → `answer-review.tsx`
  - 更新所有导入路径

- [x] 13.7 重命名 tasks 组件
  - `task-detail-new.tsx` → `task-detail.tsx`
  - `task-form-new.tsx` → `task-form.tsx`
  - `task-management-new.tsx` → `task-management.tsx`
  - 更新所有导入路径

- [x] 13.8 重命名 test-center 组件
  - `test-center-new.tsx` → `test-center.tsx`
  - `quiz-tab-new.tsx` → `quiz-tab.tsx`
  - 更新所有导入路径

- [x] 13.9 重命名 users 组件
  - `user-detail-new.tsx` → `user-detail.tsx`
  - `user-form-modal-new.tsx` → `user-form-modal.tsx`
  - `user-list-new.tsx` → `user-list.tsx`
  - 更新所有导入路径

- [x] 14. Checkpoint - 重命名验证
  - 运行 `npm run build` 确保没有引用错误
  - 确保所有页面正常工作

### 阶段四：清理目录结构

- [ ] 15. 合并重复目录

- [x] 15.1 合并 layout 目录
  - 当前有 `components/layout/` 和 `components/layouts/`
  - 保留 `components/layouts/`（新版）
  - 删除 `components/layout/`（旧版）
  - 更新所有导入路径

- [ ] 16. 清理 CSS

- [x] 16.1 删除所有 CSS Module 文件
  - 删除 `knowledge-library.module.css`
  - 删除 `knowledge-detail.module.css`
  - 删除 `knowledge-form.module.css`
  - 删除 `question-tab.module.css`
  - 删除 `question-list.module.css`
  - 删除 `question-form.module.css`
  - 删除 `admin-knowledge-list.module.css`

- [x] 16.2 清理 index.css
  - 删除 `.task-form-*` 相关的旧样式（如果不再使用）
  - 删除任何 `.ant-*` 相关的覆盖样式
  - 保留 Tailwind v4 配置和通用工具类

- [x] 17. Checkpoint - 清理验证
  - 运行 `npm run build` 确保构建成功
  - 检查包体积是否减小
  - 确保所有页面正常工作

### 阶段五：最终验证

- [x] 18. 完整功能验证

- [x] 18.1 验证所有路由页面
  - 登录页面
  - 仪表盘（学员/导师/团队经理/管理员）
  - 知识中心（学员/管理员）
  - 任务中心
  - 测试中心
  - 评分中心
  - 抽查中心
  - 用户管理
  - 答题和复习页面

- [x] 18.2 验证无 antd 残留
  - 运行 `grep -r "from 'antd'" src/` 确保无结果
  - 运行 `grep -r "from '@ant-design" src/` 确保无结果

- [x] 18.3 验证无 CSS Module 残留
  - 运行 `grep -r "\.module\.css" src/` 确保无结果

- [x] 19. Final Checkpoint
  - 所有页面功能正常
  - 构建成功
  - 无 antd 依赖
  - 无 CSS Module 文件
  - 无 -new 后缀文件
  - 目录结构清晰

## Notes

- 每个迁移任务必须保持原有功能和视觉效果
- 每个 Checkpoint 都要验证页面可用
- 删除文件前必须确认没有被引用
- 重命名时必须更新所有导入路径
