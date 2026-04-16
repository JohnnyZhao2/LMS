# 资源快照化重构方案

## 1. 背景

当前项目里，知识、题目、试卷都属于可复用资产。任务会绑定这些资产发给学员执行。

业务上同时存在两个要求：

- 资源中心里，用户编辑资源后应立即生效
- 已发出去的任务在执行过程中，不能因为资源后续被编辑而发生变化

这两个要求本身并不冲突，但当前实现把“当前可编辑内容”和“执行期冻结内容”混在了一起，导致版本管理和引用边界越来越复杂。

---

## 2. 当前存在的问题

### 2.1 版本职责放错位置

当前 `Knowledge / Question / Quiz` 既承担“当前工作副本”，又承担“历史冻结版本”。

相关位置：

- [lms_backend/core/mixins.py](/Users/johnnyzhao/Documents/LMS/lms_backend/core/mixins.py:44)
- [lms_backend/core/versioning.py](/Users/johnnyzhao/Documents/LMS/lms_backend/core/versioning.py:12)

问题：

- `resource_uuid + version_number + is_current` 这套字段在表达“资源版本”
- 但真正业务上需要区分的是：
  - 当前可编辑内容
  - 执行期冻结快照
- 现在这两种语义被塞进同一张表，后续所有逻辑都会扭曲

### 2.2 是否新建版本取决于引用图，而不是业务状态

当前逻辑里，保存资源时到底“原地改”还是“新建版本”，取决于资源此刻有没有被任务/试卷引用。

相关位置：

- [lms_backend/apps/knowledge/services.py](/Users/johnnyzhao/Documents/LMS/lms_backend/apps/knowledge/services.py:96)
- [lms_backend/apps/questions/services.py](/Users/johnnyzhao/Documents/LMS/lms_backend/apps/questions/services.py:105)
- [lms_backend/apps/quizzes/services.py](/Users/johnnyzhao/Documents/LMS/lms_backend/apps/quizzes/services.py:169)

问题：

- 同样一个“编辑资源”的动作，行为会因为上下游关系变化而变化
- 规则分散在多个 service 里
- 题目最复杂，甚至要看是否被多个试卷共享、是否被任务使用
- 长期维护时无法稳定推理

### 2.3 题目模型混入了两套语义

当前题目既被当作“题库资产”，又被当作“试卷内可派生版本”。

相关位置：

- [lms_backend/apps/questions/services.py](/Users/johnnyzhao/Documents/LMS/lms_backend/apps/questions/services.py:67)
- [lms_backend/apps/questions/services.py](/Users/johnnyzhao/Documents/LMS/lms_backend/apps/questions/services.py:514)
- [lms_backend/apps/tasks/tests/test_resource_versioning_policy.py](/Users/johnnyzhao/Documents/LMS/lms_backend/apps/tasks/tests/test_resource_versioning_policy.py:266)

问题：

- `sync_to_bank`
- `source_question_id`
- `_has_frozen_version_boundary()`

这些逻辑都在说明：当前设计正在用题目版本机制，硬兼容“题库题”和“试卷内题”两种对象。

这会带来：

- 题目编辑规则极难解释
- 试卷和题库边界不清晰
- 后续快照化时最容易留半套旧逻辑

### 2.4 任务侧已经有“冻结意图”，但冻结边界还不彻底

现在任务和学员执行，其实已经部分依赖具体资源记录：

- [lms_backend/apps/tasks/models.py](/Users/johnnyzhao/Documents/LMS/lms_backend/apps/tasks/models.py:226)
- [lms_backend/apps/tasks/models.py](/Users/johnnyzhao/Documents/LMS/lms_backend/apps/tasks/models.py:255)
- [lms_backend/apps/submissions/services.py](/Users/johnnyzhao/Documents/LMS/lms_backend/apps/submissions/services.py:223)

这说明系统已经意识到“执行态应该冻结”。

但问题是：

- 绑定的是“当前资源表里的某一条记录”
- 不是专门的执行快照
- 所以资源表仍然承担了编辑态和执行态两种职责

### 2.5 前端仍然把任务资源理解成“活引用”

相关位置：

