import { useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Clock,
  Edit,
  Info,
  Trophy,
  Activity,
  User,
  CheckCircle2,
  AlertCircle,
  Ghost,
  Layers,
  Calendar,
  GraduationCap,
  ClipboardList
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PageShell } from '@/components/ui/page-shell';
import { MetricBadge } from '@/components/common/metric-badge';
import { MicroLabel } from '@/components/common/micro-label';
import { IconBox } from '@/components/common/icon-box';
import { ActionDropdown } from '@/components/common/action-dropdown';

import { useTaskDetail, useStudentLearningTaskDetail } from '../api/get-task-detail';
import dayjs from '@/lib/dayjs';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { cn } from '@/lib/utils';
import { richTextToPreviewText } from '@/lib/rich-text';
import type { LearningTaskQuizItem, TaskQuiz } from '@/types/api';

const assignmentStatusLabelMap: Record<string, string> = {
  IN_PROGRESS: '进行中',
  PENDING_EXAM: '待考试',
  COMPLETED: '已完成',
  OVERDUE: '已逾期',
};

interface KnowledgeListViewItem {
  id: number;
  knowledgeId: number;
  title: string;
  spaceTagName?: string | null;
  contentPreview?: string;
  isCompleted?: boolean;
  completedAt?: string | null;
}

