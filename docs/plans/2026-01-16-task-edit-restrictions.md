# Task Edit Restrictions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent data loss by restricting task editing when students have learning progress

**Architecture:** Add progress detection in TaskService, enforce restrictions in update_task(), expose has_progress flag to frontend, disable UI elements based on progress state

**Tech Stack:** Django (backend), React + TypeScript (frontend), pytest (testing)

---

## Task 1: Add Progress Detection Method

**Files:**
- Modify: `lms_backend/apps/tasks/services.py:35-586`
- Test: `lms_backend/apps/tasks/tests/test_services.py`

**Step 1: Write the failing test**

Create test file if it doesn't exist, or add to existing test file:

```python
def test_has_student_progress_no_progress(self):
    """Test has_student_progress returns False when no progress exists"""
    task = TaskFactory()
    TaskAssignmentFactory(task=task)

    service = TaskService()
    result = service.has_student_progress(task)

    assert result is False

def test_has_student_progress_with_knowledge_progress(self):
    """Test has_student_progress returns True when knowledge progress exists"""
    task = TaskFactory()
    assignment = TaskAssignmentFactory(task=task)
    task_knowledge = TaskKnowledgeFactory(task=task)
    KnowledgeLearningProgressFactory(
        assignment=assignment,
        task_knowledge=task_knowledge,
        is_completed=True
    )

    service = TaskService()
    result = service.has_student_progress(task)

    assert result is True

def test_has_student_progress_with_quiz_submission(self):
    """Test has_student_progress returns True when quiz submission exists"""
    task = TaskFactory()
    assignment = TaskAssignmentFactory(task=task)
    SubmissionFactory(task_assignment=assignment)

    service = TaskService()
    result = service.has_student_progress(task)

    assert result is True
```

**Step 2: Run test to verify it fails**

Run: `cd lms_backend && pytest apps/tasks/tests/test_services.py::test_has_student_progress_no_progress -v`

Expected: FAIL with "AttributeError: 'TaskService' object has no attribute 'has_student_progress'"

**Step 3: Write minimal implementation**

In `lms_backend/apps/tasks/services.py`, add method to TaskService class (after line 102):

```python
def has_student_progress(self, task: Task) -> bool:
    """
    检查任务是否有学员学习进度

    Args:
        task: The task to check

    Returns:
        True if any student has started working on the task
    """
    # 检查是否有知识学习进度
    has_knowledge_progress = KnowledgeLearningProgress.objects.filter(
        assignment__task=task,
        is_completed=True
    ).exists()

    if has_knowledge_progress:
        return True

    # 检查是否有试卷提交
    from apps.submissions.models import Submission
    has_quiz_submissions = Submission.objects.filter(
        task_assignment__task=task
    ).exists()

    return has_quiz_submissions
```

**Step 4: Run tests to verify they pass**

Run: `cd lms_backend && pytest apps/tasks/tests/test_services.py -k has_student_progress -v`

Expected: All 3 tests PASS

**Step 5: Commit**

```bash
git add lms_backend/apps/tasks/services.py lms_backend/apps/tasks/tests/test_services.py
git commit -m "feat: add has_student_progress method to TaskService

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Add Edit Restrictions to update_task

**Files:**
- Modify: `lms_backend/apps/tasks/services.py:259-290`
- Test: `lms_backend/apps/tasks/tests/test_services.py`

**Step 1: Write the failing tests**

```python
def test_update_task_blocks_resource_edit_with_progress(self):
    """Test update_task raises error when editing resources with progress"""
    task = TaskFactory()
    assignment = TaskAssignmentFactory(task=task)
    task_knowledge = TaskKnowledgeFactory(task=task)
    KnowledgeLearningProgressFactory(
        assignment=assignment,
        task_knowledge=task_knowledge,
        is_completed=True
    )

    service = TaskService()

    with pytest.raises(BusinessError) as exc:
        service.update_task(task, knowledge_ids=[999])

    assert exc.value.code == ErrorCodes.INVALID_OPERATION
    assert '无法修改知识文档' in str(exc.value.message)