- [lms_frontend/src/features/tasks/components/task-form/use-task-form.ts](/Users/johnnyzhao/Documents/LMS/lms_frontend/src/features/tasks/components/task-form/use-task-form.ts:203)
- [lms_backend/apps/tasks/serializers.py](/Users/johnnyzhao/Documents/LMS/lms_backend/apps/tasks/serializers.py:66)

问题：

- 任务详情仍暴露 `is_current`
- 编辑器还有“升级到最新版本”的概念
- 语义上更像“任务引用资产当前头部”
- 不是“任务锁定一份执行快照”

### 2.6 删除语义不完整

当前资源删除主要按“是否被引用”做保护：

- [lms_backend/apps/knowledge/services.py](/Users/johnnyzhao/Documents/LMS/lms_backend/apps/knowledge/services.py:154)
- [lms_backend/apps/quizzes/services.py](/Users/johnnyzhao/Documents/LMS/lms_backend/apps/quizzes/services.py:220)

问题：

- 现在保护的是当前资源表本身
- 未来真正应该保护的是“执行中仍被引用的快照”
- 否则要么删不掉，要么删错对象

---

## 3. 重构目标

### 3.1 必须满足的业务目标

- 资源中心里，编辑知识/题目/试卷后直接生效
- 保存资源时默认原地更新当前内容
- 未被任务使用的内容，不制造无意义历史版本
- 已发出去的任务必须看到稳定不变的内容
- 学员执行链路绝不能依赖当前资源表
- 删除资源时，允许真正删除无用数据，避免库持续膨胀

### 3.2 明确不做的事

- 不做向后兼容
- 不保留当前 `VersionedResourceMixin` 这套语义
- 不继续沿用“按引用关系决定原地更新/分叉版本”的策略

---

## 4. 新的核心原则

系统以后只遵守这 4 条规则：

1. `资源保存 != 版本生成`
2. 当前资源永远只表示“当前可编辑内容”
3. 只有资源进入任务执行链路时，才生成冻结快照
4. 学员执行、评分、统计永远只读快照

这 4 条一旦落地，版本规则就稳定了，不再依赖引用图推断。

---

## 5. 目标数据模型

## 5.1 当前资源表

保留以下表，作为当前工作副本：

- `Knowledge`
- `Question`
- `QuestionOption`
- `Quiz`
- `QuizQuestion`
- `QuizQuestionOption`

这些表的职责只有一个：

- 支撑资源中心编辑
- 保存时直接原地更新

其中题目这一层要特殊说明：

- `Question` 是题库里的源题
- `QuizQuestion` 是当前试卷里的可编辑题目副本
- `QuizQuestion` 应新增 `source_question_id`，用于记录它来源于哪一道题库题，可空

这些表里应删除版本职责：

- 删除 `resource_uuid`
- 删除 `version_number`
- 删除 `is_current`
- 不再继承 `VersionedResourceMixin`

## 5.2 新增快照表

### KnowledgeRevision

- `id`
- `knowledge_id`，可空，`SET_NULL`
- `revision_number`
- `title`
- `content`
- `related_links`
- `space_tag_name`
- `tags_json`
- `content_hash`
- `created_at`

说明：

- 存拍平后的内容
- 不依赖知识当前表的可变字段

### QuizRevision

- `id`
- `quiz_id`，可空，`SET_NULL`
- `revision_number`
- `title`
- `quiz_type`
- `duration`
- `pass_score`
- `structure_hash`
- `created_at`

### QuizRevisionQuestion

- `id`
- `quiz_revision_id`
- `source_question_id`，可空，仅用于追踪来源题库题
- `content`
- `question_type`
- `reference_answer`
- `explanation`
- `order`
- `score`
- `content_hash`

### QuizRevisionQuestionOption

- `id`
- `quiz_revision_question_id`
- `sort_order`
- `content`
- `is_correct`

说明：

- 试卷快照内部直接保存冻结题目内容
- 执行态不再依赖当前题库题

## 5.3 执行态表调整

### TaskKnowledge

当前：

- `knowledge_id`

调整为：

- `source_knowledge_id`，指向当前知识，可空，仅管理侧展示用途
- `knowledge_revision_id`，执行态真实依赖，`PROTECT`
- `order`

