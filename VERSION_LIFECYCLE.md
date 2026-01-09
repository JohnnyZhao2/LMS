# LMS 版本管理生命周期文档

## 核心原则

**一句话总结：管理员修改内容后，已分配给学员的任务内容不变。**

**版本管理简化：不再使用 status/published_at 字段，只使用 resource_uuid + version_number + is_current 管理版本。**

---

## 项目现行规则（基于实现）

### 统一版本模型
- **适用资源**：Knowledge / Question / Quiz
- **版本字段**：`resource_uuid + version_number + is_current`
- **唯一性要求**：同一 `resource_uuid` 只能有一个 `is_current=true`
- **版本来源**：新版本会记录 `source_version`

### 创建规则
- 新建资源生成新 `resource_uuid`，`version_number=1`，`is_current=true`
- 创建接口不接受 `resource_uuid`，如需新版本只能走更新逻辑

### 更新规则
- 更新当前版本 → 新建版本（旧版本保持不变）
- 更新历史版本 → 仅限修正，不会成为 current

### 可见性规则
- 非管理员只可访问 `is_current=true` 的版本

### 任务锁定规则
- `TaskKnowledge` / `TaskQuiz` 在任务创建时锁定版本：
  - `resource_uuid + version_number`
- 任务运行期间不随资源更新而变化

### 答题锁定规则
- `Submission` 记录试卷版本
- `Answer` 记录题目版本
- 评分/复盘必须按版本字段回溯内容

### 试卷与题目关系（当前行为）
- `QuizQuestion` 仅关联 `question_id`
- 题目更新会自动生成包含该题目的试卷新版本
- 新试卷版本会使用最新题目版本替换原题目

### 可选改动（如需新行为）
- **试卷题目自动跟随最新版本**：创建新试卷版本时，按 `question.resource_uuid` 抽最新版本并替换 `question_id`
- **任务关联更强一致**：强制 `TaskKnowledge/TaskQuiz` 必须携带版本字段，禁止为空

---

## 一、知识文档 (Knowledge)

### 生命周期

```
创建 → [被任务引用] → [管理员修改] → 新版本
              ↓
        学员看到的是任务创建时的版本
```

### 版本字段
| 字段 | 说明 |
|------|------|
| `resource_uuid` | 资源唯一标识（所有版本共享） |
| `version_number` | 版本号（1, 2, 3...） |
| `is_current` | 是否为当前最新版本 |

### 场景示例

1. **管理员创建知识文档 A**
   - 生成 `resource_uuid = abc123`
   - `version_number = 1`, `is_current = true`

2. **管理员创建任务，关联知识 A**
   - `TaskKnowledge` 记录：`resource_uuid = abc123`, `version_number = 1`
   - ✅ 版本被锁定

3. **管理员修改知识 A**
   - 原版本：`version_number = 1`, `is_current = false`
   - 新版本：`version_number = 2`, `is_current = true`

4. **学员查看任务中的知识**
   - 通过 `TaskKnowledge.get_versioned_knowledge()` 获取
   - 返回 `version_number = 1` 的内容（任务创建时的版本）
   - ✅ 不受管理员修改影响

### 数据流向
```
管理员视角：Knowledge 列表 → 显示 is_current=true 的最新版本
学员视角：  Task → TaskKnowledge → Knowledge(锁定版本)
```

---

## 二、题目 (Question)

### 生命周期

```
创建 → [被试卷引用] → [管理员修改] → 新版本
              ↓
        试卷模板指向最新版本
        但学员答题记录保留当时版本
```

### 版本字段
| 字段 | 说明 |
|------|------|
| `resource_uuid` | 资源唯一标识 |
| `version_number` | 版本号 |
| `is_current` | 是否为当前最新版本 |

### 场景示例

1. **管理员创建题目 Q1**
   - `resource_uuid = q001`, `version_number = 1`

2. **管理员创建试卷，添加题目 Q1**
   - `QuizQuestion` 记录：`question_id = 1`（指向题目记录）

3. **管理员修改题目 Q1**
   - 新版本：`id = 10`, `version_number = 2`, `is_current = true`
   - 旧版本：`is_current = false`

4. **学员开始答题**
   - 创建 `Answer` 记录：`question_id = 10`
   - 同时记录 `question_resource_uuid` 和 `question_version_number`

---

## 三、试卷 (Quiz)

### 生命周期

```
创建 → 添加题目 → [被任务引用] → [管理员修改] → 新版本
                        ↓
                  任务锁定试卷版本
```

### 版本字段
| 字段 | 说明 |
|------|------|
| `resource_uuid` | 资源唯一标识 |
| `version_number` | 版本号 |
| `is_current` | 是否为当前最新版本 |

### 场景示例

1. **管理员创建试卷 P1，包含题目 Q1, Q2**
   - `Quiz`: `resource_uuid = p001`, `version_number = 1`
   - `QuizQuestion`: `[{quiz_id=1, question_id=1}, {quiz_id=1, question_id=2}]`

2. **管理员创建任务，关联试卷 P1**
   - `TaskQuiz` 记录：`resource_uuid = p001`, `version_number = 1`
   - ✅ 试卷版本被锁定

3. **管理员修改试卷 P1（添加题目 Q3）**
   - 新版本：`version_number = 2`, `is_current = true`
   - 新的 `QuizQuestion` 关联

4. **学员查看任务中的试卷**
   - 通过 `TaskQuiz.get_versioned_quiz()` 获取
   - 返回 `version_number = 1` 的试卷
   - ✅ 试卷版本正确

