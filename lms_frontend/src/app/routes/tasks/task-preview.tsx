import * as React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  FileCheck,
  User,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PageFillShell, PageShell, PageWorkbench } from '@/components/ui/page-shell';
import { useTaskAnalytics } from '@/api/grading/task-analytics';
import { useTaskDetail } from '@/features/tasks/api/get-task-detail';
import { ProgressMonitoringTab } from '@/features/tasks/components/task-preview/progress-monitoring-tab';
import { TaskOverviewStrip } from '@/features/tasks/components/task-preview/task-overview-strip';
import {
  GradingCenterTab,
  type GradingCenterSelectorConfig,
  type GradingSelectorQuizOption,
} from '@/features/grading/components/grading-center-tab';
import dayjs from '@/lib/dayjs';
import { ROUTES } from '@/config/routes';

export const TaskPreviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tasksPath = ROUTES.TASKS;
  const taskId = Number(id);
  const isTaskManagementEntry = searchParams.get('entry') === 'task-management';

  const { data: task, isLoading } = useTaskDetail(taskId);
  const canViewProgress = Boolean(task?.actions.analytics);
  const canViewGrading = Boolean(task?.actions.grading);
  const availableTabs = React.useMemo(
    () => [
      canViewProgress ? 'progress' : null,
      canViewGrading ? 'grading' : null,
    ].filter(Boolean) as string[],
    [canViewGrading, canViewProgress],
  );
  const requestedTab = searchParams.get('tab') === 'grading' ? 'grading' : 'progress';
  const activeTab = !task || availableTabs.length === 0
    ? requestedTab
    : availableTabs.includes(requestedTab)
      ? requestedTab
      : availableTabs[0];
  const {
    data: analytics,
    isLoading: analyticsLoading,
    isError: analyticsError,
  } = useTaskAnalytics(taskId || 0, {
    enabled: Boolean(taskId) && canViewProgress && activeTab === 'progress',
  });
  const [selectedQuizId, setSelectedQuizId] = React.useState<number | null>(null);

  const quizzes = React.useMemo<GradingSelectorQuizOption[]>(
    () => (task?.quizzes ?? []).map((quiz) => ({
      quiz_id: quiz.id,
      quiz_title: quiz.quiz_title,
    })),
    [task?.quizzes],
  );
  const activeQuizId = (selectedQuizId && quizzes.some((quiz) => quiz.quiz_id === selectedQuizId))
    ? selectedQuizId
    : (quizzes[0]?.quiz_id ?? null);

  const gradingSelectorConfig = React.useMemo<GradingCenterSelectorConfig | undefined>(() => {
    if (!task) {
      return undefined;
    }
    return {
      quizzes,
      selectedQuizId: activeQuizId,
      onQuizSelect: (quiz) => {
        setSelectedQuizId(quiz.quiz_id);
      },
    };
  }, [activeQuizId, quizzes, task]);

  React.useEffect(() => {
    if (isLoading || !task || availableTabs.length === 0) {
      return;
    }
    if (availableTabs.includes(requestedTab)) {
      return;
    }
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('tab', availableTabs[0]);
    setSearchParams(nextSearchParams, { replace: true });
  }, [availableTabs, isLoading, requestedTab, searchParams, setSearchParams, task]);

  const handleTabChange = (value: string) => {
    if (!availableTabs.includes(value)) {
      return;
    }
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
          <Button variant="outline" onClick={() => navigate(tasksPath)} className="mt-4">
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
          <Button variant="outline" onClick={() => navigate(tasksPath)} className="mt-4">
            返回任务列表
          </Button>
        </div>
      </PageShell>
    );
  }

  const showOverviewInHeader = activeTab === 'progress' && canViewProgress;
  const showTabSwitcher = !isTaskManagementEntry && availableTabs.length > 1;

  return (
    <PageFillShell className="gap-4">
      <div className="flex min-w-0 flex-col gap-4 pb-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(tasksPath)}
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

        {(showOverviewInHeader || showTabSwitcher) && (
          <div className="flex w-full flex-wrap items-center gap-6 lg:w-auto lg:justify-end">
            {showOverviewInHeader && (
              analyticsLoading ? (
                <Skeleton className="h-11 w-[460px] max-w-full rounded-lg" />
              ) : analytics ? (
                <TaskOverviewStrip analytics={analytics} />
              ) : null
            )}

            {showTabSwitcher && (
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
            )}
          </div>
        )}
      </div>

      {activeTab === 'progress' ? (
        <PageWorkbench className="gap-4">
          <ProgressMonitoringTab
            taskId={taskId}
            analytics={analytics}
            isLoading={analyticsLoading}
            isError={analyticsError}
          />
        </PageWorkbench>
      ) : (
        <PageWorkbench>
          <GradingCenterTab
            taskId={taskId}
            quizId={activeQuizId}
            selectorConfig={gradingSelectorConfig}
          />
        </PageWorkbench>
      )}
    </PageFillShell>
  );
};