### TaskQuiz

当前：

- `quiz_id`

调整为：

- `source_quiz_id`，可空
- `quiz_revision_id`，执行态真实依赖，`PROTECT`
- `order`

### Submission

当前：

- `quiz_id`

调整为：

- `task_quiz_id`
- `quiz_revision_id`

### Answer

当前：

- `question_id`

调整为：

- `quiz_revision_question_id`

### AnswerSelection

当前：

- `question_option_id`

调整为：

- `quiz_revision_question_option_id`

---

## 6. 关键业务规则

## 6.1 资源编辑规则

知识、题目、试卷统一如下：

- 用户保存资源
- 直接更新当前表
- 不创建 revision
- 更新前先做内容比对
- 内容未变则不写库

这一步和“按钮保存”还是“别的保存触发”无关。  
本质上只是一次普通保存。

## 6.2 快照生成规则

只有资源进入任务执行链路时才生成快照。

触发时机：

- 新建任务并绑定资源
- 编辑任务资源并替换资源
- 后续如果保留“升级到最新资源”，本质也是重新绑定快照

### ensure_knowledge_revision(knowledge_id)

- 读取当前 `Knowledge`
- 计算 `content_hash`
- 查该知识最新 revision
- hash 相同则复用
- hash 不同则创建新 revision

### ensure_quiz_revision(quiz_id)

- 读取当前 `Quiz`
- 读取当前 `QuizQuestion`
- 读取当前 `QuizQuestionOption`
- 以“试卷字段 + 每道试卷题的完整内容 + order + score”生成结构 hash
- 相同复用，不同新建

## 6.3 任务执行规则

任务绑定后：

- 学习知识只读 `knowledge_revision`
- 开始答题只读 `quiz_revision`
- 创建答案只展开 `quiz_revision_question`
- 自动评分只用 `quiz_revision_question`
- 人工评分也只用 `quiz_revision_question`

学员链路任何一步都不能再查当前资源表。

## 6.4 删除规则

删除语义改成下面这套：

- 删除资源时，允许硬删当前资源表记录
- 删除时同步清理所有“未被任务/提交引用”的 revision
- 已被任务/提交引用的 revision 保留
- revision 和 source 之间使用 `SET_NULL`
- 用户视角里资源已经删掉
- 执行中的历史任务仍能跑

所以不是“统一归档”，而是：

- 当前资源能硬删就硬删
- 真正受保护的是执行快照

## 6.5 试卷与题目的嵌套关系规则

这是本次重构里最容易做歪的一层，必须单独说明。

### 6.5.1 业务理解

知识和任务的关系是：

- `Task -> KnowledgeRevision`

试卷和题目的关系不是简单一对一，而是两层关系：

- 编辑态：`Quiz -> QuizQuestion`
- 执行态：`Task -> QuizRevision -> QuizRevisionQuestion`

也就是说：

- 知识是“直接被任务使用的资产”
- 题库题不是直接被任务使用，而是作为试卷编题素材
- 任务真正使用的是“冻结后的试卷题快照”

### 6.5.2 当前试卷的正确语义

当前 `Quiz` 不应该被理解成“已经冻结好的试卷内容”，而应该被理解成：

- 试卷元数据
- 当前选了哪些题
- 每道题的顺序
- 每道题的本卷分值
- 每道题在当前试卷中的实际内容

也就是一个“编排中的当前试卷工作副本”。

因此在编辑态：

- `QuizQuestion` 是试卷自有题目副本，不是简单的题库题引用
- 从题库添加题目到试卷时，应该在添加瞬间把题目内容复制进 `QuizQuestion / QuizQuestionOption`
- 保存试卷后，试卷里的题目副本仍然保留在试卷内
- 但新建于试卷中的题，保存试卷时必须同步生成对应的题库题
- 后续在试卷里改题，默认先改 `QuizQuestion`
- 如果这道题来源于题库，且在试卷里被改过，保存时默认在题库中生成一条新题，并把本卷 `source_question_id` 切到新题

注意：

- 这里影响的是“未来将被使用的当前试卷”
- 不是已经发出的任务

