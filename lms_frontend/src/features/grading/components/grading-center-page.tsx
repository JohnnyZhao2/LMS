import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { PageFillShell, PageShell, PageWorkbench } from '@/components/ui/page-shell';
import { usePendingQuizzes, type PendingTask, type PendingQuiz } from '../api/pending-quizzes';
import { GradingCenterTab, type GradingCenterSelectorConfig } from '@/features/tasks/components/task-preview/grading-center-tab';

export const GradingCenterPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTaskId, setSelectedTaskId] = React.useState<number | null>(null);
  const [selectedQuizId, setSelectedQuizId] = React.useState<number | null>(null);
  const preferredTaskId = Number(searchParams.get('task') || 0);
  const isTaskManagementEntry = searchParams.get('entry') === 'task-management';
  const lockedTaskTitle = searchParams.get('taskTitle')?.trim() || '';

  const { data: tasks, isLoading } = usePendingQuizzes();
  const selectedTask = tasks?.find((task) => task.task_id === selectedTaskId) ?? null;

  React.useEffect(() => {
    if (!tasks || tasks.length === 0) {
      setSelectedTaskId(null);
      return;
    }

    if (isTaskManagementEntry && preferredTaskId > 0) {
      const nextTaskId = tasks.some((task) => task.task_id === preferredTaskId)
        ? preferredTaskId
        : null;

      if (nextTaskId !== selectedTaskId) {
        setSelectedTaskId(nextTaskId);
      }
      return;
    }

    const hasSelectedTask =
      selectedTaskId !== null && tasks.some((task) => task.task_id === selectedTaskId);
    const hasPreferredTask =
      preferredTaskId > 0 && tasks.some((task) => task.task_id === preferredTaskId);

    const nextTaskId =
      hasSelectedTask
        ? selectedTaskId
        : hasPreferredTask
          ? preferredTaskId
          : tasks[0].task_id;

    if (nextTaskId !== selectedTaskId) {
      setSelectedTaskId(nextTaskId);
    }
  }, [isTaskManagementEntry, preferredTaskId, selectedTaskId, tasks]);

  React.useEffect(() => {
    if (!selectedTask) {
      setSelectedQuizId(null);
      return;
    }

    if (!selectedTask.quizzes.some((quiz) => quiz.quiz_id === selectedQuizId)) {
      setSelectedQuizId(selectedTask.quizzes[0]?.quiz_id ?? null);
    }
  }, [selectedQuizId, selectedTask]);

  React.useEffect(() => {
    if (!selectedTaskId) {
      return;
    }

    if (Number(searchParams.get('task') || 0) === selectedTaskId) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('task', String(selectedTaskId));
    setSearchParams(nextSearchParams, { replace: true });
  }, [searchParams, selectedTaskId, setSearchParams]);

  const handleTaskSelect = (task: PendingTask) => {
    setSelectedTaskId(task.task_id);
    if (task.quizzes.length > 0) {
      setSelectedQuizId(task.quizzes[0].quiz_id);
    } else {
      setSelectedQuizId(null);
    }
  };

  const handleQuizSelect = (quiz: PendingQuiz) => {
    setSelectedQuizId(quiz.quiz_id);
  };

  const selectorConfig: GradingCenterSelectorConfig | undefined = tasks && tasks.length > 0
    ? {
      tasks,
      selectedTaskId,
      selectedQuizId,
      selectedTaskTitle: selectedTask?.task_title || lockedTaskTitle || '当前任务',
      isTaskLocked: isTaskManagementEntry,
      onTaskSelect: handleTaskSelect,
      onQuizSelect: handleQuizSelect,
    }
    : undefined;

  if (isLoading) {
    return (
      <PageShell>
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-10 w-56" />
        </div>
        <Skeleton className="h-[600px] rounded-lg" />
      </PageShell>
    );
  }

  return (
    <PageFillShell>
      <PageHeader
        title="阅卷中心"
        icon={<FileCheck />}
      />

      {/* Main Content */}
      <PageWorkbench>
        {isTaskManagementEntry ? (
          selectedTask && selectedQuizId ? (
            <GradingCenterTab
              taskId={selectedTask.task_id}
              quizId={selectedQuizId}
              selectorConfig={selectorConfig}
            />
          ) : (
            <div className="flex h-full min-h-[36rem] flex-col rounded-2xl border border-dashed border-border bg-muted">
              <EmptyState
                icon={FileCheck}
                title="当前任务暂无待阅卷试卷"
                description="当前入口已锁定任务，如需切换任务，请从阅卷中心主页进入"
              />
            </div>
          )
        ) : !tasks || tasks.length === 0 ? (
          <div className="flex h-full min-h-[36rem] flex-col rounded-2xl border border-dashed border-border bg-muted">
            <EmptyState
              icon={FileCheck}
              title="暂无待阅卷任务"
              description="当前没有需要批阅的试卷"
            />
          </div>
        ) : selectedTask && selectedQuizId ? (
          <GradingCenterTab
            taskId={selectedTask.task_id}
            quizId={selectedQuizId}
            selectorConfig={selectorConfig}
          />
        ) : (
          <div className="flex h-full min-h-[36rem] flex-col rounded-2xl border border-dashed border-border bg-muted">
            <EmptyState
              icon={FileCheck}
              title="请选择任务和试卷"
              description="从左侧选择器中选择要批阅的任务和试卷"
            />
          </div>
        )}
      </PageWorkbench>
    </PageFillShell>
  );
};
