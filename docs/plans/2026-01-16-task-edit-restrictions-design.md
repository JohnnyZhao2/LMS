# 任务编辑限制设计方案

**日期**: 2026-01-16
**状态**: 已实现
**作者**: Claude Code

## 1. 问题背景

当前系统存在严重的数据丢失问题：

- 管理员编辑任务的资源（知识文档/试卷）时，后端会删除所有 `TaskKnowledge` 和 `TaskQuiz` 记录并重新创建
- 由于数据库 CASCADE 删除，相关的 `KnowledgeLearningProgress` 和 `Submission` 记录也被删除
- 导致学员的学习进度完全丢失

## 2. 设计目标

保护学员学习进度，防止因任务编辑导致的数据丢失，同时保持必要的任务管理灵活性。

## 3. 核心规则

### 3.1 触发条件

当满足以下任一条件时，启用编辑限制：

- 至少一个学员完成了任何知识文档的学习（`KnowledgeLearningProgress.is_completed = True`）
- 至少一个学员提交了任何试卷（存在 `Submission` 记录）

### 3.2 编辑权限矩阵

| 字段 | 无进度时 | 有进度时 |
|------|---------|---------|
| 标题 (title) | ✅ 可编辑 | ✅ 可编辑 |
| 描述 (description) | ✅ 可编辑 | ✅ 可编辑 |
| 截止日期 (deadline) | ✅ 可编辑 | ✅ 可编辑 |
| 知识文档 (knowledge_ids) | ✅ 可编辑 | ❌ 禁止编辑 |
| 试卷 (quiz_ids) | ✅ 可编辑 | ❌ 禁止编辑 |
| 添加学员 | ✅ 可添加 | ✅ 可添加 |
| 移除学员 | ✅ 可移除 | ❌ 禁止移除 |

## 4. 后端实现

### 4.1 新增方法：检查学习进度

在 `TaskService` 中添加：

```python
def has_student_progress(self, task: Task) -> bool:
    """
    检查任务是否有学员学习进度

    Returns:
        True if any student has started working on the task
    """
    # 检查是否有知识学习进度
    has_knowledge_progress = KnowledgeLearningProgress.objects.filter(
        assignment__task=task,
        is_completed=True
    ).exists()

    # 检查是否有试卷提交
    from apps.submissions.models import Submission
    has_quiz_submissions = Submission.objects.filter(
        task_assignment__task=task
    ).exists()

    return has_knowledge_progress or has_quiz_submissions
```

### 4.2 修改更新方法：添加验证

在 `TaskService.update_task()` 中添加验证逻辑：

```python
@transaction.atomic
def update_task(
    self,
    task: Task,
    knowledge_ids: List[int] = None,
    quiz_ids: List[int] = None,
    assignee_ids: List[int] = None,
    **kwargs
) -> Task:
    # 检查是否有学习进度
    has_progress = self.has_student_progress(task)

    # 如果有进度，不允许修改资源
    if has_progress:
        if knowledge_ids is not None:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='任务已有学员开始学习，无法修改知识文档'
            )
        if quiz_ids is not None:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='任务已有学员开始学习，无法修改试卷'
            )

        # 如果有进度，只允许添加学员，不允许移除
        if assignee_ids is not None:
            existing_ids = set(
                task.assignments.values_list('assignee_id', flat=True)
            )
            new_ids = set(assignee_ids)
            removed_ids = existing_ids - new_ids
            if removed_ids:
                raise BusinessError(
                    code=ErrorCodes.INVALID_OPERATION,
                    message='任务已有学员开始学习，无法移除已分配的学员'
                )

    # 继续原有的更新逻辑
    task = self.task_repository.update(task, **kwargs)

    if knowledge_ids is not None:
        self._update_knowledge_associations(task, knowledge_ids)

    if quiz_ids is not None:
        self._update_quiz_associations(task, quiz_ids)

    if assignee_ids is not None:
        self._update_assignments(task, assignee_ids)

    return task
```

### 4.3 API 响应增强

在任务序列化器中添加 `has_progress` 字段：

```python
class TaskSerializer(serializers.ModelSerializer):
    has_progress = serializers.SerializerMethodField()

    def get_has_progress(self, obj):
        service = TaskService()
        return service.has_student_progress(obj)

    class Meta:
        model = Task
        fields = [..., 'has_progress']
```

## 5. 前端实现

