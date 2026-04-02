import * as React from 'react';
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
  const [selectedTask, setSelectedTask] = React.useState<PendingTask | null>(null);
  const [selectedQuizId, setSelectedQuizId] = React.useState<number | null>(null);
  const [taskPopoverOpen, setTaskPopoverOpen] = React.useState(false);
  const [quizPopoverOpen, setQuizPopoverOpen] = React.useState(false);
  const [quizTypeFilter, setQuizTypeFilter] = React.useState<QuizTypeFilter>('all');

  const { data: tasks, isLoading } = usePendingQuizzes();

  // 自动选择第一个任务和试卷
  React.useEffect(() => {
    if (tasks && tasks.length > 0 && !selectedTask) {
      const firstTask = tasks[0];
      setSelectedTask(firstTask);
      if (firstTask.quizzes.length > 0) {
        setSelectedQuizId(firstTask.quizzes[0].quiz_id);
      }
    }
  }, [tasks, selectedTask]);

  const handleTaskSelect = (task: PendingTask) => {
    setSelectedTask(task);
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

  const headerControls = tasks && tasks.length > 0 ? (
    <div className="flex flex-wrap items-center justify-end gap-4">
      <Popover open={taskPopoverOpen} onOpenChange={setTaskPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 transition-all',
              'min-w-[200px] max-w-[280px] bg-background hover:bg-muted',
              taskPopoverOpen ? 'border-primary-500 ring-2 ring-primary-100' : 'border-border'
            )}
          >
            <ClipboardList className="h-4 w-4 shrink-0 text-primary-500" />
            <div className="min-w-0 flex-1 text-left">
              <div className="truncate text-sm font-medium text-foreground">
                {selectedTask?.task_title || '选择任务'}
              </div>
              {selectedTask && (
                <div className="text-[10px] text-text-muted">
                  {selectedTask.quizzes.length} 份试卷
                </div>
              )}
            </div>
            <ChevronDown className={cn(
              'h-4 w-4 text-text-muted transition-transform',
              taskPopoverOpen && 'rotate-180'
            )} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-2" align="end">
          <div className="max-h-[400px] space-y-1 overflow-y-auto">
            {tasks.map((task) => {
              const isActive = selectedTask?.task_id === task.task_id;
              const totalPending = task.quizzes.reduce((sum, q) => sum + q.pending_count, 0);

              return (
                <button
                  key={task.task_id}
                  onClick={() => handleTaskSelect(task)}
                  className={cn(
                    'w-full rounded-lg border p-3 text-left transition-all',
                    isActive
                      ? 'border-primary-200 bg-primary-50'
                      : 'border-transparent hover:bg-muted'
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
                    <span>·</span>
                    <span>{task.quizzes.length} 份试卷</span>
                  </div>
                  {totalPending > 0 && (
                    <div className="mt-1.5 flex items-center gap-1 text-[11px] text-warning-600">
                      <AlertCircle className="h-3 w-3" />
                      <span>{totalPending} 道主观题待批阅</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {selectedTask && selectedTask.quizzes.length > 0 && (
        <Popover open={quizPopoverOpen} onOpenChange={setQuizPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 transition-all',
                'min-w-[200px] max-w-[280px] bg-background hover:bg-muted',
                quizPopoverOpen ? 'border-primary-500 ring-2 ring-primary-100' : 'border-border'
              )}
            >
              {selectedQuiz?.quiz_type === 'EXAM' ? (
                <GraduationCap className="h-4 w-4 shrink-0 text-destructive-500" />
              ) : (
                <BookOpen className="h-4 w-4 shrink-0 text-primary-500" />
              )}
              <div className="min-w-0 flex-1 text-left">
                <div className="truncate text-sm font-medium text-foreground">
                  {selectedQuiz?.quiz_title || '选择试卷'}
                </div>
                {selectedQuiz && (
                  <div className="text-[10px] text-text-muted">
                    {selectedQuiz.quiz_type_display} · {selectedQuiz.question_count} 题
                  </div>
                )}
              </div>
              <ChevronDown className={cn(
                'h-4 w-4 text-text-muted transition-transform',
                quizPopoverOpen && 'rotate-180'
              )} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0" align="end">
            <div className="flex border-b border-border bg-muted p-2">
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
            <div className="max-h-[350px] space-y-1 overflow-y-auto p-2">
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
                        'w-full rounded-lg border p-3 text-left transition-all',
                        isActive
                          ? isExam
                            ? 'border-destructive-200 bg-destructive-50'
                            : 'border-primary-200 bg-primary-50'
                          : 'border-transparent hover:bg-muted'
                      )}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        {isExam ? (
                          <GraduationCap className="h-4 w-4 text-destructive-500" />
                        ) : (
                          <BookOpen className="h-4 w-4 text-primary-500" />
                        )}
                        <span className={cn(
                          'rounded px-1.5 py-0.5 text-[10px] font-bold',
                          isExam
                            ? 'bg-destructive-100 text-destructive-700'
                            : 'bg-primary-100 text-primary-700'
                        )}>
                          {quiz.quiz_type_display}
                        </span>
                        {quiz.duration && (
                          <span className="flex items-center gap-0.5 text-[10px] text-text-muted">
                            <Clock className="h-3 w-3" />
                            {quiz.duration}分
                          </span>
                        )}
                      </div>
                      <div className="line-clamp-1 text-sm font-medium text-foreground">
                        {quiz.quiz_title}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-text-muted">
                        <span>{quiz.question_count} 题</span>
                        {quiz.pending_count > 0 && (
                          <span className="font-medium text-warning-600">
                            {quiz.pending_count} 待批阅
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>
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
        <Skeleton className="h-[600px] rounded-xl" />
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
        {!tasks || tasks.length === 0 ? (
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
