# Requirements Document

## Introduction

本文档定义 LMS（学习管理系统）前端的功能需求。前端采用 React + TypeScript + Tailwind CSS 技术栈，与 Django REST Framework 后端 API 对接，实现"学、练、考、评"的能力闭环。

系统服务于五种角色：学员、导师、室经理、管理员和团队经理。前端需要根据用户角色动态展示不同的菜单、路由和功能模块，实现完整的权限控制和数据隔离。

## Glossary

- **LMS (Learning Management System)**: 学习管理系统
- **学员 (Student)**: 系统默认角色，执行分配的学习、练习、考试任务
- **导师 (Mentor)**: 管理名下学员，可创建题目/试卷/任务
- **室经理 (Department Manager)**: 管理本室人员，权限同导师但数据范围为整个室
- **管理员 (Admin)**: 全平台治理，拥有所有资源的完整 CRUD 权限
- **团队经理 (Team Manager)**: 只读数据分析角色
- **知识文档 (Knowledge Document)**: 学习资源，分为应急类（EMERGENCY）和其他类型（OTHER）
- **题目 (Question)**: 测试资源的原子单位，包含单选/多选/判断/简答
- **试卷 (Quiz/Paper)**: 题目容器，不包含考试规则
- **学习任务 (Learning Task)**: 指派学员学习指定知识文档
- **练习任务 (Practice Task)**: 指派学员完成试卷练习，可重复提交
- **考试任务 (Exam Task)**: 正式考核，仅允许一次作答                 
- **JWT (JSON Web Token)**: 用于用户认证的令牌
- **角色切换 (Role Switch)**: 高权限用户在不同角色间切换的功能

## Requirements

### Requirement 1: 用户认证

**User Story:** 作为用户，我希望能够安全登录系统并管理我的会话，以便访问系统功能。

#### Acceptance Criteria

1. WHEN 用户访问登录页面 THEN LMS 前端 SHALL 展示用户名和密码输入框及登录按钮
2. WHEN 用户提交有效凭证 THEN LMS 前端 SHALL 调用登录 API 并存储返回的 JWT 令牌
3. WHEN 登录成功 THEN LMS 前端 SHALL 根据用户角色跳转到对应的仪表盘页面
4. IF 登录失败 THEN LMS 前端 SHALL 展示明确的错误提示信息
5. WHEN 用户点击登出 THEN LMS 前端 SHALL 清除本地存储的令牌并跳转到登录页面
6. WHEN JWT 令牌过期 THEN LMS 前端 SHALL 自动使用刷新令牌获取新的访问令牌
7. IF 刷新令牌也过期 THEN LMS 前端 SHALL 跳转到登录页面并提示重新登录

### Requirement 2: 角色切换

**User Story:** 作为高权限用户（导师/室经理/管理员），我希望能够在不同角色间切换，以便执行不同职责的操作。

#### Acceptance Criteria

1. WHEN 高权限用户登录 THEN LMS 前端 SHALL 在顶部导航栏展示角色切换器
2. WHEN 用户点击角色切换器 THEN LMS 前端 SHALL 展示该用户所有可用角色列表
3. WHEN 用户选择新角色 THEN LMS 前端 SHALL 调用角色切换 API 并更新本地令牌
4. WHEN 角色切换成功 THEN LMS 前端 SHALL 实时刷新菜单、路由和页面内容
5. WHEN 角色切换成功 THEN LMS 前端 SHALL 清除前一角色的所有状态数据
6. IF 用户仅有学员角色 THEN LMS 前端 SHALL 隐藏角色切换器

### Requirement 3: 导航与路由

**User Story:** 作为用户，我希望能够通过导航菜单访问我有权限的功能模块。

#### Acceptance Criteria

