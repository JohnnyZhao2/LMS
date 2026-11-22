import { FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { UserSelectPanelItem } from '@/components/common/user-select-list';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EditorPageShell, PageWorkbench } from '@/components/ui/page-shell';
import { ROUTES } from '@/config/routes';

import { useTaskForm } from '@/features/tasks/components/task-form/use-task-form';
import { TaskConfigurationPanel } from '@/features/tasks/components/task-form/task-configuration-panel';
import { TaskPipelinePanel } from '@/features/tasks/components/task-form/task-pipeline-panel';
import { TaskResourceLibraryPanel } from '@/features/tasks/components/task-form/task-resource-library-panel';

const ASSIGNEE_ROLE_LABELS = new Map([
  ['DEPT_MANAGER', '室经理'],
]);

const TASK_FORM_WORKBENCH_CLASSNAME =
  'grid h-full min-h-0 min-w-0 grid-cols-1 items-stretch gap-3 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(24rem,27.5rem)] lg:overflow-hidden';

export const TaskForm: React.FC = () => {
  const {
    isEdit,
    taskError,
    title,
    setTitle,
    description,
    setDescription,
    deadline,
    deadlineDays,
    setDeadlineDays,
    selectedResources,
    resourceSearch,
    setResourceSearch,
    resourceTypeFilter,
    setResourceTypeFilter,
    isPickerOpen,
    openPicker,
    closePicker,
    selectedUserIds,
    userSearch,
    setUserSearch,
    setCurrentPage,
    availableResources,
    totalResourceCount,
    resourcePageSize,
    safeCurrentPage,
    shouldPaginateResources,
    filteredUsers,
    isUsersLoading,
    isLoading,
    isSubmitting,
    canSubmit,
    canRemoveAssignee,
    addResource,
    toggleQuizType,
    updateResourceExamConfig,
    removeResource,
    toggleUser,
    toggleUsers,
    handleDragEnd,
    handleSubmit,
    navigate,
  } = useTaskForm();

  const userPanelItems: UserSelectPanelItem[] = filteredUsers.map((user) => {
    const tags = [
      user.employee_id || '-',
      user.department?.name || '无部门',
      user.roles.map((role) => ASSIGNEE_ROLE_LABELS.get(role.code)).find(Boolean),
    ].filter((tag): tag is string => Boolean(tag));

    return {
      id: user.id,
      name: user.username,
      avatarKey: user.avatar_key,
      meta: tags.join(' · '),
    };
  });

  if (taskError) {
    return (
      <div className="flex h-full min-h-[32rem] flex-col items-center justify-center rounded-2xl border border-border bg-background py-16">
        <FileText className="mb-4 h-12 w-12 text-text-muted" />
        <span className="mb-4 text-sm font-medium text-text-muted">加载任务失败</span>
        <Button onClick={() => navigate(ROUTES.TASKS)}>返回</Button>
      </div>
    );
  }

  return (
    <EditorPageShell>
      <PageWorkbench className="min-w-0">
        <div className={TASK_FORM_WORKBENCH_CLASSNAME}>
          <div className="flex min-h-[32rem] min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-background lg:min-h-0">
            <TaskPipelinePanel
              selectedResources={selectedResources}
              isEdit={isEdit}
              onDragEnd={handleDragEnd}
              onRemoveResource={removeResource}
              onToggleQuizType={toggleQuizType}
              onUpdateExamConfig={updateResourceExamConfig}
              onAddResource={openPicker}
              embedded
            />
          </div>

          <div className="min-h-[32rem] lg:h-full lg:min-h-0">
          <TaskConfigurationPanel
            title={title}
            onTitleChange={setTitle}
            deadline={deadline}
            deadlineDays={deadlineDays}
            onDeadlineDaysChange={setDeadlineDays}
            description={description}
            onDescriptionChange={setDescription}
            selectedUserIds={selectedUserIds}
            userPanelItems={userPanelItems}
            userSearch={userSearch}
            onUserSearchChange={setUserSearch}
            onToggleUser={toggleUser}
            onToggleUsers={toggleUsers}
            isUsersLoading={isUsersLoading}
            canRemoveAssignee={canRemoveAssignee}
            isEdit={isEdit}
            isSubmitting={isSubmitting}
            canSubmit={canSubmit}
            onSubmit={handleSubmit}
          />
          </div>
        </div>
      </PageWorkbench>

      <Dialog open={isPickerOpen} onOpenChange={(open) => { if (!open) closePicker(); }}>
        <DialogContent
          className="flex h-[min(78vh,680px)] w-[min(980px,calc(100vw-48px))] max-w-none flex-col gap-0 overflow-hidden p-0"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>添加任务资源</DialogTitle>
          </DialogHeader>
          {isPickerOpen ? (
            <TaskResourceLibraryPanel
              resourceTypeFilter={resourceTypeFilter}
              onResourceTypeFilterChange={(value) => {
                setResourceTypeFilter(value);
                setCurrentPage(1);
              }}
              availableResources={availableResources}
              selectedResources={selectedResources}
              isLoading={isLoading}
              resourceSearch={resourceSearch}
              onResourceSearchChange={(value) => {
                setResourceSearch(value);
                setCurrentPage(1);
              }}
              onResourceAdd={addResource}
              onResourceRemove={removeResource}
              onDone={closePicker}
              totalResourceCount={totalResourceCount}
              pageSize={resourcePageSize}
              safeCurrentPage={safeCurrentPage}
              showPagination={shouldPaginateResources}
              onPageChange={setCurrentPage}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </EditorPageShell>
  );
};
