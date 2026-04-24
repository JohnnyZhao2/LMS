# 项目更新记录

> 自动生成文件。请勿手改；执行 `npm run docs:generate` 更新。

来源：最近 30 条 git commit。未提交改动不会进入本文件。

| Commit | 日期 | 内容 |
|--------|------|------|
| `0266f857` | 2026-04-24 | refactor(knowledge): 移除 agentation 依赖并优化知识详情模态框逻辑 - 从 package.json 和 package-lock.json 中移除了 agentation 依赖。 - 更新知识详情模态框，重构退出焦点模式的逻辑，确保在有更改... |
| `a2936aff` | 2026-04-24 | feat(dashboard): 增强知识检索与 UI 组件 • 更新 get_latest_knowledge，在查询中加入 space_tag 以优化数据检索。 • 新增 CSS 类 .scrollbar-hidden 用于隐藏滚动条，使 UI 更简洁。 • 修改 Sc... |
| `e0855870` | 2026-04-24 | refactor(dashboard)：简化任务参与者进度获取 • 移除了 limit 参数，并调整逻辑以直接返回所有参与者。 • 更新了 StudentDashboard 组件以反映参与者处理方式的变化。 • 通过精简 props 和布局增强了 EditorialCard... |
| `71282b2f` | 2026-04-22 | refactor(auth): 优化 OneAccountClient 的 ID 令牌解码逻辑 - 移除了不必要的私钥规范化方法，简化了客户端配置。 - 更新了 ID 令牌解码方法，改为直接解析 JWT 载荷，提升了代码可读性。 - 调整了授权码请求的参数顺序，确保一致性。... |
| `3022fb2d` | 2026-04-22 | feat(authorization): 更新权限模板和用户角色管理逻辑 - 修改了权限模板的命名和访问控制，确保一致性，更新了相关的权限代码。 - 在用户管理中引入新的角色分配和权限更新功能，提升了用户权限管理的灵活性。 - 更新了前端和后端的权限检查逻辑，确保用户角色和... |
| `692bd098` | 2026-04-22 | delete(deploy): 移除前后端部署相关配置文件 - 删除了前端和后端的 Nginx 配置文件以及 Gunicorn 配置文件，清理不再需要的部署文档以提升项目整洁性。 |
| `f19eb543` | 2026-04-22 | delete(docs): 移除统一认证服务基础说明文档 - 删除了统一认证服务的基础说明文档，清理不再需要的文件以提升项目整洁性。 |
| `9ef8b988` | 2026-04-22 | chore(.gitignore): 添加忽略文件规则以排除特定文档 - 在 .gitignore 文件中添加了对 '招乎统一认证-API使用文档_副本.md' 的忽略规则，确保该文档不被纳入版本控制。 |
| `ad49f41d` | 2026-04-22 | refactor(vite): 移除构建配置中的手动分块逻辑 - 删除了 `vite.config.ts` 中的手动分块配置，简化了构建设置。 - 该更改有助于提升配置的可读性和维护性。 |
| `730bbc7d` | 2026-04-21 | feat(docs): 增强文档生成和检查流程 - 添加了 `npm run docs:generate` 和 `npm run docs:check` 命令，以自动生成和校验文档。 - 更新了 README.md，详细说明了文档维护流程和生成内容。 - 在多个模块中增加了... |
| `45e3a8ec` | 2026-04-21 | fix(docs): 更新特性依赖图中的组件和类型引用 - 修正了特性依赖图中组件和类型的引用数量，确保文档的准确性。 - 更新了相关的依赖关系，以反映最新的代码结构和组件数量。 |
| `26a71f72` | 2026-04-21 | refactor(authorization): 更新权限范围和覆盖逻辑 - 在 `constants.py` 中移除了 `VISIBLE_SCOPE_CHOICES` 和相关描述，改为使用 `SCOPE_CHOICES`。 - 在 `decisions.py` 中简化了 ... |
| `b71b0cc8` | 2026-04-21 | refactor(auth): 重命名和更新密码相关功能 - 将密码重置功能重命名为密码修改，更新相关序列化器和视图以反映这一变化。 - 修改了用户注销逻辑，确保在注销时黑名单刷新令牌的处理更加严谨。 - 更新前端 API 调用，调整密码修改的请求结构，提升代码一致性和可读性。 |
| `05262ab7` | 2026-04-21 | refactor(authorization): 删除用户权限模块侧边栏组件 - 移除了 `UserPermissionModuleSidebar` 组件，简化了权限管理界面。 - 该组件的删除有助于减少代码冗余，提升整体可维护性。 |
| `504e1dcf` | 2026-04-21 | refactor(authorization): 重构权限范围组和授权逻辑 - 移除了 `PERMISSION_SCOPE_GROUPS` 的静态定义，改为动态构建，提升灵活性和可维护性。 - 引入 `allowed_scope_types` 属性到权限定义中，支持更细粒度... |
| `ff33bcdd` | 2026-04-20 | refactor(tests): 提升测试代码可读性和重用性 - 引入多个辅助函数，如 `auth`, `assert_status`, `assert_success` 等，简化测试用例中的认证和断言逻辑。 - 更新测试用例以使用新引入的辅助函数，减少重复代码，提高可维护... |
| `e3efd505` | 2026-04-20 | refactor(authorization): 重构权限定义和授权逻辑 - 将权限定义从 `PermissionDefinition` 更新为 `perm` 函数，简化权限创建过程。 - 引入 `crud_permissions` 和 `crud_authorizatio... |
| `82b7b447` | 2026-04-20 | refactor(docs, components): 更新文档和组件结构 - 删除了未使用的 `searchable-select` 组件，减少代码冗余。 - 更新了组件清单，调整了共享组件和功能组件的数量。 - 优化了特性依赖图，修正了组件与特性之间的引用关系。 - 移... |
| `7cf3f56e` | 2026-04-20 | feat(auth): 增强签名生成与验证 • 更新了 _sm2_sign_base64 方法，通过私钥派生公钥以提升安全性。 • 引入了新的 _derive_public_key 方法来封装公钥派生逻辑。 • 添加了测试用例，以验证使用派生公钥可以正确校验签名。 • 重构... |
| `304e5003` | 2026-04-20 | feat(auth, activity_logs): 增强身份验证和日志记录机制 • 更新了开发和生产环境的配置文件，以包含新的 OIDC 设置。 • 重构了活动日志模型以统一日志结构，使用单一的 ActivityLog 模型取代了多种日志类型。 • 删除了旧的迁移文件，并... |
| `7d80ee55` | 2026-04-20 | refactor(gitignore): 清理 .gitignore 文件，移除环境配置文件条目 - 从 lms_backend 和 lms_frontend 的 .gitignore 中删除环境文件相关条目，以简化环境管理和版本控制。 |
| `c4d71870` | 2026-04-20 | refactor(dependencies, configuration): 更新包版本并清理 .gitignore • 在 package.json 和 package-lock.json 中降低了多个包的版本以解决兼容性问题。 • 从 .gitignore 中删除了 '... |
| `df8d1202` | 2026-04-19 | feat(deployment, user_management): 更新后端部署流程和用户管理逻辑 - 在 DEPLOY.md 中添加后端初始化数据的说明，明确首次上线时需执行 `init_data`。 - 在 UserManager 中引入默认学生角色的创建逻辑，确保新... |
| `eefa6dc5` | 2026-04-19 | refactor(activity_logs, authorization): 重构活动日志和授权逻辑 - 移除冗余的日志常量定义，改为使用注册机制以提高可维护性。 - 更新日志记录装饰器，增强用户和内容操作的日志记录功能，确保一致性。 - 优化权限覆盖和范围组覆盖的日志记... |
| `21800a4c` | 2026-04-19 | refactor(architecture, dependencies): 更新项目结构和依赖管理 - 重构项目文档，明确前端架构原则，移除手动维护的事实清单，改为自动生成。 - 更新 package.json 和 package-lock.json，添加测试库依赖以增强测... |
| `97eb56d1` | 2026-04-19 | refactor(api, queries): 优化查询键和缓存失效逻辑 - 更新多个 API 查询中的 queryKey，使用统一的 queryKeys 模块以提高可读性和一致性。 - 移除冗余的缓存失效逻辑，替换为集中管理的失效函数，简化代码结构。 - 增强各个功能模块... |
| `338f4122` | 2026-04-19 | refactor(grading, submissions, tasks): 重构评分和任务管理逻辑 - 将主观题评分逻辑从 Answer 模型中提取到独立的工作流函数中，提升代码可读性和可维护性。 - 更新 GradingSubmitView 以使用新的评分工作流函数，简... |
| `b5f15b84` | 2026-04-18 | refactor(authorization, services, dashboard, tasks): 重构授权引擎和服务逻辑 - 移除未使用的导入和冗余代码，简化授权引擎和服务的实现。 - 将 AuthorizationEngine 类的多个混入合并，提升代码的可读性和... |
| `2dd8bea0` | 2026-04-18 | refactor(activity_logs, authorization): 更新日志记录和角色解析逻辑 • 在 ActivityLogsConfig 中集成 register_activity_log_audit_publisher 以增强审计日志记录。 • 在用户操作... |
| `cc337416` | 2026-04-18 | refactor(grading): update layout and styling in GradingCenterTab component - Introduced a new grid class for better alignment of question... |