1. WHEN 用户登录成功 THEN LMS 前端 SHALL 根据当前角色展示对应的侧边栏菜单
2. WHEN 学员角色生效 THEN LMS 前端 SHALL 展示仪表盘、知识中心、任务中心、个人中心菜单
3. WHEN 导师或室经理角色生效 THEN LMS 前端 SHALL 展示仪表盘、测试中心、任务管理、评分中心、抽查中心菜单
4. WHEN 管理员角色生效 THEN LMS 前端 SHALL 展示测试中心、知识库管理、任务管理、用户与权限菜单
5. WHEN 团队经理角色生效 THEN LMS 前端 SHALL 展示团队数据看板菜单
6. IF 用户访问无权限的路由 THEN LMS 前端 SHALL 跳转到 403 页面或重定向到有权限的页面

### Requirement 4: 学员仪表盘

**User Story:** 作为学员，我希望在仪表盘看到待办任务和最新知识，以便快速了解我需要完成的工作。

#### Acceptance Criteria

1. WHEN 学员访问仪表盘 THEN LMS 前端 SHALL 展示待办任务列表（学习/练习/考试）
2. WHEN 学员访问仪表盘 THEN LMS 前端 SHALL 展示最新发布的知识文档卡片
3. WHEN 学员点击待办任务 THEN LMS 前端 SHALL 跳转到对应任务详情页
4. WHEN 学员点击知识卡片 THEN LMS 前端 SHALL 跳转到知识详情页

### Requirement 5: 学员知识中心

**User Story:** 作为学员，我希望能够浏览和筛选知识文档，以便自主学习感兴趣的内容。

#### Acceptance Criteria

1. WHEN 学员访问知识中心 THEN LMS 前端 SHALL 展示知识文档卡片列表
2. WHEN 学员访问知识中心 THEN LMS 前端 SHALL 展示一级分类（领域大类）筛选器
3. WHEN 学员选择一级分类 THEN LMS 前端 SHALL 动态加载并展示对应的二级分类选项
4. WHEN 学员查看知识卡片 THEN LMS 前端 SHALL 展示操作标签、标题、摘要、修改人和修改时间
5. WHEN 学员点击知识卡片 THEN LMS 前端 SHALL 跳转到知识详情页
6. WHEN 学员查看应急类知识详情 THEN LMS 前端 SHALL 按结构化字段顺序展示已填写内容
7. WHEN 学员查看其他类型知识详情 THEN LMS 前端 SHALL 渲染 Markdown 正文内容
8. WHEN 学员查看知识详情 THEN LMS 前端 SHALL 在右侧展示自动生成的内容目录

### Requirement 6: 学员任务中心

**User Story:** 作为学员，我希望能够查看和管理我的所有任务，以便跟踪学习进度。

#### Acceptance Criteria

1. WHEN 学员访问任务中心 THEN LMS 前端 SHALL 展示任务列表
2. WHEN 学员访问任务中心 THEN LMS 前端 SHALL 提供按类型（学习/练习/考试）筛选功能
3. WHEN 学员访问任务中心 THEN LMS 前端 SHALL 提供按状态（进行中/已完成/已逾期）筛选功能
4. WHEN 学员查看任务列表 THEN LMS 前端 SHALL 展示任务标题、类型、状态、截止时间和进度
5. WHEN 学员点击任务 THEN LMS 前端 SHALL 根据任务类型跳转到对应的任务详情页

### Requirement 7: 学习任务执行

**User Story:** 作为学员，我希望能够完成学习任务中的知识学习确认。

#### Acceptance Criteria

1. WHEN 学员查看学习任务详情 THEN LMS 前端 SHALL 展示任务标题、介绍、分配人、截止时间、整体进度
2. WHEN 学员查看学习任务详情 THEN LMS 前端 SHALL 展示知识文档列表及每个文档的完成状态
3. WHEN 学员点击未完成的知识文档 THEN LMS 前端 SHALL 跳转到知识详情页并展示「我已学习掌握」按钮
4. WHEN 学员点击「我已学习掌握」 THEN LMS 前端 SHALL 调用 API 记录完成状态并更新界面
5. WHEN 学员查看已完成的知识文档 THEN LMS 前端 SHALL 展示完成时间并隐藏确认按钮
6. WHEN 所有知识文档完成 THEN LMS 前端 SHALL 更新任务状态为已完成