### 5.1 类型定义更新

```typescript
// types/task.ts
export interface Task {
  id: number
  title: string
  description: string
  deadline: string
  knowledge_ids: number[]
  quiz_ids: number[]
  assignee_ids: number[]
  has_progress: boolean  // 新增
  // ... 其他字段
}
```

### 5.2 表单状态管理

```typescript
// task-form.tsx
const TaskForm = ({ task, mode }: TaskFormProps) => {
  const hasProgress = task?.has_progress || false
  const isEditMode = mode === 'edit'

  // 资源选择：有进度时禁用
  const resourcesDisabled = isEditMode && hasProgress

  // 学员移除：有进度时禁用
  const canRemoveAssignee = !(isEditMode && hasProgress)

  return (
    <form>
      {/* 基础字段：始终可编辑 */}
      <Input name="title" />
      <Textarea name="description" />
      <DatePicker name="deadline" />

      {/* 资源选择：有进度时禁用 */}
      {resourcesDisabled && (
        <Alert variant="warning">
          ⚠️ 任务已有学员开始学习，无法修改资源
        </Alert>
      )}
      <ResourceSelector
        disabled={resourcesDisabled}
      />

      {/* 学员列表：有进度时只能添加 */}
      {!canRemoveAssignee && (
        <Alert variant="warning">
          ⚠️ 任务已有学员开始学习，无法移除已分配的学员
        </Alert>
      )}
      <AssigneeList
        canRemove={canRemoveAssignee}
        canAdd={true}
      />
    </form>
  )
}
```

### 5.3 视觉设计

**禁用状态**：
- 资源选择区域：灰色背景 + 锁定图标
- 学员删除按钮：灰色禁用状态
- Tooltip 提示："无法移除已分配的学员"

**提示信息**：
- 黄色警告条，显示在禁用区域上方
- 清晰说明为什么被禁用

**可用操作**：
- 添加学员按钮：保持启用状态
- 基础字段：正常编辑状态

## 6. 错误处理

### 6.1 后端错误响应

```json
{
  "code": "INVALID_OPERATION",
  "message": "任务已有学员开始学习，无法修改知识文档"
}
```

### 6.2 前端错误处理

```typescript
try {
  await updateTask(taskId, data)
} catch (error) {
  if (error.code === 'INVALID_OPERATION') {
    toast.error(error.message)
    // 刷新任务数据，更新 has_progress 状态
    refetchTask()
  }
}
```

## 7. 测试场景

### 7.1 后端测试

1. **无进度时**：
   - ✅ 可以修改所有字段
   - ✅ 可以添加/移除学员
   - ✅ 可以修改资源

2. **有知识学习进度时**：
   - ✅ 可以修改基础字段
   - ✅ 可以添加学员
   - ❌ 不能修改资源（应返回错误）
   - ❌ 不能移除学员（应返回错误）

3. **有试卷提交时**：
   - ✅ 可以修改基础字段
   - ✅ 可以添加学员
   - ❌ 不能修改资源（应返回错误）
   - ❌ 不能移除学员（应返回错误）

### 7.2 前端测试

1. **表单加载**：
   - 根据 `has_progress` 正确显示禁用状态
   - 显示相应的警告提示

2. **交互测试**：
   - 禁用的字段无法编辑
   - 删除按钮正确禁用
   - Tooltip 正确显示

3. **提交测试**：
   - 提交时不发送禁用字段的数据
   - 错误处理正确显示

## 8. 实现步骤

1. **后端实现**：
   - 添加 `has_student_progress()` 方法
   - 修改 `update_task()` 添加验证
   - 更新序列化器添加 `has_progress` 字段
   - 编写单元测试

2. **前端实现**：
   - 更新类型定义
   - 修改任务表单组件
   - 添加禁用状态样式
   - 添加警告提示组件
   - 更新错误处理

3. **集成测试**：
   - 测试完整的编辑流程
   - 验证数据不会丢失
   - 验证错误提示正确显示

## 9. 未来优化

1. **更细粒度的控制**：
   - 允许添加新资源（不删除现有资源）
   - 允许调整资源顺序

2. **进度迁移**：
   - 如果必须修改资源，提供进度迁移工具
   - 管理员可以手动映射新旧资源的对应关系

3. **审计日志**：
   - 记录所有编辑操作
   - 特别标记被限制的操作尝试
