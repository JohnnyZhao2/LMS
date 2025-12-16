# Implementation Plan

## Phase 1: 项目基础设施

- [x] 1. 配置项目基础设施
  - [x] 1.1 配置路径别名和 TypeScript
    - 在 tsconfig.json 中配置 `@/` 路径别名
    - 在 vite.config.ts 中配置对应的 resolve.alias
    - _Requirements: AGENTS.md 路径别名规范_

  - [x] 1.2 安装和配置必要依赖
    - 安装 @tanstack/react-query 用于服务端状态管理
    - 安装 framer-motion 用于动画效果
    - 配置 React Query Provider
    - _Requirements: 设计文档技术栈_

  - [x] 1.3 创建全局配置文件
    - 创建 src/config/index.ts 配置环境变量
    - 创建 src/config/api.ts 配置 API 基础 URL
    - 创建 src/config/roles.ts 配置角色常量和菜单映射
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

  - [x] 1.4 创建 API 客户端
    - 创建 src/lib/api.ts 封装 fetch 请求
    - 实现请求拦截器添加 JWT token
    - 实现 401 错误自动刷新 token 逻辑
    - _Requirements: 1.6, 1.7, 23.1, 23.3_


- [x] 2. 创建全局类型定义
  - [x] 2.1 创建业务类型定义
    - 创建 src/types/domain.ts 定义 User、Role、Department 等类型
    - 定义 Knowledge、Question、Quiz 等资源类型
    - 定义 Task、TaskAssignment、Submission 等任务类型
    - _Requirements: 设计文档 Data Models_

  - [x] 2.2 创建 API 响应类型
    - 创建 src/types/api.ts 定义 API 请求/响应类型
    - 定义分页响应类型 PaginatedResponse
    - 定义错误响应类型 ApiError
    - _Requirements: 23.3, 23.5_

- [x] 3. 创建全局状态管理
  - [x] 3.1 创建认证状态 Store
    - 创建 src/stores/auth.ts 使用 Zustand
    - 实现 user、currentRole、tokens 状态
    - 实现 login、logout、switchRole、refreshToken 方法
    - _Requirements: 1.2, 1.5, 2.3_

  - [ ]* 3.2 写属性测试：登出清除认证状态
    - **Property 2: 登出清除认证状态**
    - **Validates: Requirements 1.5**

  - [x] 3.3 创建 UI 状态 Store
    - 创建 src/stores/ui.ts 管理侧边栏折叠、主题等状态
    - _Requirements: 22.1, 22.2_

- [x] 4. Checkpoint - 确保基础设施完成
  - 确保所有配置文件正确，类型定义完整


## Phase 2: 基础 UI 组件库

- [x] 5. 创建基础 UI 组件
  - [x] 5.1 创建 Button 组件
    - 支持 primary、secondary、danger、ghost 变体
    - 支持 loading 状态和 disabled 状态
    - 支持不同尺寸 sm、md、lg
    - _Requirements: 21.1_

  - [x] 5.2 创建表单组件
    - 创建 Input 组件，支持错误状态展示
    - 创建 Select 组件，支持单选和多选
    - 创建 Textarea 组件
    - 创建 Checkbox 和 Radio 组件
    - _Requirements: 21.2, 23.5_

  - [x] 5.3 创建 Card 组件
    - 支持 header、body、footer 插槽
    - 支持 hover 效果和点击交互
    - _Requirements: 21.4_

  - [x] 5.4 创建 Modal 组件
    - 支持确认对话框和表单对话框
    - 支持自定义 footer 按钮
    - 实现 ESC 关闭和点击遮罩关闭
    - _Requirements: 21.5_

  - [x] 5.5 创建 Table 组件
    - 支持分页功能
    - 支持行选择（单选/多选）
    - 支持自定义列渲染
    - _Requirements: 21.3_

  - [x] 5.6 创建反馈组件
    - 创建 Toast 组件，支持 success、error、warning、info
    - 创建 Spinner 加载指示器
    - 创建 Badge 徽章组件
    - _Requirements: 21.6, 23.1, 23.2_

  - [x] 5.7 创建 Empty 和 Error 状态组件
    - 创建 EmptyState 空状态组件
    - 创建 ErrorState 错误状态组件，支持重试
    - _Requirements: 23.3, 23.4_


## Phase 3: 布局与路由

