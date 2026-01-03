# 前后端路由-API映射文档

本文档记录了前端路由与后端API的对应关系，便于维护和开发。

## 认证相关

| 前端路由 | 后端API | 方法 | 说明 |
|---------|---------|------|------|
| `/login` | `/api/auth/login/` | POST | 用户登录 |
| - | `/api/auth/logout/` | POST | 用户登出 |
| - | `/api/auth/refresh/` | POST | 刷新Token |
| - | `/api/auth/switch-role/` | POST | 切换角色 |
| - | `/api/auth/me/` | GET | 获取当前用户信息 |
| - | `/api/auth/reset-password/` | POST | 管理员重置密码 |
| - | `/api/auth/change-password/` | POST | 用户修改密码 |

## 知识库相关

| 前端路由 | 后端API | 方法 | 说明 |
|---------|---------|------|------|
| `/knowledge` | `/api/knowledge/student/` | GET | 学员知识库列表 |
| `/knowledge/:id` | `/api/knowledge/{id}/` | GET | 知识详情 |
| `/admin/knowledge` | `/api/knowledge/` | GET | 管理员知识库列表 |
| `/admin/knowledge/create` | `/api/knowledge/` | POST | 创建知识文档 |
| `/admin/knowledge/:id/edit` | `/api/knowledge/{id}/` | PATCH | 更新知识文档 |
| `/admin/knowledge/:id` | `/api/knowledge/{id}/` | GET | 知识详情 |
| - | `/api/knowledge/{id}/publish/` | POST | 发布知识文档 |
| - | `/api/knowledge/{id}/unpublish/` | POST | 取消发布 |
| - | `/api/knowledge/stats/` | GET | 知识统计 |
| - | `/api/knowledge/tags/` | GET | 标签列表 |
| - | `/api/knowledge/tags/create/` | POST | 创建标签 |
| - | `/api/knowledge/tags/{id}/` | GET | 标签详情 |

## 任务相关

| 前端路由 | 后端API | 方法 | 说明 |
|---------|---------|------|------|
| `/tasks` | `/api/tasks/` | GET | 任务列表 |
| `/tasks/create` | `/api/tasks/create/` | POST | 创建任务 |
| `/tasks/:id/edit` | `/api/tasks/{id}/` | PATCH | 更新任务 |
| `/tasks/:id` | `/api/tasks/{id}/` | GET | 任务详情 |
| - | `/api/tasks/{id}/close/` | POST | 关闭任务 |
| - | `/api/tasks/assignable-users/` | GET | 可分配用户列表 |
| - | `/api/tasks/my-assignments/` | GET | 我的任务分配 |
| - | `/api/tasks/{task_id}/detail/` | GET | 学员任务详情 |
| - | `/api/tasks/{task_id}/complete-knowledge/` | POST | 完成知识学习 |

## 答题相关

| 前端路由 | 后端API | 方法 | 说明 |
|---------|---------|------|------|
| `/quiz/:id` | `/api/submissions/start/` | POST | 开始答题（统一接口） |
| `/quiz/:id` | `/api/submissions/{id}/submit/` | POST | 提交答案（统一接口） |
| `/review/practice` | `/api/submissions/{id}/result/` | GET | 练习结果 |
| `/review/exam` | `/api/submissions/{id}/result/` | GET | 考试结果 |
| - | `/api/submissions/{id}/save-answer/` | POST | 保存答案 |
| - | `/api/submissions/my/` | GET | 我的提交记录 |
| - | `/api/submissions/practice/start/` | POST | 开始练习（兼容） |
| - | `/api/submissions/practice/history/{task_id}/` | GET | 练习历史 |
| - | `/api/submissions/{id}/submit-practice/` | POST | 提交练习（兼容） |
| - | `/api/submissions/exam/start/` | POST | 开始考试（兼容） |
| - | `/api/submissions/{id}/submit-exam/` | POST | 提交考试（兼容） |
| - | `/api/submissions/exam/{id}/result/` | GET | 考试结果（兼容） |

## 评分相关

| 前端路由 | 后端API | 方法 | 说明 |
|---------|---------|------|------|
| `/grading` | `/api/grading/pending/` | GET | 待评分列表 |
| `/grading/:id` | `/api/grading/{id}/` | GET | 评分详情 |
| `/grading/:id` | `/api/grading/{id}/grade/` | POST | 评分单个答案 |
| - | `/api/grading/{id}/batch-grade/` | POST | 批量评分 |

## 测试中心相关