### 6.5.3 为什么不能直接让任务读当前试卷和当前题目

如果任务直接读当前 `Quiz`：

- 改试卷里的题会直接改到学员正在做的题
- 学员执行中会发生内容漂移

所以执行链路必须彻底切成：

- `TaskQuiz -> QuizRevision`
- `QuizRevisionQuestion`

### 6.5.4 冻结时机

题库题快照不是在“编辑题目”时创建。  
试卷快照也不是在“编辑试卷”时创建。

统一规则：

- 题库题只负责提供素材
- 试卷题和试卷快照只在“任务绑定试卷”时冻结

具体过程：

1. 用户在题库编辑当前题目，直接原地更新 `Question`
2. 用户从题库加题到试卷时，系统把题目内容复制到 `QuizQuestion / QuizQuestionOption`
3. 用户在试卷里新建题目时，先只存在于 `QuizQuestion / QuizQuestionOption`
4. 用户在试卷里编辑题目，直接原地更新 `QuizQuestion / QuizQuestionOption`
5. 用户保存试卷时：
   - 新建于试卷中的题，创建对应 `Question / QuestionOption`，并回填 `source_question_id`
   - 来源于题库且已修改的题，自动创建新的 `Question / QuestionOption`，并把本卷 `source_question_id` 更新到新题
   - 来源于题库但未修改的题，继续复用原 `source_question_id`
   - 无论是否同步题库，当前 `QuizQuestion` 都保留为试卷当前保存态
6. 当任务绑定试卷时，系统执行 `ensure_quiz_revision(quiz_id)`
7. 最终生成：
   - `QuizRevision`
   - `QuizRevisionQuestion`
   - `QuizRevisionQuestionOption`
8. 任务绑定的是 `QuizRevision`

### 6.5.5 这样设计后的结果

#### 情况 A：试卷里的题改了，但老任务已经发出

- 老任务绑定的是老 `QuizRevision`
- 老 `QuizRevision` 里的每一道题都是冻结的 `QuizRevisionQuestion`
- 老任务完全不受影响

#### 情况 B：题库题改了，但原先加入过该题的试卷没有再编辑

- 不影响现有试卷里的题目副本
- 不影响老任务
- 如果要让试卷采用题库新版题目，必须显式执行“从题库重新替换/重新加入”

#### 情况 C：试卷只改顺序或分值，题目内容没改

- 只生成新的 `QuizRevision`

#### 情况 D：试卷新增/删除题目

- 当前试卷直接增删 `QuizQuestion`
- 任务绑定时再生成新的 `QuizRevision`

#### 情况 E：从题库加入试卷后，在试卷里继续修改

- 允许修改
- 修改的是试卷自己的题目副本
- 保存试卷时，自动在题库中生成一条新题
- 本卷 `source_question_id` 自动切到这条新题
- 原题库题保持不变
- 不需要在默认保存流程里引入“覆盖原题”的额外分支

### 6.5.6 去重规则

#### QuizRevision 去重

试卷快照 hash 组成建议包括：

- 试卷标题
- 试卷类型
- 时长
- 及格线
- 每道试卷题的题干
- 每道试卷题的题型
- 每道试卷题的选项
- 每道试卷题的答案
- 每道试卷题的解析
- 每道试卷题的顺序
- 每道试卷题的分值

相同则复用旧 `QuizRevision`。

### 6.5.7 删除规则

题目删除要区分两层：

- 题库题删除时，不需要关心当前试卷
- 因为试卷里保存的是自己的题目副本
- 删除题库题后，现有试卷和历史任务不受影响
- 已冻结的 `QuizRevisionQuestion` 继续保留

试卷删除也同理：

- 当前试卷可删
- 已被任务引用的 `QuizRevision` 保留

### 6.5.8 前端展示语义

前端必须区分“当前试卷”和“任务锁定试卷”：

- 资源中心试卷详情：展示当前试卷及其自有题目副本
- 任务详情：展示锁定试卷 revision
- 学员做题页：只展示锁定试卷 revision

不要再用 `is_current` 去表达任务里的资源状态。  
任务里应该明确展示：

- 锁定试卷 `vN`
- 锁定试卷题快照