- [x] 6. 创建布局组件
  - [x] 6.1 创建 Sidebar 侧边栏组件
    - 实现菜单项渲染，支持图标和文字
    - 实现折叠/展开功能
    - 根据当前角色动态渲染菜单项
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 6.2 写属性测试：角色菜单映射
    - **Property 7: 角色菜单映射**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5**

  - [x] 6.3 创建 Header 顶栏组件
    - 实现用户信息展示
    - 实现角色切换器（RoleSwitcher）
    - 实现登出按钮
    - _Requirements: 2.1, 2.2_

  - [ ]* 6.4 写属性测试：高权限用户角色切换器可见性
    - **Property 4: 高权限用户角色切换器可见性**
    - **Validates: Requirements 2.1, 2.6**

  - [x] 6.5 创建 MainLayout 主布局
    - 组合 Sidebar 和 Header
    - 实现响应式布局
    - _Requirements: 22.1, 22.2, 22.3_

  - [x] 6.6 创建 AuthLayout 认证布局
    - 用于登录页面的简洁布局
    - _Requirements: 1.1_

- [x] 7. 配置路由系统
  - [x] 7.1 创建路由配置
    - 创建 src/app/routes/index.tsx 定义所有路由
    - 配置嵌套路由和布局
    - _Requirements: 3.1_

  - [x] 7.2 创建路由守卫
    - 创建 ProtectedRoute 组件检查认证状态
    - 创建 RoleGuard 组件检查角色权限
    - 实现无权限重定向逻辑
    - _Requirements: 3.6_

  - [ ]* 7.3 写属性测试：无权限路由拦截
    - **Property 8: 无权限路由拦截**
    - **Validates: Requirements 3.6**

  - [x] 7.4 创建角色路由映射
    - 创建 src/app/routes/role-routes.ts
    - 定义各角色的默认路由和可访问路由
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [x] 8. Checkpoint - 确保布局和路由正常工作
  - 确保所有测试通过，询问用户是否有问题


## Phase 4: 认证模块

- [x] 9. 实现认证功能
  - [x] 9.1 创建认证 API
    - 创建 src/features/auth/api/auth.ts
    - 实现 login、logout、refresh、switchRole API 调用
    - _Requirements: 1.2, 1.5, 1.6, 2.3_

  - [x] 9.2 创建 AuthContext
    - 创建 src/features/auth/AuthContext.tsx
    - 提供认证状态和方法给子组件
    - 实现初始化时从 localStorage 恢复状态
    - _Requirements: 1.2_

  - [x] 9.3 创建 LoginForm 组件
    - 实现用户名和密码输入
    - 实现表单验证（使用 Zod）
    - 实现登录提交和错误展示
    - _Requirements: 1.1, 1.4_

  - [x] 9.4 创建 LoginPage 页面
    - 组合 AuthLayout 和 LoginForm
    - 实现登录成功后跳转逻辑
    - _Requirements: 1.3_

  - [ ]* 9.5 写属性测试：登录成功后角色路由映射
    - **Property 1: 登录成功后角色路由映射**
    - **Validates: Requirements 1.3**

  - [x] 9.6 创建 RoleSwitcher 组件
    - 展示当前角色和可切换角色列表
    - 实现角色切换调用和状态更新
    - _Requirements: 2.2, 2.3, 2.4_

  - [ ]* 9.7 写属性测试：角色切换后菜单一致性
    - **Property 5: 角色切换后菜单一致性**
    - **Validates: Requirements 2.4, 3.1**

  - [ ]* 9.8 写属性测试：角色切换状态清除
    - **Property 6: 角色切换状态清除**
    - **Validates: Requirements 2.5**

- [x] 10. Checkpoint - 确保认证功能正常
  - 确保所有测试通过，询问用户是否有问题


## Phase 5: 学员功能模块