### Requirement 8: 练习任务执行

**User Story:** 作为学员，我希望能够完成练习任务并多次重做，以便巩固知识点。

#### Acceptance Criteria

1. WHEN 学员查看练习任务详情 THEN LMS 前端 SHALL 展示任务标题、介绍、分配人、截止时间、整体进度
2. WHEN 学员查看练习任务详情 THEN LMS 前端 SHALL 展示关联知识列表和试卷列表
3. WHEN 学员查看试卷子任务 THEN LMS 前端 SHALL 展示试卷名称、最近成绩、最佳成绩、作答次数
4. WHEN 学员点击「开始练习」 THEN LMS 前端 SHALL 加载试卷题目并进入答题界面
5. WHEN 学员答题 THEN LMS 前端 SHALL 支持单选、多选、判断、简答题型的作答
6. WHEN 学员提交练习 THEN LMS 前端 SHALL 展示自动判分结果和题目解析
7. WHEN 学员点击「再次练习」 THEN LMS 前端 SHALL 允许重新作答同一试卷

### Requirement 9: 考试任务执行

**User Story:** 作为学员，我希望能够在规定时间内完成考试。

#### Acceptance Criteria

1. WHEN 学员查看考试任务详情 THEN LMS 前端 SHALL 展示任务标题、介绍、题目数量、考试时长、及格分数
2. WHEN 学员查看考试任务详情 THEN LMS 前端 SHALL 展示开始时间和截止时间
3. WHEN 当前时间在考试窗口内 THEN LMS 前端 SHALL 展示「进入考试」按钮
4. IF 当前时间不在考试窗口内 THEN LMS 前端 SHALL 禁用「进入考试」按钮并展示提示
5. WHEN 学员进入考试 THEN LMS 前端 SHALL 加载试卷并启动倒计时
6. WHEN 考试时间到达 THEN LMS 前端 SHALL 自动提交试卷
7. WHEN 学员手动提交试卷 THEN LMS 前端 SHALL 调用提交 API 并展示提交成功提示
8. IF 学员已提交考试 THEN LMS 前端 SHALL 展示「查看结果」按钮并禁止重新作答

### Requirement 10: 学员个人中心

**User Story:** 作为学员，我希望能够查看我的个人信息和历史记录。

#### Acceptance Criteria

1. WHEN 学员访问个人中心 THEN LMS 前端 SHALL 展示姓名、团队、导师信息
2. WHEN 学员查看历史成绩 THEN LMS 前端 SHALL 展示练习和考试的成绩记录列表
3. WHEN 学员查看错题本 THEN LMS 前端 SHALL 展示练习和考试中答错的题目
4. WHEN 学员点击导出记录 THEN LMS 前端 SHALL 下载包含历史成绩的文件

### Requirement 11: 导师/室经理仪表盘

**User Story:** 作为导师/室经理，我希望在仪表盘看到所辖人员的学习情况概览。

#### Acceptance Criteria

1. WHEN 导师/室经理访问仪表盘 THEN LMS 前端 SHALL 展示所辖学员的完成率统计
2. WHEN 导师/室经理访问仪表盘 THEN LMS 前端 SHALL 展示所辖学员的平均分统计
3. WHEN 导师/室经理访问仪表盘 THEN LMS 前端 SHALL 展示待评分考试数量
4. WHEN 导师/室经理访问仪表盘 THEN LMS 前端 SHALL 提供新建任务、新建试卷、抽查的快捷入口

### Requirement 12: 测试中心 - 题目管理

**User Story:** 作为导师/室经理/管理员，我希望能够管理题库中的题目，并能快速将选中的题目组卷发布任务。

#### Acceptance Criteria