---

## 7. 各模块改造方案

## 7.1 知识模块

当前问题文件：

- [lms_backend/apps/knowledge/services.py](/Users/johnnyzhao/Documents/LMS/lms_backend/apps/knowledge/services.py:96)
- [lms_backend/apps/knowledge/views/knowledge.py](/Users/johnnyzhao/Documents/LMS/lms_backend/apps/knowledge/views/knowledge.py:81)

改造要求：

- `KnowledgeService.update()` 去掉版本分叉逻辑
- 永远原地更新当前 `Knowledge`
- 删掉 `_create_new_version()`
- 删掉 `_is_referenced_by_task()` 对版本策略的影响
- 新增 `KnowledgeRevisionService`
- 学员任务知识详情从 `task_knowledge.knowledge_revision` 读取

## 7.2 题目模块

当前问题文件：

- [lms_backend/apps/questions/services.py](/Users/johnnyzhao/Documents/LMS/lms_backend/apps/questions/services.py:67)
- [lms_backend/apps/questions/services.py](/Users/johnnyzhao/Documents/LMS/lms_backend/apps/questions/services.py:514)

改造要求：

- `QuestionService.update()` 永远原地更新当前题目
- 删除 `sync_to_bank`
- 删除 `source_question_id`
- 删除 `_should_fork_question_version()`
- 删除 `_has_frozen_version_boundary()`
- 题目只保留“题库素材资产”这一层语义
- 题库题不再直接承担执行快照职责

## 7.3 试卷模块

当前问题文件：

- [lms_backend/apps/quizzes/services.py](/Users/johnnyzhao/Documents/LMS/lms_backend/apps/quizzes/services.py:169)

改造要求：

- `QuizService.update()` 永远原地更新当前试卷
- `QuizQuestion` 改成试卷自有题目副本，不再是纯中间表
- 新增 `QuizQuestionOption`
- `QuizQuestion` 增加 `source_question_id`
- 从题库加题时，复制题目内容进入 `QuizQuestion`
- 保存试卷时：
  - 新建试卷题要自动落到题库
  - 修改过的来源题库题要自动生成新题，并替换本卷 `source_question_id`
- 不在保存试卷时生成快照
- 快照由 `ensure_quiz_revision()` 统一创建

## 7.4 任务模块

当前问题文件：

- [lms_backend/apps/tasks/task_service.py](/Users/johnnyzhao/Documents/LMS/lms_backend/apps/tasks/task_service.py:133)
- [lms_backend/apps/tasks/task_service.py](/Users/johnnyzhao/Documents/LMS/lms_backend/apps/tasks/task_service.py:203)

改造要求：

- 任务创建/更新时，前端仍传当前资源 id
- service 内部不再直接绑定 `knowledge_id / quiz_id`
- 改为先调用 `ensure_*_revision()`
- 再把 revision 绑定到 `TaskKnowledge / TaskQuiz`
- 任务详情接口返回：
  - 当前资源标题
  - 锁定 revision 编号
  - 不再强调 `is_current`

## 7.5 提交与答题模块

当前问题文件：

- [lms_backend/apps/submissions/services.py](/Users/johnnyzhao/Documents/LMS/lms_backend/apps/submissions/services.py:223)
- [lms_backend/apps/submissions/models.py](/Users/johnnyzhao/Documents/LMS/lms_backend/apps/submissions/models.py:17)

改造要求：

- `validate_assignment_for_quiz()` 不再按当前 `quiz_id` 校验
- 改为按 `task_quiz_id` 找 `quiz_revision`
- `start_quiz()` 按 `quiz_revision_question` 创建答案
- `Answer.auto_grade()` 使用 `QuizRevisionQuestion`
- `Answer.user_answer` 读取 `QuizRevisionQuestionOption`

---

## 8. 接口与前端改造

## 8.1 资源中心接口

保留当前资源编辑体验。

调整：

- 不再强调 `version_number`
- 不再强调 `is_current`
- 返回的就是当前工作副本

## 8.2 任务接口

创建/编辑任务：

- 入参仍然保持：
  - `knowledge_ids`
  - `quiz_ids`

服务内部转换为：