- [x] 11. 实现学员仪表盘
  - [x] 11.1 创建仪表盘 API
    - 创建 src/features/dashboard/api/dashboard.ts
    - 实现获取学员仪表盘数据 API
    - _Requirements: 4.1, 4.2_

  - [x] 11.2 创建 StudentDashboard 组件
    - 展示待办任务列表
    - 展示最新知识卡片
    - 实现点击跳转功能
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 12. 实现知识中心
  - [x] 12.1 创建知识 API
    - 创建 src/features/knowledge/api/knowledge.ts
    - 实现获取知识列表、详情、分类 API
    - _Requirements: 5.1_

  - [x] 12.2 创建 CategoryFilter 分类筛选器
    - 实现一级分类选择
    - 实现二级分类动态加载
    - _Requirements: 5.2, 5.3_

  - [ ]* 12.3 写属性测试：分类筛选联动
    - **Property 9: 分类筛选联动**
    - **Validates: Requirements 5.2, 5.3**

  - [x] 12.4 创建 KnowledgeCard 知识卡片
    - 展示操作标签、标题、摘要
    - 展示修改人和修改时间
    - _Requirements: 5.4_

  - [x] 12.5 创建 KnowledgeList 知识列表
    - 组合筛选器和卡片列表
    - 实现分页加载
    - _Requirements: 5.1_

  - [x] 12.6 创建 KnowledgeDetail 知识详情
    - 根据类型展示不同内容（应急类/其他）
    - 实现右侧内容目录
    - _Requirements: 5.6, 5.7, 5.8_

  - [ ]* 12.7 写属性测试：知识类型内容展示
    - **Property 10: 知识类型内容展示**
    - **Validates: Requirements 5.6, 5.7**

  - [x] 12.8 创建 KnowledgeCenter 页面
    - 组合列表和详情视图
    - _Requirements: 5.1_

- [x] 13. Checkpoint - 确保知识中心功能正常
  - 确保所有测试通过，询问用户是否有问题


- [x] 14. 实现任务中心
  - [x] 14.1 创建任务 API
    - 创建 src/features/tasks/api/tasks.ts
    - 实现获取任务列表、详情 API
    - 实现完成知识学习、开始答题、提交答题 API
    - _Requirements: 6.1, 7.1, 8.1, 9.1_

  - [x] 14.2 创建 TaskFilter 任务筛选器
    - 实现按类型筛选（学习/练习/考试）
    - 实现按状态筛选（进行中/已完成/已逾期）
    - _Requirements: 6.2, 6.3_

  - [x] 14.3 创建 TaskCard 任务卡片
    - 展示任务标题、类型、状态、截止时间、进度
    - _Requirements: 6.4_

  - [x] 14.4 创建 TaskList 任务列表
    - 组合筛选器和卡片列表
    - _Requirements: 6.1_

  - [x] 14.5 创建 LearningTaskDetail 学习任务详情
    - 展示任务信息和知识文档列表
    - 展示每个文档的完成状态
    - 实现「我已学习掌握」按钮
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 14.6 写属性测试：学习任务完成状态
    - **Property 11: 学习任务完成状态**
    - **Validates: Requirements 7.6**

  - [x] 14.7 创建 PracticeTaskDetail 练习任务详情
    - 展示任务信息、关联知识、试卷列表
    - 展示每个试卷的成绩和作答次数
    - 实现「开始练习」和「再次练习」按钮
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 14.8 写属性测试：练习任务重做允许
    - **Property 12: 练习任务重做允许**
    - **Validates: Requirements 8.7**

  - [x] 14.9 创建 ExamTaskDetail 考试任务详情
    - 展示任务信息、考试规则
    - 实现时间窗口判断和按钮状态控制
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 14.10 写属性测试：考试时间窗口控制
    - **Property 13: 考试时间窗口控制**
    - **Validates: Requirements 9.3, 9.4**

  - [ ]* 14.11 写属性测试：考试单次提交限制
    - **Property 14: 考试单次提交限制**
    - **Validates: Requirements 9.8**

  - [x] 14.12 创建 TaskCenter 页面
    - 组合任务列表和详情视图
    - 根据任务类型路由到不同详情组件
    - _Requirements: 6.5_

- [x] 15. Checkpoint - 确保任务中心功能正常
  - 确保所有测试通过，询问用户是否有问题


- [x] 16. 实现答题界面
  - [x] 16.1 创建 QuestionCard 题目卡片
    - 支持单选、多选、判断、简答四种题型
    - 实现答案选择/输入交互
    - _Requirements: 8.5_

  - [x] 16.2 创建 PracticeRunner 练习答题界面
    - 展示试卷题目列表
    - 实现答案保存和提交
    - 展示自动判分结果和解析
    - _Requirements: 8.4, 8.5, 8.6_

  - [x] 16.3 创建 ExamRunner 考试答题界面
    - 展示试卷题目和倒计时
    - 实现自动提交和手动提交
    - _Requirements: 9.5, 9.6, 9.7_

