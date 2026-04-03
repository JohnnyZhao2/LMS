import { FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { UserSelectPanelItem } from '@/components/common/user-select-list';

import { useTaskForm } from './use-task-form';
import { TaskConfigurationPanel } from './task-configuration-panel';
import { TaskFormHeader } from './task-form-header';
import { TASK_FORM_WORKBENCH_CLASSNAME } from './task-form.constants';
import { TaskPipelinePanel } from './task-pipeline-panel';
import { TaskResourceLibraryPanel } from './task-resource-library-panel';

export const TaskForm: React.FC = () => {
  const {
    isEdit,
    task,
    taskError,
    title,
    setTitle,
    description,
    setDescription,
    deadline,
    setDeadline,
    selectedResources,
    resourceSearch,
    setResourceSearch,
    resourceType,
    setResourceType,
    selectedUserIds,
    userSearch,
    setUserSearch,
    setCurrentPage,
    availableResources,
    totalPages,
    safeCurrentPage,
    filteredUsers,
    isUsersLoading,
    isLoading,
    isSubmitting,
    canSubmit,
    resourcesDisabled,
    canRemoveAssignee,
    addResource,
    moveResource,
    removeResource,
    upgradeResource,
    toggleUser,
    toggleUsers,
    clearUsers,
    handleDragEnd,
    handleSubmit,
    roleNavigate,
  } = useTaskForm();

  const userPanelItems: UserSelectPanelItem[] = filteredUsers.map((user) => ({
    id: user.id,
    name: user.username,
    avatarKey: user.avatar_key,
    meta: `${user.employee_id || '-'} | ${user.department?.name || '无部门'}`,
  }));

  if (taskError) {
    return (
      <div className="flex h-full min-h-[32rem] flex-col items-center justify-center rounded-xl border border-border bg-background py-16">
        <FileText className="mb-4 h-12 w-12 text-text-muted" />
        <span className="mb-4 text-sm font-medium text-text-muted">加载任务失败</span>
        <Button onClick={() => roleNavigate('tasks')}>返回</Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-48px)] min-h-0 flex-col gap-2 overflow-hidden bg-muted/20 py-2">
      <TaskFormHeader
        isEdit={isEdit}
        task={task}
        title={title}
        onTitleChange={setTitle}
        onBack={() => roleNavigate('tasks')}
        onSubmit={handleSubmit}
        canSubmit={canSubmit}
        isSubmitting={isSubmitting}
      />

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className={TASK_FORM_WORKBENCH_CLASSNAME}>
          <TaskResourceLibraryPanel
            availableResources={availableResources}
            isLoading={isLoading}
            resourceSearch={resourceSearch}
            onResourceSearchChange={(value) => {
              setResourceSearch(value);
              setCurrentPage(1);
            }}
            resourceType={resourceType}
            onResourceTypeChange={(value) => {
              setResourceType(value);
              setCurrentPage(1);
            }}
            onResourceAdd={addResource}
            resourcesDisabled={resourcesDisabled}
            totalPages={totalPages}
            safeCurrentPage={safeCurrentPage}
            onPageChange={setCurrentPage}
          />

          <TaskPipelinePanel
            selectedResources={selectedResources}
            resourcesDisabled={resourcesDisabled}
            onDragEnd={handleDragEnd}
            onMoveResource={moveResource}
            onRemoveResource={removeResource}
            onUpgradeResource={upgradeResource}
          />

          <TaskConfigurationPanel
            title={title}
            onTitleChange={setTitle}
            deadline={deadline}
            onDeadlineChange={setDeadline}
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
            onClearUsers={clearUsers}
          />
        </div>
      </div>
    </div>
  );
};

export default TaskForm;
