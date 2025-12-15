# Requirements Document

## Introduction

本系统是一个企业级学习管理系统（LMS），旨在实现"学、练、考、评"的能力闭环。系统采用 React 前端 + Django 后端架构，遵循"资源与任务分离"的核心原则（先有资源，后发任务）。

系统服务于组织内的多种角色：学员、导师、室经理、管理员和团队经理，通过知识文档、题库、试卷等资源，以及学习任务、练习任务、考试任务三种任务类型，完成人员能力培养与评估。

## Glossary

- **LMS (Learning Management System)**: 学习管理系统
- **学员 (Student)**: 系统默认角色，执行分配的学习、练习、考试任务
- **导师 (Mentor)**: 管理名下学员，可创建题目/试卷/任务
- **室经理 (Department Manager)**: 管理本室人员，权限同导师但数据范围为整个室
- **管理员 (Admin)**: 全平台治理，拥有所有资源的完整 CRUD 权限
- **团队经理 (Team Manager)**: 只读数据分析角色
- **知识文档 (Knowledge Document)**: 学习资源，分为应急类和其他类型
- **题目 (Question)**: 测试资源的原子单位，包含单选/多选/判断/简答
- **试卷 (Paper/Quiz)**: 题目容器，不包含考试规则
- **学习任务 (Learning Task)**: 指派学员学习指定知识文档
- **练习任务 (Practice Task)**: 指派学员完成试卷练习，可重复提交
- **考试任务 (Exam Task)**: 正式考核，仅允许一次作答
- **室 (Department)**: 组织单位，系统固定为一室/二室
- **抽查 (Spot Check)**: 线下执行、线上录入的独立评估模块


## Requirements

### Requirement 1: 用户认证与角色管理

**User Story:** 作为系统用户，我希望能够安全登录系统并根据我的角色获得相应的功能权限，以便我能够执行与我职责相关的操作。

#### Acceptance Criteria

1. WHEN 用户提交有效的登录凭证 THEN LMS SHALL 验证凭证并创建用户会话
2. WHEN 用户登录成功 THEN LMS SHALL 返回用户的所有可用角色列表
3. WHEN 高权限用户（导师/室经理/管理员）切换角色 THEN LMS SHALL 实时刷新菜单、路由和接口权限
4. WHEN 用户切换角色 THEN LMS SHALL 清除前一角色的所有状态数据，禁止跨角色残留
5. IF 用户账号被停用 THEN LMS SHALL 拒绝登录请求并返回明确的错误信息
6. WHEN 管理员重置用户密码 THEN LMS SHALL 生成临时密码并要求用户首次登录时修改

### Requirement 2: 用户管理

**User Story:** 作为管理员，我希望能够管理平台所有用户的账号状态与基础归属信息，以便维护系统用户数据的准确性。

#### Acceptance Criteria

1. WHEN 管理员创建新用户 THEN LMS SHALL 存储用户基础信息（姓名/工号/登录账号）并默认分配学员角色
2. WHEN 管理员编辑用户信息 THEN LMS SHALL 更新用户的基础信息和组织归属
3. WHEN 管理员停用用户 THEN LMS SHALL 将用户状态设为停用，该用户无法登录且不出现在人员选择器中
4. WHEN 管理员启用已停用用户 THEN LMS SHALL 恢复用户的登录能力和选择器可见性
5. IF 用户已产生学习/任务/考试数据 THEN LMS SHALL 禁止删除该用户，仅允许停用
6. WHEN 管理员为用户配置角色 THEN LMS SHALL 在保留默认学员角色的基础上附加导师/室经理/管理员/团队经理角色


### Requirement 3: 组织架构与师徒关系管理

**User Story:** 作为管理员，我希望能够维护组织架构和师徒关系，以便系统能够正确计算各角色的数据可见范围。

#### Acceptance Criteria