def test_update_task_blocks_assignee_removal_with_progress(self):
    """Test update_task raises error when removing assignees with progress"""
    task = TaskFactory()
    assignment1 = TaskAssignmentFactory(task=task)
    assignment2 = TaskAssignmentFactory(task=task)
    task_knowledge = TaskKnowledgeFactory(task=task)
    KnowledgeLearningProgressFactory(
        assignment=assignment1,
        task_knowledge=task_knowledge,
        is_completed=True
    )

    service = TaskService()

    # Try to remove assignment2
    with pytest.raises(BusinessError) as exc:
        service.update_task(task, assignee_ids=[assignment1.assignee_id])

    assert exc.value.code == ErrorCodes.INVALID_OPERATION
    assert '无法移除已分配的学员' in str(exc.value.message)

def test_update_task_allows_assignee_addition_with_progress(self):
    """Test update_task allows adding assignees even with progress"""
    task = TaskFactory()
    assignment = TaskAssignmentFactory(task=task)
    task_knowledge = TaskKnowledgeFactory(task=task)
    KnowledgeLearningProgressFactory(
        assignment=assignment,
        task_knowledge=task_knowledge,
        is_completed=True
    )

    new_user = UserFactory()
    service = TaskService()

    # Should succeed - adding new assignee
    result = service.update_task(
        task,
        assignee_ids=[assignment.assignee_id, new_user.id]
    )

    assert result.assignments.count() == 2

def test_update_task_allows_basic_fields_with_progress(self):
    """Test update_task allows editing basic fields with progress"""
    task = TaskFactory()
    assignment = TaskAssignmentFactory(task=task)
    task_knowledge = TaskKnowledgeFactory(task=task)
    KnowledgeLearningProgressFactory(
        assignment=assignment,
        task_knowledge=task_knowledge,
        is_completed=True
    )

    service = TaskService()

    # Should succeed - editing basic fields
    result = service.update_task(
        task,
        title="New Title",
        description="New Description"
    )

    assert result.title == "New Title"
    assert result.description == "New Description"
```

**Step 2: Run tests to verify they fail**

Run: `cd lms_backend && pytest apps/tasks/tests/test_services.py -k "update_task_blocks or update_task_allows" -v`

Expected: Tests FAIL because restrictions not implemented

**Step 3: Write minimal implementation**

In `lms_backend/apps/tasks/services.py`, modify `update_task` method (around line 259):

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
    """
    Update a task and its associations.

    Args:
        task: Task to update
        knowledge_ids: New list of knowledge IDs (None to skip update)
        quiz_ids: New list of quiz IDs (None to skip update)
        assignee_ids: New list of assignee IDs (None to skip update)
        **kwargs: Other task fields to update

    Returns:
        Updated Task instance

    Raises:
        BusinessError: If editing restricted fields with student progress
    """
    # Check if task has student progress
    has_progress = self.has_student_progress(task)

    # If has progress, enforce restrictions
    if has_progress:
        # Cannot edit resources
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

        # Cannot remove assignees (only add)
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

    # Update basic fields
    task = self.task_repository.update(task, **kwargs)

    # Update knowledge associations
    if knowledge_ids is not None:
        self._update_knowledge_associations(task, knowledge_ids)

    # Update quiz associations
    if quiz_ids is not None:
        self._update_quiz_associations(task, quiz_ids)

    # Update assignments
    if assignee_ids is not None:
        self._update_assignments(task, assignee_ids)

    return task
```

**Step 4: Run tests to verify they pass**

Run: `cd lms_backend && pytest apps/tasks/tests/test_services.py -k "update_task" -v`

Expected: All update_task tests PASS

**Step 5: Commit**