- [x] 17. 实现个人中心
  - [x] 17.1 创建个人中心 API
    - 创建 src/features/analytics/api/personal.ts
    - 实现获取个人信息、历史成绩、错题本 API
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 17.2 创建 PersonalProfile 个人信息组件
    - 展示姓名、团队、导师信息
    - _Requirements: 10.1_

  - [x] 17.3 创建 ScoreHistory 历史成绩组件
    - 展示练习和考试成绩列表
    - 实现导出功能
    - _Requirements: 10.2, 10.4_

  - [x] 17.4 创建 WrongAnswers 错题本组件
    - 展示答错的题目列表
    - _Requirements: 10.3_

  - [x] 17.5 创建 PersonalCenter 页面
    - 组合个人信息、历史成绩、错题本
    - _Requirements: 10.1_

- [x] 18. Checkpoint - 确保学员功能完整
  - 确保所有测试通过，询问用户是否有问题


## Phase 6: 导师/室经理功能模块

- [x] 19. 实现导师仪表盘
  - [x] 19.1 创建导师仪表盘 API
    - 实现获取所辖学员统计数据 API
    - _Requirements: 11.1, 11.2, 11.3_

  - [x] 19.2 创建 MentorDashboard 组件
    - 展示完成率和平均分统计
    - 展示待评分考试数量
    - 实现快捷入口（新建任务、测试中心、抽查）
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 20. 实现测试中心 - 题目管理
  - [x] 20.1 创建题目 API
    - 创建 src/features/test-center/api/questions.ts
    - 实现题目 CRUD API
    - _Requirements: 12.1, 12.2_

  - [x] 20.2 创建 QuestionForm 题目表单
    - 支持四种题型的创建和编辑
    - 实现选项、答案、解析输入
    - _Requirements: 12.3, 12.4_

  - [x] 20.3 创建 QuestionList 题目列表
    - 展示题目列表，支持搜索和筛选
    - 根据所有权控制编辑/删除按钮显示
    - 实现多选和快速组卷功能
    - _Requirements: 12.1, 12.5, 12.6, 12.8, 12.9_

  - [ ]* 20.4 写属性测试：题目所有权编辑控制
    - **Property 15: 题目所有权编辑控制**
    - **Validates: Requirements 12.5, 12.6**

  - [x] 20.5 创建 QuickPublish 快速发布弹窗
    - 实现试卷名称输入和任务类型选择
    - 跳转到任务创建流程
    - _Requirements: 12.9, 12.10_

  - [x] 20.6 创建 QuestionManagement 页面
    - 组合列表、表单、快速发布
    - _Requirements: 12.1_

- [x] 21. 实现测试中心 - 试卷管理
  - [x] 21.1 创建试卷 API
    - 创建 src/features/test-center/api/quizzes.ts
    - 实现试卷 CRUD API
    - _Requirements: 13.1, 13.2_

  - [x] 21.2 创建 QuestionPicker 题目选择器
    - 从题库选择已有题目
    - 支持搜索和筛选
    - _Requirements: 13.3_

  - [x] 21.3 创建 QuizBuilder 试卷构建器
    - 组合题目选择和新建题目
    - 支持题目排序和分值设置
    - _Requirements: 13.2, 13.3, 13.4_

  - [x] 21.4 创建 QuizList 试卷列表
    - 展示试卷列表，支持搜索
    - 根据所有权控制编辑/删除按钮显示
    - 实现多选和快速发布功能
    - _Requirements: 13.1, 13.5, 13.6, 13.10_

  - [ ]* 21.5 写属性测试：试卷所有权编辑控制
    - **Property 16: 试卷所有权编辑控制**
    - **Validates: Requirements 13.5, 13.6**

  - [ ]* 21.6 写属性测试：快速发布任务类型限制
    - **Property 18: 快速发布任务类型限制**
    - **Validates: Requirements 13.11, 13.12**

  - [x] 21.7 创建 QuizManagement 页面
    - 组合列表、构建器、快速发布
    - _Requirements: 13.1_

- [x] 22. Checkpoint - 确保测试中心功能正常
  - 确保所有测试通过，询问用户是否有问题