1. WHEN 用户访问题目管理 THEN LMS 前端 SHALL 展示题目列表，支持搜索和筛选
2. WHEN 用户点击创建题目 THEN LMS 前端 SHALL 展示题目创建表单
3. WHEN 用户创建题目 THEN LMS 前端 SHALL 支持单选、多选、判断、简答四种题型
4. WHEN 用户创建题目 THEN LMS 前端 SHALL 要求填写题目内容、选项（如适用）、答案和解析
5. WHEN 导师/室经理查看题目列表 THEN LMS 前端 SHALL 对非自己创建的题目隐藏编辑/删除按钮
6. WHEN 管理员查看题目列表 THEN LMS 前端 SHALL 对所有题目展示编辑/删除按钮
7. WHEN 管理员点击批量导入 THEN LMS 前端 SHALL 展示 Excel 文件上传界面
8. WHEN 用户勾选多个题目 THEN LMS 前端 SHALL 展示「快速组卷」操作按钮
9. WHEN 用户点击「快速组卷」 THEN LMS 前端 SHALL 展示试卷名称输入和任务类型选择（练习/考试）
10. WHEN 用户完成快速组卷设置 THEN LMS 前端 SHALL 跳转到任务创建流程的学员选择步骤

### Requirement 13: 测试中心 - 试卷管理

**User Story:** 作为导师/室经理/管理员，我希望能够管理试卷资源，并能快速将试卷发布为任务。

#### Acceptance Criteria

1. WHEN 用户访问试卷管理 THEN LMS 前端 SHALL 展示试卷列表，支持搜索
2. WHEN 用户点击创建试卷 THEN LMS 前端 SHALL 展示试卷创建表单
3. WHEN 用户创建试卷 THEN LMS 前端 SHALL 允许从题库选择已有题目
4. WHEN 用户创建试卷 THEN LMS 前端 SHALL 允许在创建过程中新建题目
5. WHEN 导师/室经理查看试卷列表 THEN LMS 前端 SHALL 对非自己创建的试卷隐藏编辑/删除按钮
6. WHEN 管理员查看试卷列表 THEN LMS 前端 SHALL 对所有试卷展示编辑/删除按钮
7. WHEN 用户新建试卷完成 THEN LMS 前端 SHALL 展示「立即发布任务」选项
8. WHEN 用户点击「立即发布任务」 THEN LMS 前端 SHALL 展示任务类型选择（练习/考试）
9. WHEN 用户选择任务类型 THEN LMS 前端 SHALL 跳转到任务创建流程（填写基本信息后进入学员选择）
10. WHEN 用户勾选多个试卷 THEN LMS 前端 SHALL 展示「快速发布」操作按钮
11. WHEN 用户勾选单个试卷并点击「快速发布」 THEN LMS 前端 SHALL 展示任务类型选择（练习/考试）
12. WHEN 用户勾选多个试卷并点击「快速发布」 THEN LMS 前端 SHALL 仅允许选择练习任务类型
13. WHEN 用户完成快速发布设置 THEN LMS 前端 SHALL 跳转到任务创建流程（填写基本信息后进入学员选择）

### Requirement 14: 任务管理

**User Story:** 作为导师/室经理/管理员，我希望能够创建和管理任务。

#### Acceptance Criteria

