# 学员任务列表修复需求

## 背景
学员任务列表页面存在状态筛选与后端不一致、API 响应字段缺失等问题。

## 用户故事

### US-1: 修复状态筛选选项
**作为** 学员
**我希望** 任务列表的状态筛选只显示有效的状态选项
**以便** 我能正确筛选任务

**验收标准:**
- [x] 移除 `PENDING_EXAM`（待评审）状态选项
- [x] 状态筛选只包含：全部、进行中、已完成、已逾期
- [x] TypeScript 类型 `TaskStatus` 移除 `PENDING_EXAM`

### US-2: 修复 API 响应字段
**作为** 前端开发者
**我希望** `/analytics/task-center/` API 返回 `has_quiz` 和 `has_knowledge` 字段
**以便** 前端能正确显示任务类型标识

**验收标准:**
- [x] `StudentTaskCenterListSerializer` 添加 `has_quiz` 字段
- [x] `StudentTaskCenterListSerializer` 添加 `has_knowledge` 字段
- [x] 前端 `StudentTaskCenterItem` 类型与 API 响应一致

### US-3: 清理后端遗留代码
**作为** 开发者
**我希望** 后端代码中不再引用不存在的 `PENDING_EXAM` 状态
**以便** 代码保持一致性

**验收标准:**
- [x] `analytics/views.py` 中移除所有 `PENDING_EXAM` 引用

## 涉及文件

### 前端
- `lms_frontend/src/features/tasks/components/student-task-list.tsx` - 状态筛选选项 ✅
- `lms_frontend/src/types/api.ts` - TaskStatus 类型定义 ✅

### 后端
- `lms_backend/apps/analytics/serializers.py` - StudentTaskCenterListSerializer ✅
- `lms_backend/apps/analytics/views.py` - 清理 PENDING_EXAM 引用 ✅