- [x] 23. 实现任务管理
  - [x] 23.1 创建任务管理 API
    - 实现创建学习/练习/考试任务 API
    - 实现获取可分配学员列表 API
    - _Requirements: 14.1_

  - [x] 23.2 创建 StepBasicInfo 基本信息步骤
    - 实现任务类型选择
    - 实现标题、描述、截止日期输入
    - 考试任务额外输入开始时间、时长、及格分数
    - _Requirements: 14.2, 14.3, 14.4_

  - [x] 23.3 创建 StepResources 资源选择步骤
    - 学习任务：知识文档多选
    - 练习任务：试卷多选 + 知识文档可选
    - 考试任务：试卷单选
    - _Requirements: 14.5, 14.6, 14.7, 14.8_

  - [x] 23.4 创建 StepAssignees 学员选择步骤
    - 根据当前角色过滤可选学员
    - 支持全选和批量选择
    - _Requirements: 14.9, 14.10, 14.11, 14.12_

  - [ ]* 23.5 写属性测试：学员选择范围限制
    - **Property 17: 学员选择范围限制**
    - **Validates: Requirements 14.10, 14.11, 14.12**

  - [x] 23.6 创建 TaskWizard 任务创建向导
    - 组合三个步骤组件
    - 实现步骤导航和数据传递
    - _Requirements: 14.2, 14.5, 14.9, 14.13_

  - [x] 23.7 创建 TaskManagement 页面
    - 展示任务列表
    - 集成任务创建向导
    - 管理员显示强制结束按钮
    - _Requirements: 14.1, 14.14_

- [x] 24. 实现评分中心
  - [x] 24.1 创建评分 API
    - 创建 src/features/grading/api/grading.ts
    - 实现获取待评分列表、提交评分 API
    - _Requirements: 15.1_

  - [x] 24.2 创建 PendingList 待评分列表
    - 展示待评分考试列表
    - _Requirements: 15.1_

  - [x] 24.3 创建 GradingDetail 评分详情
    - 展示学员答案
    - 实现分数和评语输入
    - _Requirements: 15.2, 15.3_

  - [x] 24.4 创建 GradingCenter 页面
    - 组合列表和详情
    - _Requirements: 15.1, 15.4_

- [x] 25. 实现抽查中心
  - [x] 25.1 创建抽查 API
    - 创建 src/features/spot-checks/api/spot-checks.ts
    - 实现抽查记录 CRUD API
    - _Requirements: 16.1_

  - [x] 25.2 创建 SpotCheckForm 抽查表单
    - 实现学员选择（根据角色过滤）
    - 实现内容、评分、评语输入
    - _Requirements: 16.2, 16.3, 16.4, 16.5_

  - [ ]* 25.3 写属性测试：抽查学员范围限制
    - **Property 19: 抽查学员范围限制**
    - **Validates: Requirements 16.4, 16.5**

  - [x] 25.4 创建 SpotCheckList 抽查列表
    - 展示抽查记录（按时间倒序）
    - _Requirements: 16.1_

  - [x] 25.5 创建 SpotCheckCenter 页面
    - 组合列表和表单
    - _Requirements: 16.1_

- [x] 26. Checkpoint - 确保导师功能完整
  - 确保所有测试通过，询问用户是否有问题


## Phase 7: 管理员功能模块

- [x] 27. 实现知识库管理
  - [x] 27.1 创建知识管理 API
    - 扩展 knowledge API 支持 CRUD 操作
    - _Requirements: 17.1_

  - [x] 27.2 创建 KnowledgeForm 知识表单
    - 实现知识类型选择
    - 应急类：结构化字段表单
    - 其他类型：Markdown 编辑器
    - 实现分类标签设置
    - _Requirements: 17.2, 17.3, 17.4, 17.5_

  - [x] 27.3 创建 KnowledgeManagement 页面
    - 展示知识列表，支持搜索和分类筛选
    - 集成知识表单（创建/编辑）
    - 实现删除确认
    - _Requirements: 17.1, 17.6, 17.7_

