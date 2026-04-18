import * as React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  FileCheck,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Clock,
  User,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PageFillShell, PageShell, PageWorkbench } from '@/components/ui/page-shell';
import { useTaskDetail } from '@/entities/task/api/get-task-detail';
import { formatScore } from '@/lib/score';
import { cn } from '@/lib/utils';
import { ProgressMonitoringTab } from './progress-monitoring-tab';
import { GradingCenterTab } from '@/entities/grading/components/grading-center-tab';
import dayjs from '@/lib/dayjs';
import { useAuth } from '@/session/auth/auth-context';

export const TaskPreviewPage: React.FC = () => {
  const { id, role } = useParams<{ id: string; role: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasCapability } = useAuth();
  const taskId = Number(id);
  const isTaskManagementEntry = searchParams.get('entry') === 'task-management';

  const { data: task, isLoading } = useTaskDetail(taskId);
  const canViewProgress = !!task && (task.actions.update || task.actions.analytics);
  const canViewGrading = !!task && task.actions.view && hasCapability('grading.view');
  const availableTabs = React.useMemo(
    () => [
      canViewProgress ? 'progress' : null,
      canViewGrading ? 'grading' : null,
    ].filter(Boolean) as string[],
    [canViewGrading, canViewProgress],
  );
  const [activeTab, setActiveTab] = React.useState(() => {
    const requestedTab = searchParams.get('tab') || 'progress';
    return availableTabs.includes(requestedTab) ? requestedTab : (availableTabs[0] ?? 'progress');
  });
  const [selectedQuizId, setSelectedQuizId] = React.useState<number | null>(null);

  const quizzes = React.useMemo(() => task?.quizzes || [], [task]);
  const hasMultipleQuizzes = quizzes.length > 1;
  const activeQuizId = (selectedQuizId && quizzes.some((q) => q.task_quiz_id === selectedQuizId))
    ? selectedQuizId
    : (quizzes[0]?.task_quiz_id ?? null);

  React.useEffect(() => {
    if (activeTab === 'grading' && !selectedQuizId && quizzes.length > 0) {
      setSelectedQuizId(quizzes[0].task_quiz_id);
    }
  }, [activeTab, quizzes, selectedQuizId]);

  React.useEffect(() => {
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0] ?? 'progress');
    }
  }, [activeTab, availableTabs]);

  React.useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab !== activeTab) {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.set('tab', activeTab);
      setSearchParams(nextSearchParams, { replace: true });
    }
  }, [activeTab, searchParams, setSearchParams]);

  const handleTabChange = (value: string) => {
    if (!availableTabs.includes(value)) {
      return;
    }
    setActiveTab(value);
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('tab', value);
    setSearchParams(nextSearchParams);
  };

  if (isLoading) {
    return (
      <PageShell>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </PageShell>
    );
  }

  if (!task) {
    return (
      <PageShell>
        <div className="flex h-96 flex-col items-center justify-center text-text-muted">
          <p>任务不存在</p>
          <Button variant="outline" onClick={() => navigate(`/${role}/tasks`)} className="mt-4">
            返回任务列表
          </Button>
        </div>
      </PageShell>
    );
  }

  if (availableTabs.length === 0) {
    return (
      <PageShell>
        <div className="flex h-96 flex-col items-center justify-center text-text-muted">
          <p>无权访问当前页面</p>
          <Button variant="outline" onClick={() => navigate(`/${role}/tasks`)} className="mt-4">
            返回任务列表
          </Button>
        </div>
      </PageShell>
    );
  }

  const Shell = PageFillShell;

  return (
    <Shell className="gap-4">
      <div className="flex min-w-0 flex-col gap-4 pb-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/${role}/tasks`)}
              className="mt-0.5 h-10 w-10 rounded-lg transition-colors duration-150 hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5 text-text-muted" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">{task.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted font-medium mt-1">
                <span className="inline-flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  创建人 {task.created_by_name}
                </span>
                {task.updated_by_name && (
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    更新人 {task.updated_by_name}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  截止 {dayjs(task.deadline).format('YYYY-MM-DD HH:mm')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {!isTaskManagementEntry && availableTabs.length > 1 && (
          <div className="flex w-full justify-start lg:w-auto lg:justify-end">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="border-0 bg-muted/60 p-1 rounded-lg">
                {canViewProgress && (
                  <TabsTrigger
                    value="progress"
                    className="flex items-center gap-2 px-4 py-2 rounded-md after:hidden data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                  >
                    <BarChart3 className="h-4 w-4" />
                    进度监控
                  </TabsTrigger>
                )}
                {canViewGrading && (
                  <TabsTrigger
                    value="grading"
                    className="flex items-center gap-2 px-4 py-2 rounded-md after:hidden data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                  >
                    <FileCheck className="h-4 w-4" />
                    阅卷中心
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          </div>
        )}
      </div>

      {activeTab === 'progress' ? (
        <PageWorkbench className="gap-4">
          <ProgressMonitoringTab taskId={taskId} />
        </PageWorkbench>
      ) : (
        <PageWorkbench className="gap-6">
          <div className="space-y-6">
            {hasMultipleQuizzes ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {quizzes.map((quiz) => {
                  const isActive = quiz.task_quiz_id === activeQuizId;
                  const isExam = quiz.quiz_type === 'EXAM';

                  return (
                    <button
                      key={quiz.id}
                      onClick={() => setSelectedQuizId(quiz.task_quiz_id)}
                      className={cn(
                        'group relative flex flex-col items-start overflow-hidden rounded-xl border-2 p-4 text-left transition-all duration-200',
                        isActive
                          ? isExam
                            ? 'border-destructive-500 bg-destructive-50/30 ring-4 ring-destructive-100'
                            : 'border-primary-500 bg-primary-50/30 ring-4 ring-primary-100'
                          : 'border-white bg-background hover:border-border'
                      )}
                    >
                      {isActive && (
                        <div
                          className={cn(
                            'absolute top-0 right-0 rounded-bl-xl p-1.5 text-white',
                            isExam ? 'bg-destructive-500' : 'bg-primary-500'
                          )}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}

                      <div className="mb-3 flex items-center gap-2">
                        <Badge
                          className={cn(
                            'rounded-md border-none px-2 py-0.5 text-[10px] font-bold tracking-wider',
                            isExam
                              ? 'bg-destructive-100 text-destructive-700 group-hover:bg-destructive-200'
                              : 'bg-primary-100 text-primary-700 group-hover:bg-primary-200'
                          )}
                        >
                          {isExam ? <GraduationCap className="w-3 h-3 mr-1" /> : <BookOpen className="w-3 h-3 mr-1" />}
                          {quiz.quiz_type_display || (isExam ? '考试' : '测验')}
                        </Badge>
                        <div className="flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                          <Clock className="w-3 h-3 mr-1" />
                          {quiz.duration ? `参考${quiz.duration}分` : '未设参考时间'}
                        </div>
                      </div>

                      <h3 className="mb-2 line-clamp-2 text-lg font-bold leading-tight text-foreground">
                        {quiz.quiz_title}
                      </h3>

                      <div className="mt-auto flex w-full items-center justify-between border-t border-border/50 pt-2 text-xs text-text-muted">
                        <span>{quiz.question_count} 道题目</span>
                        <span className="font-mono font-medium">总分: {formatScore(quiz.total_score)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-4">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full',
                    quizzes[0]?.quiz_type === 'EXAM'
                      ? 'bg-destructive-100 text-destructive-600'
                      : 'bg-primary-100 text-primary-600'
                  )}
                >
                  {quizzes[0]?.quiz_type === 'EXAM' ? <GraduationCap className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-foreground">{quizzes[0]?.quiz_title || '试卷详情'}</h2>
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                      {quizzes[0]?.quiz_type_display}
                    </Badge>
                  </div>
                  <div className="mt-0.5 text-xs text-text-muted">
                    共 {quizzes[0]?.question_count} 道题目 · 总分 {formatScore(quizzes[0]?.total_score)}
                  </div>
                </div>
              </div>
            )}

            {quizzes.find((q) => q.task_quiz_id === activeQuizId)?.quiz_type !== 'EXAM' && (
              <div className="flex items-start gap-3 rounded-xl border border-primary-100 bg-primary-50 p-3 text-sm text-primary-700">
                <div className="mt-0.5">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold">提示：</span>
                  当前选择的是测验试卷。通常此类试卷主要用于学员自测，题目多为客观题（系统自动评分）。请重点关注“考试”类型的试卷进行人工批阅。
                </div>
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <GradingCenterTab taskId={taskId} quizId={activeQuizId} />
          </div>
        </PageWorkbench>
      )}
    </Shell>
  );
};
