import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { PageFillShell, PageShell, PageWorkbench } from '@/components/ui/page-shell';
import { usePendingQuizzes, type PendingTask, type PendingQuiz } from '@/entities/grading/api/pending-quizzes';
import { GradingCenterTab, type GradingCenterSelectorConfig } from '@/entities/grading/components/grading-center-tab';
import { useTaskDetail } from '@/entities/task/api/get-task-detail';

export const GradingCenterPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTaskId, setSelectedTaskId] = React.useState<number | null>(null);
  const [selectedQuizId, setSelectedQuizId] = React.useState<number | null>(null);
  const preferredTaskId = Number(searchParams.get('task') || 0);
  const isTaskManagementEntry = searchParams.get('entry') === 'task-management';
  const lockedTaskTitle = searchParams.get('taskTitle')?.trim() || '';

  const { data: tasks, isLoading: pendingTasksLoading } = usePendingQuizzes({
    enabled: !isTaskManagementEntry,
  });
  const { data: lockedTask, isLoading: lockedTaskLoading } = useTaskDetail(preferredTaskId, {
    enabled: isTaskManagementEntry && preferredTaskId > 0,
  });
  const selectorTasks = React.useMemo<PendingTask[]>(() => {
    if (!isTaskManagementEntry) {
      return tasks ?? [];
    }

    if (!lockedTask) {
      return [];
    }

    return [{
      task_id: lockedTask.id,
      task_title: lockedTask.title,
      deadline: lockedTask.deadline,
      quizzes: lockedTask.quizzes.map((quiz) => ({
        quiz_id: quiz.task_quiz_id,
        quiz_title: quiz.quiz_title,
        quiz_type: quiz.quiz_type,
        quiz_type_display: quiz.quiz_type_display,
        question_count: quiz.question_count,
        duration: quiz.duration ?? null,
        pending_count: 0,
      })),
    }];
  }, [isTaskManagementEntry, lockedTask, tasks]);
  const isLoading = isTaskManagementEntry ? lockedTaskLoading : pendingTasksLoading;
  const resolvedTaskId = React.useMemo(() => {
    if (selectorTasks.length === 0) {
      return null;
    }

    if (isTaskManagementEntry) {
      return preferredTaskId > 0 && selectorTasks.some((task) => task.task_id === preferredTaskId)
        ? preferredTaskId
        : selectorTasks[0].task_id;
    }

    if (selectedTaskId !== null && selectorTasks.some((task) => task.task_id === selectedTaskId)) {
      return selectedTaskId;
    }

    if (preferredTaskId > 0 && selectorTasks.some((task) => task.task_id === preferredTaskId)) {
      return preferredTaskId;
    }

    return selectorTasks[0].task_id;
  }, [isTaskManagementEntry, preferredTaskId, selectedTaskId, selectorTasks]);

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
      selectedTaskTitle: selectedTask?.task_title || lockedTaskTitle || lockedTask?.title || '当前任务',
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
          selectedTask && resolvedQuizId ? (
            <GradingCenterTab
              taskId={selectedTask.task_id}
              quizId={resolvedQuizId}
              selectorConfig={selectorConfig}
            />
        ) : (
          <div className="flex h-full min-h-[36rem] flex-col rounded-2xl border border-dashed border-border bg-muted">
            <EmptyState
              icon={FileCheck}
              title="当前任务暂无可分析试卷"
              description="当前入口已锁定任务，如需切换任务，请从阅卷中心主页进入"
            />
          </div>
        )
        ) : selectorTasks.length === 0 ? (
          <div className="flex h-full min-h-[36rem] flex-col rounded-2xl border border-dashed border-border bg-muted">
            <EmptyState
              icon={FileCheck}
              title="暂无可分析任务"
              description="当前没有可在阅卷中心查看的试卷数据"
            />
          </div>
        ) : selectedTask && resolvedQuizId ? (
          <GradingCenterTab
            taskId={selectedTask.task_id}
            quizId={resolvedQuizId}
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