- [x] 28. 实现用户管理
  - [x] 28.1 创建用户管理 API
    - 创建 src/features/user-mgmt/api/users.ts
    - 实现用户 CRUD、停用/启用、重置密码 API
    - _Requirements: 18.1_

  - [x] 28.2 创建 UserForm 用户表单
    - 实现基础信息输入
    - _Requirements: 18.2, 18.3_

  - [x] 28.3 创建 RoleSelector 角色选择器
    - 实现角色多选
    - 学员角色始终选中且不可取消
    - _Requirements: 18.7_

  - [ ]* 28.4 写属性测试：学员角色不可移除
    - **Property 21: 学员角色不可移除**
    - **Validates: Requirements 18.7**

  - [x] 28.5 创建 UserList 用户列表
    - 展示用户列表
    - 实现停用/启用、重置密码操作
    - _Requirements: 18.1, 18.4, 18.5, 18.6_

  - [x] 28.6 创建 UserDirectory 页面
    - 组合列表和表单
    - _Requirements: 18.1_

- [x] 29. 实现组织架构管理
  - [x] 29.1 创建组织架构 API
    - 实现获取室列表、成员列表 API
    - 实现调整所属室、指定室经理 API
    - _Requirements: 19.1_

  - [x] 29.2 创建 DepartmentTree 组织架构树
    - 展示室列表和成员
    - 实现调整所属室功能
    - 实现指定室经理功能
    - _Requirements: 19.1, 19.2, 19.3_

  - [x] 29.3 创建 OrganizationView 页面
    - 展示组织架构树
    - _Requirements: 19.1_

- [x] 30. 实现师徒关系管理
  - [x] 30.1 创建师徒关系 API
    - 实现获取导师列表、学员列表 API
    - 实现指定/解除导师 API
    - _Requirements: 19.4_

  - [x] 30.2 创建 MentorshipList 师徒关系列表
    - 展示导师和其学员
    - 实现指定/解除导师功能
    - _Requirements: 19.4, 19.5, 19.6_

  - [x] 30.3 创建 MentorshipView 页面
    - 展示师徒关系列表
    - _Requirements: 19.4_

- [x] 31. Checkpoint - 确保管理员功能完整
  - 确保所有测试通过，询问用户是否有问题


## Phase 8: 团队经理功能模块

- [x] 32. 实现团队数据看板
  - [x] 32.1 创建团队数据 API
    - 创建 src/features/team/api/team.ts
    - 实现获取团队概览、知识热度 API
    - _Requirements: 20.1, 20.3_

  - [x] 32.2 创建 TeamOverview 团队概览组件
    - 展示各室完成率对比图表
    - 展示各室成绩对比图表
    - _Requirements: 20.1, 20.2_

  - [x] 32.3 创建 KnowledgeHeat 知识热度组件
    - 展示知识文档阅读统计排行
    - _Requirements: 20.3_

  - [x] 32.4 创建 TeamDashboard 页面
    - 组合团队概览和知识热度
    - 确保所有操作按钮隐藏（只读视图）
    - _Requirements: 20.1, 20.4_

  - [ ]* 32.5 写属性测试：团队经理只读视图
    - **Property 20: 团队经理只读视图**
    - **Validates: Requirements 20.4**

- [x] 33. Checkpoint - 确保团队经理功能完整
  - 确保所有测试通过，询问用户是否有问题

## Phase 9: 响应式设计与优化

- [x] 34. 实现响应式布局
  - [x] 34.1 优化 Sidebar 响应式
    - 桌面：完整侧边栏
    - 平板：可折叠侧边栏
    - 移动：抽屉式侧边栏或底部导航
    - _Requirements: 22.1, 22.2, 22.3_

  - [x] 34.2 优化表格响应式
    - 小屏幕下使用卡片列表替代表格
    - _Requirements: 22.4_

  - [x] 34.3 优化表单响应式
    - 调整表单布局适应不同屏幕
    - _Requirements: 22.4_

- [x] 35. 实现加载状态和错误处理
  - [x] 35.1 创建全局错误边界
    - 捕获未处理的错误
    - 展示友好的错误页面
    - _Requirements: 23.3_

  - [x] 35.2 优化 API 请求状态展示
    - 统一加载指示器样式
    - 统一错误提示样式
    - _Requirements: 23.1, 23.2, 23.3_

  - [ ]* 35.3 写属性测试：令牌自动刷新
    - **Property 3: 令牌自动刷新**
    - **Validates: Requirements 1.6**

- [x] 36. Final Checkpoint - 确保所有功能完整
  - 确保所有测试通过，询问用户是否有问题