1. WHEN 管理员调整用户所属室 THEN LMS SHALL 更新用户的组织归属，历史任务数据保持不变
2. WHEN 管理员指定某用户为室经理 THEN LMS SHALL 立即赋予该用户室经理权限
3. WHEN 管理员更换室经理 THEN LMS SHALL 撤销原室经理权限并赋予新室经理权限
4. WHEN 管理员为学员指定导师 THEN LMS SHALL 建立师徒绑定关系
5. WHEN 管理员解除师徒关系 THEN LMS SHALL 移除绑定，历史任务数据保持不变
6. IF 学员已绑定导师 THEN LMS SHALL 在绑定新导师时自动解除原有绑定（一个学员同时只能绑定一个导师）

### Requirement 4: 知识文档管理

**User Story:** 作为管理员，我希望能够维护知识文档资源，以便为学习任务提供内容支撑。

#### Acceptance Criteria

1. WHEN 管理员创建知识文档 THEN LMS SHALL 要求指定知识类型（EMERGENCY 应急类 / OTHER 其他类型）
2. WHEN 管理员创建应急类知识 THEN LMS SHALL 启用结构化正文字段（故障场景/触发流程/解决方案/验证方案/恢复方案）
3. WHEN 管理员创建其他类型知识 THEN LMS SHALL 启用 Markdown/富文本自由正文
4. WHEN 管理员编辑知识文档 THEN LMS SHALL 更新内容并记录最后更新时间
5. WHEN 管理员删除知识文档 THEN LMS SHALL 检查是否被任务引用，若被引用则禁止删除
6. WHEN 管理员设置知识分类 THEN LMS SHALL 存储所属条线（一级分类）、所属系统（二级分类）和操作类型标签


### Requirement 5: 题目管理

**User Story:** 作为导师/室经理/管理员，我希望能够管理题库中的题目，以便为试卷和任务提供测试内容。

#### Acceptance Criteria

1. WHEN 用户创建题目 THEN LMS SHALL 存储题目内容、类型（单选/多选/判断/简答）、答案和解析，并记录创建者
2. WHEN 导师或室经理查看题库 THEN LMS SHALL 展示所有题目（包含管理员创建的题目）
3. WHEN 导师或室经理编辑题目 THEN LMS SHALL 仅允许编辑自己创建的题目
4. WHEN 导师或室经理删除题目 THEN LMS SHALL 仅允许删除自己创建的题目
5. WHEN 管理员操作题目 THEN LMS SHALL 允许查看/创建/编辑/删除所有题目
6. WHEN 管理员批量导入题目 THEN LMS SHALL 解析 Excel 模板并创建题目记录，创建者为管理员
7. IF 题目被试卷引用 THEN LMS SHALL 禁止删除该题目

### Requirement 6: 试卷管理

**User Story:** 作为导师/室经理/管理员，我希望能够管理试卷资源，以便为练习和考试任务提供测试载体。

#### Acceptance Criteria

1. WHEN 用户创建试卷 THEN LMS SHALL 存储试卷名称、描述，并记录创建者
2. WHEN 用户向试卷添加题目 THEN LMS SHALL 允许从全平台题库选择已有题目或新建题目
3. WHEN 用户在创建试卷时新建题目 THEN LMS SHALL 将新题目纳入题库，题目作者为当前用户
4. WHEN 导师或室经理查看试卷列表 THEN LMS SHALL 展示所有试卷（包含管理员创建的标准试卷）
5. WHEN 导师或室经理编辑试卷 THEN LMS SHALL 仅允许编辑自己创建的试卷
6. WHEN 导师或室经理删除试卷 THEN LMS SHALL 仅允许删除自己创建的试卷
7. WHEN 管理员操作试卷 THEN LMS SHALL 允许查看/创建/编辑/删除所有试卷
8. IF 试卷被任务引用 THEN LMS SHALL 禁止删除该试卷


### Requirement 7: 学习任务管理

**User Story:** 作为导师/室经理/管理员，我希望能够创建学习任务并分配给学员，以便让学员完成指定知识的学习确认。

