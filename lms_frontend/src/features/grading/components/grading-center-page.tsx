import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileCheck,
  BookOpen,
  GraduationCap,
  Clock,
  ChevronDown,
  AlertCircle,
  ClipboardList,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { PageFillShell, PageShell, PageWorkbench } from '@/components/ui/page-shell';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { usePendingQuizzes, type PendingTask, type PendingQuiz } from '../api/pending-quizzes';
import { GradingCenterTab } from '@/features/tasks/components/task-preview/grading-center-tab';

type QuizTypeFilter = 'all' | 'EXAM' | 'PRACTICE';

export const GradingCenterPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTaskId, setSelectedTaskId] = React.useState<number | null>(null);
  const [selectedQuizId, setSelectedQuizId] = React.useState<number | null>(null);
  const [taskPopoverOpen, setTaskPopoverOpen] = React.useState(false);
  const [quizPopoverOpen, setQuizPopoverOpen] = React.useState(false);
  const [quizTypeFilter, setQuizTypeFilter] = React.useState<QuizTypeFilter>('all');
  const preferredTaskId = Number(searchParams.get('task') || 0);
  const isTaskManagementEntry = searchParams.get('entry') === 'task-management';
  const lockedTaskTitle = searchParams.get('taskTitle')?.trim() || '';

  const { data: tasks, isLoading } = usePendingQuizzes();
  const selectedTask = React.useMemo(
    () => tasks?.find((task) => task.task_id === selectedTaskId) ?? null,
    [selectedTaskId, tasks]
  );

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

    const nextTaskId =
      preferredTaskId > 0 && tasks.some((task) => task.task_id === preferredTaskId)
        ? preferredTaskId
        : selectedTaskId && tasks.some((task) => task.task_id === selectedTaskId)
          ? selectedTaskId
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
    setTaskPopoverOpen(false);
    if (task.quizzes.length > 0) {
      setSelectedQuizId(task.quizzes[0].quiz_id);
    } else {
      setSelectedQuizId(null);
    }
  };

  const handleQuizSelect = (quiz: PendingQuiz) => {
    setSelectedQuizId(quiz.quiz_id);
    setQuizPopoverOpen(false);
  };

  const selectedQuiz = selectedTask?.quizzes.find(q => q.quiz_id === selectedQuizId);

  // 根据筛选条件过滤试卷列表
  const filteredQuizzes = React.useMemo(() => {
    if (!selectedTask) return [];
    if (quizTypeFilter === 'all') return selectedTask.quizzes;
    return selectedTask.quizzes.filter(q => q.quiz_type === quizTypeFilter);
  }, [selectedTask, quizTypeFilter]);

  const taskDisplayTitle = selectedTask?.task_title || lockedTaskTitle || '当前任务';
  const showHeaderControls = isTaskManagementEntry ? preferredTaskId > 0 : Boolean(tasks && tasks.length > 0);

  const headerControls = showHeaderControls ? (
    <div className="flex flex-wrap items-end justify-end gap-3">
      <div className="min-w-[220px] flex-1 sm:flex-none">
        {isTaskManagementEntry ? (
          <div className="flex h-10 w-full items-center gap-2 rounded-lg border border-primary-100 bg-primary-50/70 px-3">
            <ClipboardList className="h-4 w-4 shrink-0 text-primary-500" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {taskDisplayTitle}
            </span>
            <span className="shrink-0 rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-primary-700">
              当前任务
            </span>
          </div>
        ) : (
          <Popover open={taskPopoverOpen} onOpenChange={setTaskPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  'flex h-10 w-full items-center gap-2 rounded-lg border px-3 text-left transition-colors',
                  taskPopoverOpen
                    ? 'border-primary-500 bg-primary-50/70'
                    : 'border-border bg-background hover:border-primary-200 hover:bg-primary-50/40'
                )}
              >
                <ClipboardList className="h-4 w-4 shrink-0 text-primary-500" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {selectedTask?.task_title || '选择任务'}
                </span>
                {selectedTask && (
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-text-muted">
                    {selectedTask.quizzes.length} 试卷
                  </span>
                )}
                <ChevronDown className={cn(
                  'h-4 w-4 shrink-0 text-text-muted transition-transform',
                  taskPopoverOpen && 'rotate-180'
                )} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[340px] p-1.5" align="end">
              <div className="max-h-[400px] space-y-1 overflow-y-auto">
                {tasks?.map((task) => {
                  const isActive = selectedTask?.task_id === task.task_id;
                  const totalPending = task.quizzes.reduce((sum, quiz) => sum + quiz.pending_count, 0);

                  return (
                    <button
                      key={task.task_id}
                      onClick={() => handleTaskSelect(task)}
                      className={cn(
                        'w-full rounded-md px-3 py-2.5 text-left transition-colors',
                        isActive ? 'bg-primary-50 text-primary-700' : 'hover:bg-primary-50/70'
                      )}
                    >
                      <div className="line-clamp-1 text-sm font-medium text-foreground">
                        {task.task_title}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-text-muted">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(task.deadline), 'MM/dd HH:mm', { locale: zhCN })}
                        </span>
                        <span>{task.quizzes.length} 份试卷</span>
                        {totalPending > 0 && (
                          <span className="flex items-center gap-1 text-warning-600">
                            <AlertCircle className="h-3 w-3" />
                            {totalPending} 待批阅
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {selectedTask && selectedTask.quizzes.length > 0 && (
        <div className="min-w-[220px] flex-1 sm:flex-none">
          <Popover open={quizPopoverOpen} onOpenChange={setQuizPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  'flex h-10 w-full items-center gap-2 rounded-lg border px-3 text-left transition-colors',
                  quizPopoverOpen
                    ? 'border-primary-500 bg-primary-50/70'
                    : 'border-border bg-background hover:border-primary-200 hover:bg-primary-50/40'
                )}
              >
                {selectedQuiz?.quiz_type === 'EXAM' ? (
                  <GraduationCap className="h-4 w-4 shrink-0 text-destructive-500" />
                ) : (
                  <BookOpen className="h-4 w-4 shrink-0 text-primary-500" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {selectedQuiz?.quiz_title || '选择试卷'}
                </span>
                {selectedQuiz && (
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-text-muted">
                    {selectedQuiz.quiz_type_display}
                  </span>
                )}
                <ChevronDown className={cn(
                  'h-4 w-4 shrink-0 text-text-muted transition-transform',
                  quizPopoverOpen && 'rotate-180'
                )} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[340px] p-0" align="end">
              <div className="flex border-b border-border bg-muted p-1.5">
                {(['all', 'EXAM', 'PRACTICE'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setQuizTypeFilter(type)}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all',
                      quizTypeFilter === type
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-text-muted hover:text-foreground'
                    )}
                  >
                    {type === 'EXAM' && <GraduationCap className="h-3 w-3" />}
                    {type === 'PRACTICE' && <BookOpen className="h-3 w-3" />}
                    {type === 'all' ? '全部' : type === 'EXAM' ? '考试' : '练习'}
                  </button>
                ))}
              </div>
              <div className="max-h-[350px] space-y-1 overflow-y-auto p-1.5">
                {filteredQuizzes.length === 0 ? (
                  <div className="py-8 text-center text-sm text-text-muted">
                    暂无{quizTypeFilter === 'EXAM' ? '考试' : '练习'}类型的试卷
                  </div>
                ) : (
                  filteredQuizzes.map((quiz) => {
                    const isActive = quiz.quiz_id === selectedQuizId;
                    const isExam = quiz.quiz_type === 'EXAM';

                    return (
                      <button
                        key={quiz.quiz_id}
                        onClick={() => handleQuizSelect(quiz)}
                        className={cn(
                          'w-full rounded-md px-3 py-2.5 text-left transition-colors',
                          isActive
                            ? isExam
                              ? 'bg-destructive-50 text-destructive-700'
                              : 'bg-primary-50 text-primary-700'
                            : 'hover:bg-primary-50/70'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {isExam ? (
                            <GraduationCap className="h-4 w-4 text-destructive-500" />
                          ) : (
                            <BookOpen className="h-4 w-4 text-primary-500" />
                          )}
                          <span className="line-clamp-1 flex-1 text-sm font-medium text-foreground">
                            {quiz.quiz_title}
                          </span>
                          {quiz.pending_count > 0 && (
                            <span className="text-[10px] font-medium text-warning-600">
                              {quiz.pending_count} 待批阅
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-text-muted">
                          <span>{quiz.quiz_type_display}</span>
                          <span>{quiz.question_count} 题</span>
                          {quiz.duration && <span>{quiz.duration} 分钟</span>}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  ) : null;

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
        extra={headerControls}
      />

      {/* Main Content */}
      <PageWorkbench>
        {isTaskManagementEntry ? (
          selectedTask && selectedQuizId ? (
            <GradingCenterTab
              taskId={selectedTask.task_id}
              quizId={selectedQuizId}
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
          />
        ) : (
          <div className="flex h-full min-h-[36rem] flex-col rounded-2xl border border-dashed border-border bg-muted">
            <EmptyState
              icon={FileCheck}
              title="请选择任务和试卷"
              description="从上方选择器中选择要批阅的任务和试卷"
            />
          </div>
        )}
      </PageWorkbench>
    </PageFillShell>
  );
};