```bash
git add lms_backend/apps/tasks/services.py lms_backend/apps/tasks/tests/test_services.py
git commit -m "feat: add edit restrictions to update_task based on progress

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Add has_progress to Task Serializer

**Files:**
- Modify: `lms_backend/apps/tasks/serializers.py`
- Test: `lms_backend/apps/tasks/tests/test_serializers.py`

**Step 1: Write the failing test**

```python
def test_task_serializer_includes_has_progress(self):
    """Test TaskSerializer includes has_progress field"""
    task = TaskFactory()
    assignment = TaskAssignmentFactory(task=task)
    task_knowledge = TaskKnowledgeFactory(task=task)
    KnowledgeLearningProgressFactory(
        assignment=assignment,
        task_knowledge=task_knowledge,
        is_completed=True
    )

    serializer = TaskSerializer(task)

    assert 'has_progress' in serializer.data
    assert serializer.data['has_progress'] is True

def test_task_serializer_has_progress_false_without_progress(self):
    """Test has_progress is False when no progress exists"""
    task = TaskFactory()
    TaskAssignmentFactory(task=task)

    serializer = TaskSerializer(task)

    assert serializer.data['has_progress'] is False
```

**Step 2: Run test to verify it fails**

Run: `cd lms_backend && pytest apps/tasks/tests/test_serializers.py -k has_progress -v`

Expected: FAIL with KeyError 'has_progress'

**Step 3: Write minimal implementation**

Find the TaskSerializer in `lms_backend/apps/tasks/serializers.py` and add:

```python
class TaskSerializer(serializers.ModelSerializer):
    # ... existing fields ...
    has_progress = serializers.SerializerMethodField()

    def get_has_progress(self, obj):
        """Check if task has student learning progress"""
        service = TaskService()
        return service.has_student_progress(obj)

    class Meta:
        model = Task
        fields = [
            # ... existing fields ...
            'has_progress',
        ]
```

**Step 4: Run test to verify it passes**

Run: `cd lms_backend && pytest apps/tasks/tests/test_serializers.py -k has_progress -v`

Expected: Both tests PASS

**Step 5: Commit**

```bash
git add lms_backend/apps/tasks/serializers.py lms_backend/apps/tasks/tests/test_serializers.py
git commit -m "feat: add has_progress field to TaskSerializer

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Update Frontend Types

**Files:**
- Modify: `lms_frontend/src/types/task.ts`

**Step 1: Add has_progress to Task type**

In `lms_frontend/src/types/task.ts`, add the field:

```typescript
export interface Task {
  id: number
  title: string
  description: string
  deadline: string
  knowledge_ids: number[]
  quiz_ids: number[]
  assignee_ids: number[]
  // ... other existing fields ...
  has_progress: boolean  // Add this field
}
```

**Step 2: Commit**

```bash
git add lms_frontend/src/types/task.ts
git commit -m "feat: add has_progress field to Task type

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Update Task Form Component

**Files:**
- Modify: `lms_frontend/src/features/tasks/components/task-form.tsx`

**Step 1: Add disabled state logic**

Find the TaskForm component and add state management:

```typescript
const TaskForm = ({ task, mode }: TaskFormProps) => {
  const hasProgress = task?.has_progress || false
  const isEditMode = mode === 'edit'

  // Resources disabled if editing task with progress
  const resourcesDisabled = isEditMode && hasProgress

  // Can remove assignees only if no progress
  const canRemoveAssignee = !(isEditMode && hasProgress)

  // ... rest of component
}
```

**Step 2: Add warning alerts**

Add warning components before resource selector and assignee list:

```typescript
{resourcesDisabled && (
  <Alert variant="warning" className="mb-4">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>
      任务已有学员开始学习，无法修改资源（知识文档和试卷）
    </AlertDescription>
  </Alert>
)}

<ResourceSelector
  disabled={resourcesDisabled}
  // ... other props
/>

{!canRemoveAssignee && (
  <Alert variant="warning" className="mb-4">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>
      任务已有学员开始学习，无法移除已分配的学员
    </AlertDescription>
  </Alert>
)}