#### Acceptance Criteria

1. WHEN 用户创建学习任务 THEN LMS SHALL 要求选择知识文档（可多选）和目标学员
2. WHEN 导师创建学习任务 THEN LMS SHALL 仅允许选择其名下学员
3. WHEN 室经理创建学习任务 THEN LMS SHALL 仅允许选择本室学员
4. WHEN 管理员创建学习任务 THEN LMS SHALL 允许选择任意学员（跨团队发布）
5. WHEN 学习任务创建成功 THEN LMS SHALL 为每个学员创建任务分配记录，初始状态为"进行中"
6. WHEN 管理员强制结束任务 THEN LMS SHALL 将任务状态设为"已结束"，未完成的子任务标记为"已逾期"

### Requirement 8: 学习任务执行

**User Story:** 作为学员，我希望能够查看并完成分配给我的学习任务，以便掌握指定的知识内容。

#### Acceptance Criteria

1. WHEN 学员查看学习任务详情 THEN LMS SHALL 展示任务标题、介绍、分配人、截止时间、整体进度和知识文档列表
2. WHEN 学员进入未完成的知识子任务 THEN LMS SHALL 展示知识内容和「我已学习掌握」按钮
3. WHEN 学员点击「我已学习掌握」 THEN LMS SHALL 记录完成状态和完成时间
4. WHEN 学员查看已完成的知识子任务 THEN LMS SHALL 展示知识内容（只读）和完成时间
5. WHEN 所有知识子任务完成 THEN LMS SHALL 将学习任务状态变为「已完成」
6. IF 学员从知识中心直接浏览知识 THEN LMS SHALL 仅展示内容，不影响任务状态
7. IF 任务截止时间已过且未完成 THEN LMS SHALL 将任务状态标记为「已逾期」


### Requirement 9: 练习任务管理

**User Story:** 作为导师/室经理/管理员，我希望能够创建练习任务并分配给学员，以便让学员通过反复练习巩固知识点。

#### Acceptance Criteria

1. WHEN 用户创建练习任务 THEN LMS SHALL 要求选择试卷（可多选）、可选关联知识文档和目标学员
2. WHEN 导师创建练习任务 THEN LMS SHALL 仅允许选择其名下学员
3. WHEN 室经理创建练习任务 THEN LMS SHALL 仅允许选择本室学员
4. WHEN 管理员创建练习任务 THEN LMS SHALL 允许选择任意学员
5. WHEN 练习任务创建成功 THEN LMS SHALL 为每个学员创建任务分配记录，初始状态为"进行中"

### Requirement 10: 练习任务执行

**User Story:** 作为学员，我希望能够完成练习任务并多次重做，以便巩固知识点并提升能力。

#### Acceptance Criteria

1. WHEN 学员查看练习任务详情 THEN LMS SHALL 展示任务标题、介绍、分配人、截止时间、整体进度、关联知识列表和试卷列表
2. WHEN 学员开始练习 THEN LMS SHALL 加载试卷题目并允许作答
3. WHEN 学员提交练习答案 THEN LMS SHALL 自动判分（客观题）并展示解析
4. WHEN 学员查看已完成的试卷子任务 THEN LMS SHALL 展示最近成绩、最佳成绩和作答次数和题目解析
5. WHEN 学员选择再次练习 THEN LMS SHALL 允许重新作答同一试卷
6. WHEN 学员至少完成一次所有试卷 THEN LMS SHALL 将练习任务状态变为「已完成」
7. WHILE 练习任务状态为已完成 THEN LMS SHALL 仍允许学员继续练习


### Requirement 11: 考试任务管理

**User Story:** 作为导师/室经理/管理员，我希望能够创建考试任务并分配给学员，以便对学员的阶段性能力进行正式评估。

#### Acceptance Criteria

