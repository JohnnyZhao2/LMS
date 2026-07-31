import { FileText, LayoutList, Loader2, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { UserSelectPanelItem } from '@/components/common/user-select-list';
import { EditorPageShell, PageWorkbench } from '@/components/ui/page-shell';
import { TWO_PANEL_EDITOR_WORKBENCH_CLASSNAME } from '@/components/ui/editor-layout';

import { useTaskForm } from './use-task-form';
import { TaskConfigurationPanel } from './task-configuration-panel';
import { TaskPipelinePanel } from './task-pipeline-panel';

const ASSIGNEE_ROLE_LABELS = new Map([
  ['DEPT', '室组'],
]);

export const TaskForm: React.FC = () => {
  const {
    isEdit,
    taskError,
    title,
    setTitle,
    description,
    setDescription,
    deadlineDays,
    setDeadlineDays,
    selectedResources,
    selectedUserIds,
    userSearch,
    setUserSearch,
    excludedDocumentIds,
    excludedQuizIds,
    filteredUsers,
    isUsersLoading,
    isSubmitting,
    canSubmit,
    resourcesDisabled,
    canRemoveAssignee,
    addResource,
    removeResource,
    toggleUser,
    toggleUsers,
    handleDragEnd,
    handleSubmit,
    roleNavigate,
  } = useTaskForm();

  const userPanelItems: UserSelectPanelItem[] = filteredUsers.map((user) => ({
    id: user.id,
    name: user.username,
    avatarKey: user.avatar_key,
    meta: [
      user.employee_id || '-',
      user.department?.name || '无部门',
      user.roles.map((role) => ASSIGNEE_ROLE_LABELS.get(role.code)).find(Boolean),
    ].filter(Boolean).join(' · '),
  }));
  const hasTaskContent = selectedResources.length > 0;

  if (taskError) {
    return (
      <div className="flex h-full min-h-[32rem] flex-col items-center justify-center rounded-2xl border border-border bg-background py-16">
        <FileText className="mb-4 h-12 w-12 text-text-muted" />
        <span className="mb-4 text-sm font-medium text-text-muted">加载任务失败</span>
        <Button onClick={() => roleNavigate('tasks')}>返回</Button>
      </div>
    );
  }

  return (
    <EditorPageShell>
      <PageWorkbench className="min-w-0">
        <div className={TWO_PANEL_EDITOR_WORKBENCH_CLASSNAME}>
          <TaskConfigurationPanel
            title={title}
            onTitleChange={setTitle}
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
          />

          <div className="relative min-h-0 flex flex-col overflow-hidden rounded-xl border border-border bg-background">
            <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-4 text-[12px] font-semibold text-foreground">
              <LayoutList className="h-4 w-4 text-text-muted" />
              <span>任务节点</span>
            </div>

            <TaskPipelinePanel
              selectedResources={selectedResources}
              resourcesDisabled={resourcesDisabled}
              excludeDocumentIds={excludedDocumentIds}
              excludeQuizIds={excludedQuizIds}
              onDragEnd={handleDragEnd}
              onRemoveResource={removeResource}
              onAddResource={addResource}
              embedded
            />

            {hasTaskContent ? (
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                className="absolute bottom-5 right-5 z-30 h-10 shrink-0 rounded-full bg-foreground px-4 text-[12px] font-semibold text-background shadow-[0_14px_34px_rgba(15,23,42,0.22)] hover:bg-foreground/90 hover:shadow-[0_18px_40px_rgba(15,23,42,0.28)]"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {isEdit ? '保存修改' : '发布任务'}
              </Button>
            ) : null}
          </div>
        </div>
      </PageWorkbench>
    </EditorPageShell>
  );
};