---

## 四、任务 (Task)

### 生命周期

```
创建 → 关联知识/试卷 → 分配学员 → 学员学习/答题 → 完成/逾期
                ↓
          锁定知识版本（TaskKnowledge）
          锁定试卷版本（TaskQuiz）
```

### 任务本身不需要版本管理

任务是"容器"，它通过关联表锁定内容版本：
- `TaskKnowledge`: 锁定知识版本
- `TaskQuiz`: 锁定试卷版本

### 任务的元数据可以直接修改

任务的以下字段**可以随时修改**，不影响内容版本：

| 字段 | 可否修改 | 说明 |
|------|---------|------|
| `title` | ✅ 可以 | 任务名称改了，学员看到新名称 |
| `description` | ✅ 可以 | 任务描述改了，学员看到新描述 |
| `deadline` | ✅ 可以 | 截止时间延长/缩短，所有学员生效 |
| `is_closed` | ✅ 可以 | 管理员强制结束任务 |
| 分配人员 | ✅ 可以 | 通过 `TaskAssignment` 增删学员 |

---

## 五、学员答题记录 (Submission & Answer)

### 生命周期

```
学员开始答题 → 创建 Submission → 创建 Answer(每道题) → 提交 → 评分
```

### 当前设计
```
Submission:
  - quiz_id (FK)
  - quiz_resource_uuid     -- 试卷资源ID
  - quiz_version_number    -- 试卷版本号
  
Answer:
  - question_id (FK)
  - question_resource_uuid     -- 题目资源ID
  - question_version_number    -- 题目版本号
  - user_answer
  - is_correct
```

---

## 六、完整数据流图

### 管理员视角

```
┌─────────────────────────────────────────────────────────────┐
│                      管理员后台                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  知识列表          题目列表          试卷列表                 │
│  (is_current=1)   (is_current=1)   (is_current=1)          │
│       │                │                │                   │
│       ▼                ▼                ▼                   │
│  ┌─────────┐      ┌─────────┐      ┌─────────┐             │
│  │Knowledge│      │Question │      │  Quiz   │             │
│  │ v1 ✗   │      │ v1 ✗   │      │ v1 ✗   │             │
│  │ v2 ✗   │      │ v2 ✗   │      │ v2 ✓   │             │
│  │ v3 ✓   │      │ v3 ✓   │      └─────────┘             │
│  └─────────┘      └─────────┘           │                   │
│                        │                 │                   │
│                        ▼                 ▼                   │
│                   QuizQuestion ◄─────────┘                  │
│                   (指向最新题目)                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 学员视角

```
┌─────────────────────────────────────────────────────────────┐
│                       学员端                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  我的任务                                                    │
│      │                                                      │
│      ▼                                                      │
│  ┌──────────────────────────────────────────┐              │
│  │ Task                                      │              │
│  │   │                                       │              │
│  │   ├── TaskKnowledge ──► Knowledge(v1)    │  ← 锁定版本  │
│  │   │   (uuid=abc, v=1)                    │              │
│  │   │                                       │              │
│  │   └── TaskQuiz ──────► Quiz(v1)          │  ← 锁定版本  │
│  │       (uuid=xyz, v=1)      │              │              │
│  │                            ▼              │              │
│  │                       QuizQuestion        │              │
│  │                            │              │              │
│  │                            ▼              │              │
│  │                       Question(v?)        │              │
│  └──────────────────────────────────────────┘              │
│                                                             │
│  答题记录                                                    │
│      │                                                      │
│      ▼                                                      │
│  ┌──────────────────────────────────────────┐              │
│  │ Submission                                │              │
│  │   quiz_id ──────────► Quiz               │              │
│  │   quiz_resource_uuid                      │              │
│  │   quiz_version_number                     │              │
│  │                                           │              │
│  │   └── Answer                              │              │
│  │       question_id ──► Question            │              │
│  │       question_resource_uuid              │              │
│  │       question_version_number             │              │
│  └──────────────────────────────────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 七、验证场景

### 场景1：管理员修改知识，学员看到旧版本 ✅

```
1. 创建知识 K1 (v1)
2. 创建任务 T1，关联 K1
3. 分配给学员 S1
4. 管理员修改 K1 → K1 (v2)
5. 学员 S1 查看任务 → 看到 K1 (v1) ✅
```

### 场景2：管理员修改题目，学员答题记录可追溯 ✅

```
1. 创建题目 Q1 (v1): "1+1=?"
2. 创建试卷 P1，包含 Q1
3. 创建任务 T1，关联 P1
4. 学员 S1 开始答题
   - 创建 Answer: question_id=Q1, resource_uuid=xxx, version=1
5. 管理员修改 Q1 → Q1 (v2): "2+2=?"
6. 查看学员 S1 的答题记录
   - 通过 resource_uuid + version_number 可以找到当时的题目内容 ✅
```

### 场景3：管理员修改试卷，已分配任务不受影响 ✅

```
1. 创建试卷 P1 (v1)，包含 Q1, Q2
2. 创建任务 T1，关联 P1 (锁定 v1)
3. 管理员修改 P1 → P1 (v2)，添加 Q3
4. 学员查看任务 T1 → 看到 P1 (v1)，只有 Q1, Q2 ✅
5. 管理员创建新任务 T2，关联 P1 → 锁定 v2，有 Q1, Q2, Q3
```
