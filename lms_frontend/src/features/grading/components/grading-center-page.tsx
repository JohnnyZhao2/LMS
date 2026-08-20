import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { PageFillShell, PageShell, PageWorkbench } from '@/components/ui/page-shell';
import { usePendingQuizzes, type PendingTask, type PendingQuiz } from '@/features/grading/api/pending-quizzes';
import { GradingCenterTab, type GradingCenterSelectorConfig } from '@/features/grading/components/grading-center-tab';

export const GradingCenterPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTaskId, setSelectedTaskId] = React.useState<number | null>(null);
  const [selectedQuizId, setSelectedQuizId] = React.useState<number | null>(null);
  const preferredTaskId = Number(searchParams.get('task') || 0);

  const { data: tasks, isLoading } = usePendingQuizzes();
  const selectorTasks = tasks ?? [];

  const resolvedTaskId = React.useMemo(() => {
    if (selectorTasks.length === 0) {
      return null;
    }

    if (selectedTaskId !== null && selectorTasks.some((task) => task.task_id === selectedTaskId)) {
      return selectedTaskId;
    }

    if (preferredTaskId > 0 && selectorTasks.some((task) => task.task_id === preferredTaskId)) {
      return preferredTaskId;
    }

    return selectorTasks[0].task_id;
  }, [preferredTaskId, selectedTaskId, selectorTasks]);

  const selectedTask = selectorTasks.find((task) => task.task_id === resolvedTaskId) ?? null;
  const resolvedQuizId = React.useMemo(() => {
    if (!selectedTask) {
      return null;
    }

    if (selectedQuizId !== null && selectedTask.quizzes.some((quiz) => quiz.quiz_id === selectedQuizId)) {
      return selectedQuizId;
    }

    return selectedTask.quizzes[0]?.quiz_id ?? null;
  }, [selectedQuizId, selectedTask]);

  React.useEffect(() => {
    if (!resolvedTaskId) {
      return;
    }

    if (Number(searchParams.get('task') || 0) === resolvedTaskId) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('task', String(resolvedTaskId));
    setSearchParams(nextSearchParams, { replace: true });
  }, [resolvedTaskId, searchParams, setSearchParams]);

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

  const selectorConfig: GradingCenterSelectorConfig | undefined = selectorTasks.length > 0
    ? {
      tasks: selectorTasks,
      selectedTaskId: resolvedTaskId,
      selectedQuizId: resolvedQuizId,
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

      <PageWorkbench>
        {selectorTasks.length === 0 ? (
          <div className="flex h-full min-h-[36rem] flex-col rounded-2xl border border-dashed border-border bg-muted">
            <EmptyState
              icon={FileCheck}
              title="暂无可分析任务"
              description="当前没有可在阅卷中心查看的试卷数据"
            />
          </div>
        ) : (
          <GradingCenterTab
            taskId={resolvedTaskId ?? undefined}
            quizId={resolvedQuizId}
            selectorConfig={selectorConfig}
          />
        )}
      </PageWorkbench>
    </PageFillShell>
  );
};