export const TaskDetail: React.FC = () => {
  const { id, role } = useParams<{ id: string; role: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { roleNavigate, getRolePath } = useRoleNavigate();
  const { currentRole, user, isLoading: authLoading } = useAuth();

  const searchParams = new URLSearchParams(location.search);
  const fromDashboard = searchParams.get('from') === 'dashboard';

  const effectiveRole = (role?.toUpperCase() as typeof currentRole) || currentRole;
  const isStudent = !authLoading && effectiveRole === 'STUDENT';

  const taskId = Number(id);
  const isValidTaskId = Number.isFinite(taskId) && taskId > 0;

  const {
    data: task,
    isLoading: taskLoading,
    isError: taskError,
  } = useTaskDetail(taskId, { enabled: isValidTaskId && !authLoading });

  const { data: learningDetail, isLoading: learningLoading } = useStudentLearningTaskDetail(taskId, {
    enabled: Boolean(taskId) && isValidTaskId && isStudent,
  });

  const isLoading = authLoading || !isValidTaskId || taskLoading || (isStudent && learningLoading);

  const knowledgeList: KnowledgeListViewItem[] = useMemo(() => {
    if (!task) return [];

    if (isStudent && learningDetail) {
      return learningDetail.knowledge_items.map((item) => ({
        id: item.id,
        knowledgeId: item.knowledge_id,
        title: item.title || '无标题',
        spaceTagName: item.space_tag_name,
        contentPreview: item.content_preview,
        isCompleted: item.is_completed,
        completedAt: item.completed_at,
      }));
    }

    return (task.knowledge_items ?? []).map((item) => ({
      id: item.id,
      knowledgeId: item.knowledge,
      title: item.knowledge_title || '无标题',
      spaceTagName: item.space_tag_name,
      contentPreview: item.content_preview,
      isCompleted: false,
    }));
  }, [isStudent, learningDetail, task]);

  if (!isValidTaskId) {
    return (
      <PageShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-border/60 bg-background p-12 text-center backdrop-blur-sm">
            <div className="mx-auto mb-6 flex h-16 w-16 rotate-3 items-center justify-center rounded-lg bg-destructive-50 text-destructive-500">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="mb-2 text-xl font-bold tracking-tight text-foreground">Invalid Task ID</h3>
            <p className="mb-8 text-sm leading-relaxed text-text-muted">无法找到指定的任务编号，请检查后重试。</p>
            <Button variant="outline" onClick={() => navigate(-1)} className="w-full">
              返回上一页
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  if (isLoading) {
    return (
      <PageShell className="animate-pulse">
        <div className="flex min-h-16 items-center rounded-2xl border border-border/60 bg-background px-4 lg:px-6">
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <Skeleton className="h-40 w-full rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          </div>
          <div className="space-y-6 lg:col-span-4">
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>
      </PageShell>
    );
  }

  if (taskError || !task) {
    return (
      <PageShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-border/60 bg-background p-12 text-center backdrop-blur-sm">
            <div className="mx-auto mb-6 flex h-16 w-16 -rotate-3 items-center justify-center rounded-lg bg-muted text-text-muted">
              <Ghost className="w-8 h-8" />
            </div>
            <h3 className="mb-2 text-xl font-bold tracking-tight text-foreground">Task Not Found</h3>
            <p className="mb-8 text-sm leading-relaxed text-text-muted">任务不存在或您没有权限查看，请联系管理员。</p>
            <Button variant="outline" onClick={() => roleNavigate('tasks')} className="w-full">
              返回任务中心
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  const myAssignment = task.assignments?.find((a) => a.assignee === user?.id);
  const studentStatus = learningDetail?.status;
  const studentStatusDisplay = learningDetail?.status_display;

  const canStartExam = isStudent
    ? (studentStatus === 'IN_PROGRESS')
    : (!!myAssignment && myAssignment.status === 'IN_PROGRESS');
  const canEditTask = !isStudent && !!task.actions.update && dayjs(task.deadline).isAfter(dayjs());

  const displayQuizzes = isStudent ? (learningDetail?.quiz_items ?? []) : (task.quizzes ?? []);
  const hasKnowledge = knowledgeList.length > 0;
  const hasQuizzes = displayQuizzes.length > 0;


  const handleStartQuiz = (quizId: number, quizType?: string) => {
    if (!isStudent) return;
    const assignmentId = learningDetail?.id;
    if (!assignmentId || !quizId) return;
    if (quizType === 'EXAM' && !canStartExam) return;
    navigate(getRolePath(`quiz/${quizId}?assignment=${assignmentId}&task=${taskId}`));
  };

  const getStatusBadge = () => {
    if (isStudent && studentStatus) {
      const isCompleted = studentStatus === 'COMPLETED';
      return (
        <span className={cn(
          "px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5",
          isCompleted
            ? "bg-secondary-50 text-secondary-600 border-secondary-200"
            : "bg-primary-50 text-primary-600 border-primary-200"
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full", isCompleted ? "bg-secondary-500" : "bg-primary-500 animate-pulse")} />
          {studentStatusDisplay || assignmentStatusLabelMap[studentStatus] || studentStatus}
        </span>
      );
    }
    if (!isStudent && myAssignment) {
      const isCompleted = myAssignment.status === 'COMPLETED';
      return (
        <span className={cn(
          "px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5",
          isCompleted
            ? "bg-secondary-50 text-secondary-600 border-secondary-200"
            : "bg-primary-50 text-primary-600 border-primary-200"
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full", isCompleted ? "bg-secondary-500" : "bg-primary-500")} />
          {assignmentStatusLabelMap[myAssignment.status] || myAssignment.status}
        </span>
      );
    }
    return null;
  };

  return (
    <PageShell className="selection:bg-primary-100 selection:text-primary-700">
      <header className="sticky top-0 z-20 flex flex-col gap-4 rounded-2xl border border-border/60 bg-background px-4 py-4 backdrop-blur-md transition-all duration-300 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => roleNavigate(fromDashboard ? 'dashboard' : 'tasks')}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full p-0 text-text-muted hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="h-4 w-px flex-shrink-0 bg-muted" />
          <h1 className="text-base lg:text-lg font-bold text-foreground truncate tracking-tight" title={task.title}>
            {task.title}
          </h1>
          <div className="hidden sm:block">
            {getStatusBadge()}
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-4 text-sm lg:w-auto lg:flex-shrink-0 lg:justify-end lg:gap-6">
          <div className="hidden md:flex items-center gap-6 text-text-muted">
            <MetricBadge
              icon={<User className="w-3.5 h-3.5" />}
              iconColor="text-muted-foreground"
              label={task.updated_by_name || task.created_by_name}
            />
            <MetricBadge
              icon={<Calendar className="w-3.5 h-3.5" />}
              iconColor="text-muted-foreground"
              label={`${dayjs(task.deadline).format('MM-DD HH:mm')} 截止`}
            />
          </div>

          {canEditTask && (
            <ActionDropdown
              items={[
                {
                  icon: Edit,
                  label: '编辑任务',
                  onClick: () => navigate(getRolePath(`tasks/${taskId}/edit`)),
                },
              ]}
            />
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">

          <div className="lg:col-span-8 space-y-8">

            {task.description && (
              <section className="bg-background rounded-2xl border border-border p-8   transition-all duration-300">
                <MicroLabel icon={<FileText className="w-3 h-3" />} className="mb-4">
                  任务描述
                </MicroLabel>
                <div className="prose prose-sm prose-gray max-w-none">
                  <p className="text-text-muted leading-relaxed whitespace-pre-line text-[15px]">
                    {task.description}
                  </p>
                </div>
              </section>
            )}

            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-3 tracking-tight">
                  <IconBox icon={BookOpen} size="sm" bgColor="bg-primary-50" iconColor="text-primary-600" rounded="lg" />
                  学习资料
                  <span className="text-sm font-medium text-text-muted font-mono bg-muted px-2 py-0.5 rounded-md ml-1">
                    {knowledgeList.length}
                  </span>
                </h3>
              </div>

              {!hasKnowledge ? (
                <div className="bg-background rounded-xl border border-dashed border-border p-12 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Layers className="w-8 h-8 text-text-muted" />
                  </div>
                  <p className="text-text-muted font-medium">暂无学习资料</p>
                  <p className="text-sm text-text-muted mt-1">该任务尚未关联任何知识点</p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {knowledgeList.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => navigate(getRolePath(`knowledge/${item.knowledgeId}?taskKnowledgeId=${item.id}&task=${taskId}`))}
                      className={cn(
                        "group relative bg-background rounded-xl border p-6 transition-all duration-300 cursor-pointer h-[140px] hover:-translate-y-0.5",
                        item.isCompleted
                          ? "border-secondary-100 bg-secondary-50/10"
                          : "border-border hover:border-primary-100"
                      )}
                    >
                      <div className="flex items-center gap-6 h-full">
                        <div className={cn(
                          "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold  transition-colors",
                          item.isCompleted
                            ? "bg-secondary-100 text-secondary-600 ring-4 ring-secondary-50"
                            : "bg-background text-text-muted border border-border group-hover:bg-primary-50 group-hover:text-primary-600 group-hover:border-primary-100"
                        )}>
                          {item.isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-[11px] font-bold px-2 py-0.5 h-5 bg-muted text-text-muted border-border uppercase tracking-wide rounded-full">
                              {item.spaceTagName || '知识文档'}
                            </Badge>
                            <h4 className={cn(
                              "font-bold text-foreground truncate text-lg transition-colors",
                              item.isCompleted ? "text-secondary-900" : "group-hover:text-primary-700"
                            )}>
                              {item.title}
                            </h4>
                          </div>
                          <div className="h-10">
                            {item.contentPreview && (
                              <p className="text-sm text-text-muted line-clamp-2 leading-relaxed group-hover:text-text-muted">
                                {richTextToPreviewText(item.contentPreview)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex-shrink-0 flex items-center justify-end w-[40px]">
                          {/* Zero-Clutter Right Side */}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-6 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-3 tracking-tight">
                  <IconBox icon={Trophy} size="sm" bgColor="bg-warning-50" iconColor="text-warning-600" rounded="lg" />
                  能力考核
                  <span className="text-sm font-medium text-text-muted font-mono bg-muted px-2 py-0.5 rounded-md ml-1">
                    {displayQuizzes.length}
                  </span>
                </h3>
              </div>

              {!hasQuizzes ? (
                <div className="bg-background rounded-xl border border-dashed border-border p-12 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <GraduationCap className="w-8 h-8 text-text-muted" />
                  </div>
                  <p className="text-text-muted font-medium">暂无考核内容</p>
                  <p className="text-sm text-text-muted mt-1">该任务尚未配置任何测验或考试</p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {displayQuizzes.map((item) => {
                    const isExam = item.quiz_type === 'EXAM';
                    const studentQuizItem = isStudent ? item as LearningTaskQuizItem : null;
                    const adminQuizItem = !isStudent ? item as TaskQuiz : null;
                    const isCompleted = studentQuizItem?.is_completed;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleStartQuiz(
                          studentQuizItem ? studentQuizItem.quiz_id : (adminQuizItem?.quiz || 0),
                          item.quiz_type
                        )}
                        className={cn(
                          "group relative bg-background rounded-xl border p-6 transition-all duration-300 h-[140px] cursor-pointer",
                          isCompleted
                            ? "border-secondary-100 bg-secondary-50/10"
                            : "border-border hover:border-primary-100"
                        )}
                      >

                        <div className="flex items-center gap-6 h-full">
                          <div
                            className={cn(
                              "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                              isCompleted
                                ? "bg-secondary-100 text-secondary-600 ring-4 ring-secondary-50"
                                : cn("bg-muted", isExam ? "text-warning-600" : "text-primary-600")
                            )}
                          >
                            {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : (isExam ? <Trophy className="w-6 h-6" /> : <ClipboardList className="w-6 h-6" />)}
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col justify-center space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                              <Badge variant="outline" className={cn(
                                "text-[11px] font-bold px-2 py-0.5 h-5 uppercase tracking-wide border-none rounded-full",
                                isCompleted
                                  ? "bg-secondary-100/50 text-secondary-700"
                                  : (isExam ? "bg-warning-100/50 text-warning-700" : "bg-primary-100/50 text-primary-700")
                              )}>
                                {item.quiz_type_display || (isExam ? '考试' : '测验')}
                              </Badge>
                              <h4 className={cn(
                                "text-lg font-bold tracking-tight leading-none transition-colors",
                                isCompleted ? "text-secondary-900" : "text-foreground"
                              )}>
                                {studentQuizItem?.quiz_title || adminQuizItem?.quiz_title}
                              </h4>
                            </div>

                            <div className="flex flex-wrap gap-4 text-sm text-text-muted font-medium h-5">
                              <div className="flex items-center gap-1.5">
                                <Info className="w-3.5 h-3.5" />
                                <span>{item.question_count} 题</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5" />
                                <span>总分 {item.total_score}</span>
                              </div>
                              {item.duration && (
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>{item.duration} min</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex-shrink-0 w-[120px] flex flex-col items-end justify-center">
                            {isStudent && isCompleted && (
                              <div className="text-[11px] font-bold text-secondary-600 bg-secondary-50 px-3 py-1 rounded-full border border-secondary-100 flex items-center gap-1.5 tracking-tight">
                                得分: <span className="text-sm font-black">{studentQuizItem.score}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <div className="lg:col-span-4 flex h-full flex-col gap-6">

            {isStudent && learningDetail && (
              <div className="bg-background rounded-xl border border-border  p-6 sticky top-24">
                <MicroLabel icon={<Activity className="w-4 h-4 text-primary-500" />} className="mb-6">
                  总体进度
                </MicroLabel>

                <div className="mb-8 text-center relative">
                  <div className="text-6xl font-bold text-foreground mb-2 font-mono tracking-tighter">
                    {learningDetail.progress?.percentage ?? 0}<span className="text-2xl text-text-muted ml-1">%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primary-500 to-primary-600 h-full rounded-full transition-all duration-1000 ease-out relative"
                      style={{ width: `${learningDetail.progress?.percentage ?? 0}%` }}
                    >
                      <div className="absolute inset-0 bg-background animate-[shimmer_2s_infinite]" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {Number(learningDetail.progress?.knowledge_total) > 0 && (
                    <div className="flex justify-between items-center text-sm p-4 bg-muted rounded-xl border border-border">
                      <div className="flex items-center gap-3">
                        <IconBox icon={BookOpen} size="sm" bgColor="bg-primary-100" iconColor="text-primary-600" rounded="lg" hoverScale={false} />
                        <span className="text-text-muted font-medium">知识学习</span>
                      </div>
                      <span className="font-bold text-foreground font-mono">
                        {learningDetail.progress?.knowledge_completed ?? 0} <span className="text-text-muted">/</span> {learningDetail.progress?.knowledge_total ?? 0}
                      </span>
                    </div>
                  )}
                  {Number(learningDetail.progress?.quiz_total) > 0 && (
                    <div className="flex justify-between items-center text-sm p-4 bg-muted rounded-xl border border-border">
                      <div className="flex items-center gap-3">
                        <IconBox icon={Trophy} size="sm" bgColor="bg-warning-100" iconColor="text-warning-600" rounded="lg" hoverScale={false} />
                        <span className="text-text-muted font-medium">测验进度</span>
                      </div>
                      <span className="font-bold text-foreground font-mono">
                        {learningDetail.progress?.quiz_completed ?? 0} <span className="text-text-muted">/</span> {learningDetail.progress?.quiz_total ?? 0}
                      </span>
                    </div>
                  )}
                </div>

                {studentStatus === 'IN_PROGRESS' && (
                  <div className="mt-8 p-4 bg-primary-50/50 rounded-xl border border-primary-100/50 text-sm text-primary-700 flex gap-3">
                    <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-primary-500" />
                    <div>
                      <p className="font-bold text-primary-700 mb-1">当前状态: 进行中</p>
                      <p className="opacity-80 leading-relaxed">
                        请按时完成所有学习内容和考核。加油！
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isStudent && (
              <div className="bg-background rounded-xl border border-border  p-6 sticky top-24">
                <MicroLabel icon={<Info className="w-4 h-4 text-text-muted" />} className="mb-6">
                  任务信息
                </MicroLabel>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-text-muted">截止日期</span>
                    <span className="font-semibold text-foreground bg-muted px-2 py-1 rounded border border-border">
                      {dayjs(task.deadline).format('YYYY-MM-DD HH:mm')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-text-muted">更新人</span>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-text-muted">
                        {(task.updated_by_name || task.created_by_name)?.[0]}
                      </div>
                      <span className="font-semibold text-foreground">{task.updated_by_name || task.created_by_name}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-text-muted">更新时间</span>
                    <span className="font-semibold text-foreground bg-muted px-2 py-1 rounded border border-border">
                      {dayjs(task.updated_at).format('YYYY-MM-DD HH:mm')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-text-muted">知识点数量</span>
                    <span className="font-semibold text-foreground">{task.knowledge_items?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-text-muted">测验数量</span>
                    <span className="font-semibold text-foreground">{task.quizzes?.length || 0}</span>
                  </div>
                </div>

                {canEditTask && (
                  <Button
                    variant="outline"
                    className="w-full mt-8 border-border text-foreground hover:bg-muted hover:text-foreground rounded-lg h-11"
                    onClick={() => navigate(getRolePath(`tasks/${taskId}/edit`))}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    编辑任务配置
                  </Button>
                )}
              </div>
            )}
          </div>
      </div>
    </PageShell>
  );
};