1. WHEN 用户创建考试任务 THEN LMS SHALL 要求选择唯一试卷、设置考试时间窗口、限时和目标学员
2. WHEN 用户设置考试规则 THEN LMS SHALL 存储开始时间、截止时间、考试时长和及格分数
3. WHEN 导师创建考试任务 THEN LMS SHALL 仅允许选择其名下学员
4. WHEN 室经理创建考试任务 THEN LMS SHALL 仅允许选择本室学员
5. WHEN 管理员创建考试任务 THEN LMS SHALL 允许选择任意学员
6. WHEN 考试任务创建成功 THEN LMS SHALL 为每个学员创建任务分配记录，初始状态为"待考试"

### Requirement 12: 考试任务执行

**User Story:** 作为学员，我希望能够在规定时间内完成考试，以便证明我的能力水平。

#### Acceptance Criteria

1. WHEN 学员查看考试任务详情 THEN LMS SHALL 展示任务标题、介绍、题目数量、考试时长、及格分数、开始时间和截止时间
2. WHEN 学员在考试时间窗口内进入考试 THEN LMS SHALL 加载试卷并开始计时
3. WHEN 考试时间到达 THEN LMS SHALL 自动提交试卷
4. WHEN 学员手动提交试卷 THEN LMS SHALL 记录提交时间并进行客观题自动评分
5. IF 试卷包含主观题 THEN LMS SHALL 将考试状态设为"待评分"
6. IF 试卷仅包含客观题 THEN LMS SHALL 直接计算最终成绩并完成考试
7. IF 学员已提交考试 THEN LMS SHALL 禁止重新作答
8. IF 当前时间不在考试时间窗口内 THEN LMS SHALL 禁止进入考试


### Requirement 13: 考试评分

**User Story:** 作为导师/室经理，我希望能够对考试中的主观题进行人工评分，以便完成考试结果的最终评定。

#### Acceptance Criteria

1. WHEN 导师/室经理查看评分中心 THEN LMS SHALL 展示所辖学员的待评分考试列表
2. WHEN 评分人查看待评分考试 THEN LMS SHALL 展示学员答案和评分输入界面
3. WHEN 评分人提交主观题分数和评语 THEN LMS SHALL 记录评分结果
4. WHEN 所有主观题评分完成 THEN LMS SHALL 计算最终成绩并将考试状态设为"已完成"
5. WHILE 考试存在未评分的主观题 THEN LMS SHALL 保持考试状态为"待评分"

### Requirement 14: 抽查管理

**User Story:** 作为导师/室经理，我希望能够录入线下抽查的评分记录，以便作为学员能力评估的补充数据。

#### Acceptance Criteria

1. WHEN 用户创建抽查记录 THEN LMS SHALL 存储被抽查学员、抽查内容、评分和评语
2. WHEN 导师创建抽查记录 THEN LMS SHALL 仅允许选择其名下学员
3. WHEN 室经理创建抽查记录 THEN LMS SHALL 仅允许选择本室学员
4. WHEN 用户查看抽查记录列表 THEN LMS SHALL 按时间倒序展示所辖范围内的抽查记录

### Requirement 15: 学员仪表盘

**User Story:** 作为学员，我希望能够在仪表盘看到待办任务和最新知识，以便快速了解我需要完成的工作。

#### Acceptance Criteria

1. WHEN 学员访问仪表盘 THEN LMS SHALL 展示待办任务列表（学习/练习/考试）
2. WHEN 学员访问仪表盘 THEN LMS SHALL 展示最新发布的知识文档
3. WHEN 学员点击待办任务 THEN LMS SHALL 跳转到对应任务详情页


### Requirement 16: 学员知识中心

**User Story:** 作为学员，我希望能够浏览和筛选知识文档，以便自主学习感兴趣的内容。

#### Acceptance Criteria