- `knowledge_revision_id`
- `quiz_revision_id`

任务详情：

- 返回锁定 revision 编号
- 返回锁定标题
- 不再让前端把任务资源理解成“当前版本引用”

## 8.3 学员接口

知识详情：

- 继续用 `task_knowledge_id`
- 但从 `knowledge_revision` 取内容

开始答题：

- 改为传 `task_quiz_id`
- 不再传当前 `quiz_id`

这样学员链路彻底脱离当前资源表。

---

## 9. 数据迁移方案

## 9.1 第一阶段：建新表

- 新增所有 revision 表
- 新增执行态新外键，允许为空

## 9.2 第二阶段：回填初始快照

- 为现有每条 `Knowledge` 创建首个 `KnowledgeRevision`
- 将现有 `QuizQuestion -> Question` 关系拍平成新的 `QuizQuestion / QuizQuestionOption`
- 回填 `QuizQuestion.source_question_id`
- 为现有每条 `Quiz` 创建首个 `QuizRevision`

## 9.3 第三阶段：回填任务绑定

- 将现有 `TaskKnowledge.knowledge_id` 映射到对应 `KnowledgeRevision`
- 将现有 `TaskQuiz.quiz_id` 映射到对应 `QuizRevision`

## 9.4 第四阶段：回填提交与答案

- 回填 `Submission.task_quiz_id`
- 回填 `Submission.quiz_revision_id`
- 回填 `Answer.quiz_revision_question_id`
- 回填 `AnswerSelection.quiz_revision_question_option_id`

## 9.5 第五阶段：切读路径

按顺序切：

- 学员知识详情
- 学员开始答题
- 保存答案
- 自动评分
- 人工评分
- 任务统计

## 9.6 第六阶段：切写路径

- 资源 service 改成纯原地更新
- 任务绑定时生成快照

## 9.7 第七阶段：删旧逻辑

- 删除 `VersionedResourceMixin`
- 删除 `resource_uuid`
- 删除 `version_number`
- 删除 `is_current`
- 删除 `sync_to_bank`
- 删除所有“按引用图决定是否分叉”的逻辑

---

## 10. 测试重写要求

现有版本策略测试大部分都要重写，因为它们验证的是旧规则。

相关旧测试：

- [lms_backend/apps/tasks/tests/test_resource_versioning_policy.py](/Users/johnnyzhao/Documents/LMS/lms_backend/apps/tasks/tests/test_resource_versioning_policy.py:1)

新的测试重点应改成：

- 保存当前资源时永远原地更新
- 内容不变时不重复写库
- 绑定任务时生成首个 revision
- 相同内容再次绑定时复用旧 revision
- 资源变更后再次绑定时生成新 revision
- 老任务继续读旧 revision
- 学员答题只依赖 revision
- 删除资源时：
  - 无引用快照被清理
  - 有引用快照保留

---

## 11. 实施顺序

必须按下面顺序做，禁止跳步混改：

1. 建 revision 表和执行态新字段
2. 写 revision service
3. 回填历史快照
4. 切任务绑定逻辑
5. 切学员执行链路
6. 切评分与统计
7. 切资源保存逻辑为纯原地更新
8. 前端改任务详情和答题入口
9. 删旧版本逻辑和旧测试

---

## 12. 完成标准

重构完成后，系统必须满足以下事实：

- 资源中心里保存知识、题目、试卷，只改当前表
- 当前资源编辑不会直接产生历史版本
- 新建或修改任务时，系统只在绑定动作发生时创建快照
- 快照内容不变时必须复用，不能重复造版本
- 已发出的任务内容稳定不变
- 学员执行链路完全不读取当前资源表
- 删除资源时，用户能真正删除当前资源
- 无用快照能被清理，数据库不会因为历史垃圾持续膨胀

---

## 13. 一句话结论

这次重构的本质不是“继续修版本号”，而是把系统拆成两层：

- `当前资源层`：原地编辑、立即生效
- `执行快照层`：按需生成、不可变、只供任务执行使用

只有这样，才能同时满足：

- 编辑即生效
- 未引用内容不制造无效历史
- 已发任务绝不受后续编辑影响
- 数据量可控
