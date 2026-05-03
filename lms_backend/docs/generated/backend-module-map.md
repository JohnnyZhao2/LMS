# 后端模块地图

> 自动生成文件。请勿手改；执行 `npm run docs:generate` 更新。

- 业务模块：13 个
- 模型相关类：33 个
- Service/Workflow 文件：17 个
- View 文件：26 个

## 模块清单

| 模块 | 模型相关类 | Service / Workflow | Selector / Query | Serializer | View | 权限声明 | 迁移 |
|------|--------|--------------------|------------------|------------|------|----------|------|
| `activity_logs` | `ActivityLog`<br>`ActivityLogPolicy` | `apps/activity_logs/services.py` | `apps/activity_logs/selectors.py` | `apps/activity_logs/serializers.py` | `apps/activity_logs/views.py` | `apps/activity_logs/authorization.py` | 2 |
| `auth` | - | `apps/auth/services.py` | - | `apps/auth/serializers.py` | `apps/auth/views.py` | - | 0 |
| `authorization` | `Permission`<br>`RolePermission`<br>`UserPermissionOverride`<br>`UserScopeGroupOverride` | `apps/authorization/permission_catalog_service.py`<br>`apps/authorization/role_template_service.py`<br>`apps/authorization/services.py`<br>`apps/authorization/user_override_service.py` | `apps/authorization/selectors.py` | `apps/authorization/serializers.py` | `apps/authorization/views.py` | `apps/authorization/authorization.py` | 9 |
| `dashboard` | - | `apps/dashboard/services.py` | `apps/dashboard/common_queries.py`<br>`apps/dashboard/mentor_dashboard_queries.py`<br>`apps/dashboard/selectors.py`<br>`apps/dashboard/student_dashboard_queries.py`<br>`apps/dashboard/team_manager_dashboard_queries.py` | `apps/dashboard/serializers.py` | `apps/dashboard/views/admin.py`<br>`apps/dashboard/views/base.py`<br>`apps/dashboard/views/mentor.py`<br>`apps/dashboard/views/student.py`<br>`apps/dashboard/views/team_manager.py` | `apps/dashboard/authorization.py` | 0 |
| `grading` | - | - | `apps/grading/selectors.py` | `apps/grading/serializers.py` | `apps/grading/views.py` | `apps/grading/authorization.py` | 0 |
| `knowledge` | `Knowledge`<br>`KnowledgeRevision` | `apps/knowledge/services.py` | `apps/knowledge/selectors.py` | `apps/knowledge/serializers.py` | `apps/knowledge/views/document.py`<br>`apps/knowledge/views/knowledge.py` | `apps/knowledge/authorization.py` | 2 |
| `questions` | `Question`<br>`QuestionOption` | `apps/questions/services.py` | `apps/questions/selectors.py` | `apps/questions/serializers.py` | `apps/questions/views.py` | `apps/questions/authorization.py` | 2 |
| `quizzes` | `Quiz`<br>`QuizDefinitionMixin`<br>`QuizQuestion`<br>`QuizQuestionOption`<br>`QuizRevision`<br>`QuizRevisionQuestion`<br>`QuizRevisionQuestionOption` | `apps/quizzes/services.py` | - | `apps/quizzes/serializers.py` | `apps/quizzes/views.py` | `apps/quizzes/authorization.py` | 2 |
| `spot_checks` | `SpotCheck`<br>`SpotCheckItem` | `apps/spot_checks/services.py` | - | `apps/spot_checks/serializers.py` | `apps/spot_checks/views.py` | `apps/spot_checks/authorization.py` | 2 |
| `submissions` | `Answer`<br>`AnswerSelection`<br>`Submission` | `apps/submissions/services.py`<br>`apps/submissions/workflows.py` | - | `apps/submissions/serializers.py` | `apps/submissions/views/common.py` | `apps/submissions/authorization.py` | 3 |
| `tags` | `Tag` | `apps/tags/services.py` | - | `apps/tags/serializers.py` | `apps/tags/views.py` | `apps/tags/authorization.py` | 1 |
| `tasks` | `KnowledgeLearningProgress`<br>`Task`<br>`TaskAssignment`<br>`TaskKnowledge`<br>`TaskQuiz` | `apps/tasks/student_task_service.py`<br>`apps/tasks/task_service.py` | `apps/tasks/selectors.py` | `apps/tasks/serializers.py` | `apps/tasks/views/admin.py`<br>`apps/tasks/views/analytics.py`<br>`apps/tasks/views/student.py` | `apps/tasks/authorization.py` | 3 |
| `users` | `Department`<br>`Role`<br>`User`<br>`UserManager`<br>`UserRole` | `apps/users/services.py` | `apps/users/selectors.py` | `apps/users/serializers.py` | `apps/users/views/assignment.py`<br>`apps/users/views/avatar.py`<br>`apps/users/views/constants.py`<br>`apps/users/views/crud.py`<br>`apps/users/views/management.py`<br>`apps/users/views/reference.py`<br>`apps/users/views/status.py` | `apps/users/authorization.py` | 1 |