1. WHEN 用户访问任务管理 THEN LMS 前端 SHALL 展示任务列表，支持按类型和状态筛选
2. WHEN 用户点击新建任务 THEN LMS 前端 SHALL 展示任务创建向导第一步：基本信息
3. WHEN 用户填写基本信息 THEN LMS 前端 SHALL 要求选择任务类型（学习/练习/考试）、填写标题、描述和截止日期
4. WHEN 用户选择考试任务类型 THEN LMS 前端 SHALL 额外要求填写开始时间、考试时长和及格分数
5. WHEN 用户完成基本信息并点击下一步 THEN LMS 前端 SHALL 进入第二步：资源选择
6. WHEN 学习任务进入资源选择 THEN LMS 前端 SHALL 展示知识文档选择器（多选）
7. WHEN 练习任务进入资源选择 THEN LMS 前端 SHALL 展示试卷选择器（多选）和知识文档选择器（可选）
8. WHEN 考试任务进入资源选择 THEN LMS 前端 SHALL 展示试卷选择器（单选）
9. WHEN 用户完成资源选择并点击下一步 THEN LMS 前端 SHALL 进入第三步：学员选择
10. WHEN 导师选择学员 THEN LMS 前端 SHALL 仅展示其名下学员
11. WHEN 室经理选择学员 THEN LMS 前端 SHALL 仅展示本室学员
12. WHEN 管理员选择学员 THEN LMS 前端 SHALL 展示全平台学员
13. WHEN 用户完成学员选择并提交 THEN LMS 前端 SHALL 调用创建任务 API 并展示成功提示
14. WHEN 管理员查看任务详情 THEN LMS 前端 SHALL 展示「强制结束」按钮

### Requirement 15: 评分中心

**User Story:** 作为导师/室经理，我希望能够对考试中的主观题进行人工评分。

#### Acceptance Criteria

1. WHEN 用户访问评分中心 THEN LMS 前端 SHALL 展示待评分考试列表
2. WHEN 用户点击待评分考试 THEN LMS 前端 SHALL 展示学员答案和评分输入界面
3. WHEN 用户对主观题评分 THEN LMS 前端 SHALL 提供分数输入框和评语输入框
4. WHEN 用户提交评分 THEN LMS 前端 SHALL 调用评分 API 并更新列表状态

### Requirement 16: 抽查中心

**User Story:** 作为导师/室经理，我希望能够录入线下抽查的评分记录。

#### Acceptance Criteria

1. WHEN 用户访问抽查中心 THEN LMS 前端 SHALL 展示抽查记录列表（按时间倒序）
2. WHEN 用户点击新建抽查 THEN LMS 前端 SHALL 展示抽查记录创建表单
3. WHEN 用户创建抽查记录 THEN LMS 前端 SHALL 要求选择被抽查学员、填写抽查内容、评分和评语
4. WHEN 导师创建抽查 THEN LMS 前端 SHALL 仅展示其名下学员供选择
5. WHEN 室经理创建抽查 THEN LMS 前端 SHALL 仅展示本室学员供选择

### Requirement 17: 知识库管理（管理员）

**User Story:** 作为管理员，我希望能够维护知识文档资源。

#### Acceptance Criteria

1. WHEN 管理员访问知识库管理 THEN LMS 前端 SHALL 展示知识文档列表，支持搜索和分类筛选
2. WHEN 管理员点击创建知识 THEN LMS 前端 SHALL 展示知识类型选择（应急类/其他类型）
3. WHEN 管理员选择应急类 THEN LMS 前端 SHALL 展示结构化字段表单（故障场景/触发流程/解决方案/验证方案/恢复方案）
4. WHEN 管理员选择其他类型 THEN LMS 前端 SHALL 展示 Markdown 编辑器
5. WHEN 管理员创建知识 THEN LMS 前端 SHALL 要求设置分类标签（所属条线、所属系统、操作类型）
6. WHEN 管理员编辑知识 THEN LMS 前端 SHALL 加载现有内容到表单
7. WHEN 管理员删除知识 THEN LMS 前端 SHALL 展示确认对话框

### Requirement 18: 用户管理（管理员）

**User Story:** 作为管理员，我希望能够管理平台所有用户。

#### Acceptance Criteria

1. WHEN 管理员访问用户列表 THEN LMS 前端 SHALL 展示用户列表（姓名/工号/账号/状态/所属室/角色）
2. WHEN 管理员点击新建用户 THEN LMS 前端 SHALL 展示用户创建表单
3. WHEN 管理员编辑用户 THEN LMS 前端 SHALL 展示用户信息编辑表单
4. WHEN 管理员停用用户 THEN LMS 前端 SHALL 展示确认对话框并调用停用 API
5. WHEN 管理员启用用户 THEN LMS 前端 SHALL 调用启用 API 并更新列表状态
6. WHEN 管理员重置密码 THEN LMS 前端 SHALL 展示确认对话框并显示生成的临时密码
7. WHEN 管理员配置角色 THEN LMS 前端 SHALL 展示角色多选器（学员角色不可取消）