<AssigneeList
  canRemove={canRemoveAssignee}
  canAdd={true}
  // ... other props
/>
```

**Step 3: Update form submission**

Ensure form doesn't send disabled fields:

```typescript
const handleSubmit = (data: TaskFormData) => {
  const payload = {
    title: data.title,
    description: data.description,
    deadline: data.deadline,
    // Only include if not disabled
    ...(resourcesDisabled ? {} : {
      knowledge_ids: data.knowledge_ids,
      quiz_ids: data.quiz_ids,
    }),
    assignee_ids: data.assignee_ids,
  }

  onSubmit(payload)
}
```

**Step 4: Commit**

```bash
git add lms_frontend/src/features/tasks/components/task-form.tsx
git commit -m "feat: add edit restrictions UI to task form

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Add Error Handling

**Files:**
- Modify: `lms_frontend/src/features/tasks/api/update-task.ts`

**Step 1: Add error handling for restriction errors**

```typescript
export const updateTask = async (taskId: number, data: UpdateTaskData) => {
  try {
    const response = await api.patch(`/tasks/${taskId}/`, data)
    return response.data
  } catch (error) {
    if (error.response?.data?.code === 'INVALID_OPERATION') {
      // Show user-friendly error message
      toast.error(error.response.data.message)
      // Optionally refetch task to update has_progress state
      throw new Error(error.response.data.message)
    }
    throw error
  }
}
```

**Step 2: Commit**

```bash
git add lms_frontend/src/features/tasks/api/update-task.ts
git commit -m "feat: add error handling for edit restrictions

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Integration Testing

**Files:**
- Test: Manual testing in browser

**Step 1: Test scenario - No progress**

1. Create a new task with resources and assignees
2. Edit the task
3. Verify all fields are editable
4. Verify no warning messages appear

**Step 2: Test scenario - With knowledge progress**

1. Create a task and assign to a student
2. As student, mark a knowledge document as completed
3. As admin, try to edit the task
4. Verify resources are disabled with warning
5. Verify can still edit title, description, deadline
6. Verify can add new assignees but not remove existing

**Step 3: Test scenario - With quiz submission**

1. Create a task with a quiz
2. As student, submit the quiz
3. As admin, try to edit the task
4. Verify same restrictions as knowledge progress

**Step 4: Test scenario - Backend validation**

1. Use browser dev tools to enable disabled fields
2. Try to submit with modified resources
3. Verify backend returns error
4. Verify error message displays correctly

**Step 5: Document test results**

Create `docs/testing/task-edit-restrictions-test-results.md` with findings

**Step 6: Commit**

```bash
git add docs/testing/task-edit-restrictions-test-results.md
git commit -m "docs: add integration test results for edit restrictions

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Final Review and Cleanup

**Step 1: Run all backend tests**

Run: `cd lms_backend && pytest apps/tasks/tests/ -v`

Expected: All tests PASS

**Step 2: Run frontend type check**

Run: `cd lms_frontend && npm run type-check`

Expected: No type errors

**Step 3: Review code for DRY violations**

Check for any duplicated logic that should be extracted

**Step 4: Update design document status**

In `docs/plans/2026-01-16-task-edit-restrictions-design.md`, change status to "已实现"

**Step 5: Final commit**

```bash
git add docs/plans/2026-01-16-task-edit-restrictions-design.md
git commit -m "docs: mark task edit restrictions as implemented

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Summary

**Total Tasks:** 8
**Estimated Time:** 2-3 hours
**Key Files Modified:** 7 backend files, 3 frontend files
**Tests Added:** ~10 unit tests + integration testing

**Critical Path:**
1. Backend progress detection (Task 1)
2. Backend restrictions (Task 2)
3. API exposure (Task 3)
4. Frontend UI (Tasks 4-6)
5. Testing (Tasks 7-8)
