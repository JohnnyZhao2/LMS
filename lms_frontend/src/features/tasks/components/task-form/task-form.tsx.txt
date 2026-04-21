import { useState } from 'react';
import { FileText, Loader2, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { UserSelectPanelItem } from '@/components/common/user-select-list';
import { FILLED_PLAIN_FIELD_CLASSNAME } from '@/components/ui/interactive-styles';
import { Input } from '@/components/ui/input';
import { EditorPageShell, PageWorkbench } from '@/components/ui/page-shell';
import { cn } from '@/lib/utils';

import { useTaskForm } from './use-task-form';
import { TaskConfigurationPanel } from './task-configuration-panel';
import { THREE_PANEL_EDITOR_WORKBENCH_CLASSNAME } from '@/components/ui/editor-layout';
import { TaskPipelinePanel } from './task-pipeline-panel';
import { TaskResourceLibraryPanel } from './task-resource-library-panel';
import { QuizPreviewDialog } from '@/entities/quiz/components/quiz-preview-dialog';
import { KnowledgeDetailModal } from '@/entities/knowledge/components/knowledge-detail-modal';

export const TaskForm: React.FC = () => {
  const [previewDocumentId, setPreviewDocumentId] = useState<number | null>(null);
  const [previewQuizId, setPreviewQuizId] = useState<number | null>(null);
  const {
    isEdit,
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
    totalResourceCount,
    resourcePageSize,
    safeCurrentPage,
    shouldPaginateResources,
    filteredUsers,
    isUsersLoading,
    isLoading,
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
    meta: `${user.employee_id || '-'} · ${user.department?.name || '无部门'}`,
  }));

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
        <div className={THREE_PANEL_EDITOR_WORKBENCH_CLASSNAME}>
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
            onDocumentPreview={setPreviewDocumentId}
            onQuizPreview={setPreviewQuizId}
            resourcesDisabled={resourcesDisabled}
            totalResourceCount={totalResourceCount}
            pageSize={resourcePageSize}
            safeCurrentPage={safeCurrentPage}
            showPagination={shouldPaginateResources}
            onPageChange={setCurrentPage}
          />

          <div className="min-h-0 flex flex-col overflow-hidden rounded-xl border border-border bg-background">
            <div className="relative flex h-11 shrink-0 items-center justify-end border-b border-border px-4">
              <div className="absolute left-1/2 top-1/2 w-[clamp(12rem,44%,20rem)] -translate-x-1/2 -translate-y-1/2">
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="输入任务标题..."
                  className={cn(
                    'h-9 rounded-lg px-4 text-center text-[13px] font-semibold placeholder:text-text-muted/50',
                    FILLED_PLAIN_FIELD_CLASSNAME,
                  )}
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                className="relative z-10 h-9 shrink-0 rounded-lg bg-foreground px-3.5 text-[12px] font-semibold text-background hover:bg-foreground/90"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {isEdit ? '保存修改' : '发布任务'}
              </Button>
            </div>

            <TaskPipelinePanel
              selectedResources={selectedResources}
              resourcesDisabled={resourcesDisabled}
              onDragEnd={handleDragEnd}
              onRemoveResource={removeResource}
              embedded
            />
          </div>

          <TaskConfigurationPanel
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
          />
        </div>
      </PageWorkbench>

      <QuizPreviewDialog
        open={previewQuizId !== null}
        quizId={previewQuizId}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewQuizId(null);
          }
        }}
        onPrimaryAction={(quizId) => {
          const target = availableResources.find((resource) => resource.resourceType === 'QUIZ' && resource.id === quizId);
          if (target) {
            addResource(target);
          }
          setPreviewQuizId(null);
        }}
      />

      {previewDocumentId !== null ? (
        <KnowledgeDetailModal
          knowledgeId={previewDocumentId}
          previewOnly
          onClose={() => setPreviewDocumentId(null)}
        />
      ) : null}
    </EditorPageShell>
  );
};