1. WHEN 学员访问知识中心 THEN LMS SHALL 展示知识文档列表，支持一级筛选（领域大类）和二级筛选（系统对象）
2. WHEN 学员选择一级分类 THEN LMS SHALL 动态加载对应的二级分类选项
3. WHEN 学员查看知识列表 THEN LMS SHALL 以卡片形式展示操作标签、标题、摘要、修改人和修改时间
4. WHEN 学员查看应急类知识详情 THEN LMS SHALL 按结构化字段顺序展示已填写内容
5. WHEN 学员查看其他类型知识详情 THEN LMS SHALL 展示 Markdown/富文本正文
6. WHEN 学员查看知识详情 THEN LMS SHALL 在右侧展示自动生成的内容目录

### Requirement 17: 学员任务中心

**User Story:** 作为学员，我希望能够查看和管理我的所有任务，以便跟踪学习进度。

#### Acceptance Criteria

1. WHEN 学员访问任务中心 THEN LMS SHALL 展示任务列表，支持按类型（学习/练习/考试）和状态（进行中/已完成/已逾期）筛选
2. WHEN 学员查看任务列表 THEN LMS SHALL 展示任务标题、类型、状态、截止时间和进度
3. WHEN 学员点击任务 THEN LMS SHALL 根据任务类型跳转到对应的任务详情页

### Requirement 18: 学员个人中心

**User Story:** 作为学员，我希望能够查看我的个人信息和历史记录，以便了解自己的学习情况。

#### Acceptance Criteria

1. WHEN 学员访问个人中心 THEN LMS SHALL 展示姓名、团队、导师信息
2. WHEN 学员查看历史成绩 THEN LMS SHALL 展示练习和考试的成绩记录
3. WHEN 学员查看错题本 THEN LMS SHALL 展示练习和考试中答错的题目
4. WHEN 学员导出记录 THEN LMS SHALL 生成包含历史成绩的导出文件


### Requirement 19: 导师/室经理仪表盘

**User Story:** 作为导师/室经理，我希望能够在仪表盘看到所辖人员的学习情况概览，以便快速了解团队状态。

#### Acceptance Criteria

1. WHEN 导师访问仪表盘 THEN LMS SHALL 展示名下学员的完成率和平均分
2. WHEN 室经理访问仪表盘 THEN LMS SHALL 展示本室学员的完成率和平均分
3. WHEN 用户访问仪表盘 THEN LMS SHALL 展示待评分考试数量
4. WHEN 用户访问仪表盘 THEN LMS SHALL 提供新建任务、测试中心、抽查的快捷入口

### Requirement 20: 管理员任务管理

**User Story:** 作为管理员，我希望能够跨团队管理任务，以便进行全平台的任务治理。

#### Acceptance Criteria

1. WHEN 管理员查看任务列表 THEN LMS SHALL 展示全平台所有任务
2. WHEN 管理员创建任务 THEN LMS SHALL 允许选择任意学员（跨室）
3. WHEN 管理员强制结束任务 THEN LMS SHALL 将任务状态设为已结束

### Requirement 21: 团队经理数据看板

**User Story:** 作为团队经理，我希望能够查看跨团队的数据分析，以便了解整体学习情况。

#### Acceptance Criteria

1. WHEN 团队经理访问数据看板 THEN LMS SHALL 展示各室完成率与成绩对比
2. WHEN 团队经理查看知识热度 THEN LMS SHALL 展示知识文档的阅读统计
3. WHILE 团队经理查看数据 THEN LMS SHALL 仅提供只读访问，禁止任何修改操作

### Requirement 22: 权限控制

**User Story:** 作为系统，我需要根据用户角色和组织关系控制数据访问范围，以确保数据安全和业务隔离。

#### Acceptance Criteria

1. WHEN 导师查询学员数据 THEN LMS SHALL 仅返回其名下学员的数据
2. WHEN 室经理查询学员数据 THEN LMS SHALL 仅返回本室学员的数据
3. WHEN 管理员查询数据 THEN LMS SHALL 返回全平台数据
4. WHEN 用户访问 API 接口 THEN LMS SHALL 根据当前生效角色验证权限
5. IF 用户无权访问请求的资源 THEN LMS SHALL 返回 403 禁止访问错误