| 前端路由 | 后端API | 方法 | 说明 |
|---------|---------|------|------|
| `/test-center` | - | - | 测试中心首页 |
| `/test-center/questions/create` | `/api/questions/` | POST | 创建题目 |
| `/test-center/questions/:id/edit` | `/api/questions/{id}/` | PATCH | 更新题目 |
| `/test-center/questions/:id` | `/api/questions/{id}/` | GET | 题目详情 |
| - | `/api/questions/import/` | POST | 批量导入题目 |
| `/test-center/quizzes/create` | `/api/quizzes/` | POST | 创建试卷 |
| `/test-center/quizzes/:id/edit` | `/api/quizzes/{id}/` | PATCH | 更新试卷 |
| `/test-center/quizzes/:id` | `/api/quizzes/{id}/` | GET | 试卷详情 |
| - | `/api/quizzes/{id}/add-questions/` | POST | 添加题目到试卷 |
| - | `/api/quizzes/{id}/remove-questions/` | POST | 从试卷移除题目 |
| - | `/api/quizzes/{id}/reorder-questions/` | POST | 重排题目顺序 |
| - | `/api/quizzes/create-from-questions/` | POST | 从题目创建试卷 |

## 抽查相关

| 前端路由 | 后端API | 方法 | 说明 |
|---------|---------|------|------|
| `/spot-checks` | `/api/spot-checks/` | GET | 抽查列表 |
| `/spot-checks/create` | `/api/spot-checks/` | POST | 创建抽查 |
| `/spot-checks/:id` | `/api/spot-checks/{id}/` | GET | 抽查详情 |

## 用户管理相关

| 前端路由 | 后端API | 方法 | 说明 |
|---------|---------|------|------|
| `/users` | `/api/users/` | GET | 用户列表 |
| `/users` | `/api/users/` | POST | 创建用户 |
| `/users/:id` | `/api/users/{id}/` | GET | 用户详情 |
| `/users/:id` | `/api/users/{id}/` | PATCH | 更新用户 |
| - | `/api/users/{id}/deactivate/` | POST | 停用用户 |
| - | `/api/users/{id}/activate/` | POST | 启用用户 |
| - | `/api/users/{id}/assign-roles/` | POST | 分配角色 |
| - | `/api/users/{id}/assign-mentor/` | POST | 分配导师 |
| - | `/api/users/mentees/` | GET | 我的学员列表 |
| - | `/api/users/department-members/` | GET | 部门成员列表 |
| - | `/api/users/mentors/` | GET | 导师列表 |
| - | `/api/users/roles/` | GET | 角色列表 |
| - | `/api/users/departments/` | GET | 部门列表 |

## 数据看板相关

| 前端路由 | 后端API | 方法 | 说明 |
|---------|---------|------|------|
| `/dashboard` | `/api/analytics/dashboard/student/` | GET | 学员仪表盘 |
| `/dashboard` | `/api/analytics/dashboard/mentor/` | GET | 导师/室经理仪表盘 |
| `/analytics` | `/api/analytics/team-overview/` | GET | 团队概览 |
| `/analytics` | `/api/analytics/knowledge-heat/` | GET | 知识热度 |
| - | `/api/analytics/personal-center/profile/` | GET | 个人资料 |
| - | `/api/analytics/personal-center/scores/` | GET | 成绩历史 |
| - | `/api/analytics/personal-center/scores/export/` | GET | 导出成绩 |
| - | `/api/analytics/personal-center/wrong-answers/` | GET | 错题集 |

## 通知相关

| 前端路由 | 后端API | 方法 | 说明 |
|---------|---------|------|------|
| - | `/api/notifications/` | GET | 通知列表 |
| - | `/api/notifications/{id}/` | GET | 通知详情 |
| - | `/api/notifications/{id}/read/` | POST | 标记已读 |
| - | `/api/notifications/read-all/` | POST | 全部标记已读 |
| - | `/api/notifications/unread-count/` | GET | 未读数量 |

## 路由命名规范

### 后端URL名称（name）

统一使用 **kebab-case**，格式：`{module}-{action}` 或 `{module}-{resource}-{action}`

示例：
- `auth-login`
- `user-list-create`
- `knowledge-detail`
- `submission-result`
- `grading-detail`

### 前端路由常量

所有路由路径定义在 `src/config/routes.ts` 的 `ROUTES` 常量中，使用 **kebab-case**。

## 更新记录

- 2024-01-XX: 初始版本，建立前后端路由映射关系