### Requirement 19: 组织架构管理（管理员）

**User Story:** 作为管理员，我希望能够维护组织架构和师徒关系。

#### Acceptance Criteria

1. WHEN 管理员访问组织架构 THEN LMS 前端 SHALL 展示室列表和每个室的成员
2. WHEN 管理员调整用户所属室 THEN LMS 前端 SHALL 提供室选择器并调用更新 API
3. WHEN 管理员指定室经理 THEN LMS 前端 SHALL 展示确认对话框并调用指定 API
4. WHEN 管理员访问师徒关系 THEN LMS 前端 SHALL 展示导师列表和每位导师的学员
5. WHEN 管理员为学员指定导师 THEN LMS 前端 SHALL 提供导师选择器
6. WHEN 管理员解除师徒关系 THEN LMS 前端 SHALL 展示确认对话框并调用解除 API

### Requirement 20: 团队经理数据看板

**User Story:** 作为团队经理，我希望能够查看跨团队的数据分析。

#### Acceptance Criteria

1. WHEN 团队经理访问数据看板 THEN LMS 前端 SHALL 展示各室完成率对比图表
2. WHEN 团队经理访问数据看板 THEN LMS 前端 SHALL 展示各室成绩对比图表
3. WHEN 团队经理查看知识热度 THEN LMS 前端 SHALL 展示知识文档阅读统计排行
4. WHILE 团队经理浏览数据 THEN LMS 前端 SHALL 仅提供只读视图，隐藏所有编辑操作

### Requirement 21: 通用 UI 组件

**User Story:** 作为开发者，我希望有一套统一的 UI 组件库，以保证界面一致性。

#### Acceptance Criteria

1. WHEN 开发者使用按钮组件 THEN LMS 前端 SHALL 提供主要、次要、危险等样式变体
2. WHEN 开发者使用表单组件 THEN LMS 前端 SHALL 提供输入框、选择器、日期选择器等
3. WHEN 开发者使用表格组件 THEN LMS 前端 SHALL 支持分页、排序、筛选功能
4. WHEN 开发者使用卡片组件 THEN LMS 前端 SHALL 提供统一的卡片布局样式
5. WHEN 开发者使用模态框组件 THEN LMS 前端 SHALL 提供确认对话框和表单对话框
6. WHEN 开发者使用消息提示 THEN LMS 前端 SHALL 提供成功、错误、警告、信息四种类型

### Requirement 22: 响应式设计

**User Story:** 作为用户，我希望能够在不同设备上使用系统。

#### Acceptance Criteria

1. WHEN 用户在桌面设备访问 THEN LMS 前端 SHALL 展示完整的侧边栏导航
2. WHEN 用户在平板设备访问 THEN LMS 前端 SHALL 支持侧边栏折叠
3. WHEN 用户在移动设备访问 THEN LMS 前端 SHALL 使用底部导航或汉堡菜单
4. WHEN 用户调整窗口大小 THEN LMS 前端 SHALL 自适应调整布局

### Requirement 23: 错误处理与加载状态

**User Story:** 作为用户，我希望在操作过程中获得清晰的反馈。

#### Acceptance Criteria

1. WHEN API 请求进行中 THEN LMS 前端 SHALL 展示加载指示器
2. WHEN API 请求成功 THEN LMS 前端 SHALL 展示成功提示（如适用）
3. IF API 请求失败 THEN LMS 前端 SHALL 展示明确的错误信息
4. IF 网络连接断开 THEN LMS 前端 SHALL 展示网络错误提示
5. WHEN 表单提交失败 THEN LMS 前端 SHALL 在对应字段展示验证错误信息
