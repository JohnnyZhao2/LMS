import { useMemo, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Edit,
  Ghost,
  GraduationCap,
  Info,
  Layers,
  Trophy,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { IconBox } from '@/components/common/icon-box';
import { MicroLabel } from '@/components/common/micro-label';
import { PageFillShell, PageShell, PageSplit } from '@/components/ui/page-shell';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/stores/auth-context';
import { useCurrentRole } from '@/hooks/use-current-role';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { formatListDateTime } from '@/lib/date-time';
import dayjs from '@/lib/dayjs';
import { richTextToPlainText } from '@/lib/rich-text';
import { formatScore } from '@/lib/score';
import { cn } from '@/lib/utils';
import type { LearningTaskQuizItem, TaskQuiz } from '@/types/task';

import { useStudentLearningTaskDetail, useTaskDetail } from '../api/get-task-detail';

const assignmentStatusLabelMap: Record<string, string> = {
  IN_PROGRESS: '进行中',
  COMPLETED: '已完成',
  OVERDUE: '已逾期',
};

interface KnowledgeListViewItem {
  id: number;
  knowledgeId?: number | null;
  title: string;
  isCompleted?: boolean;
}

type TaskQuizViewItem = LearningTaskQuizItem | TaskQuiz;

const TaskStatusBadge: React.FC<{
  status: string;
  label: string;
}> = ({ status, label }) => {
  const isCompleted = status === 'COMPLETED';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
        isCompleted
          ? 'border-secondary-200 bg-secondary-50 text-secondary-700'
          : 'border-primary-200 bg-primary-50 text-primary-700',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          isCompleted ? 'bg-secondary-500' : 'bg-primary-500',
        )}
      />
      {label}
    </span>
  );
};

const TaskSectionHeader: React.FC<{
  icon: LucideIcon;
  title: string;
  iconBgClassName: string;
  iconColorClassName: string;
}> = ({ icon, title, iconBgClassName, iconColorClassName }) => (
  <div className="flex items-center gap-3">
    <IconBox
      icon={icon}
      size="sm"
      bgColor={iconBgClassName}
      iconColor={iconColorClassName}
      rounded="lg"
      hoverScale={false}
    />
    <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
  </div>
);

const TaskInfoRow: React.FC<{
  label: string;
  value: ReactNode;
}> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 border-b border-border/60 py-3.5 last:border-b-0 last:pb-0">
    <span className="text-xs leading-5 text-text-muted">{label}</span>
    <div className="min-w-0 text-right text-xs font-medium leading-5 text-foreground">{value}</div>
  </div>
);

const TaskEmptyState: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}> = ({ icon: Icon, title, description }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/15 px-6 py-10 text-center">
    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-background text-text-muted">
      <Icon className="h-5 w-5" />
    </div>
    <p className="text-sm font-medium text-foreground">{title}</p>
    <p className="mt-1 text-sm text-text-muted">{description}</p>
  </div>
);

const TaskNodeCard: React.FC<{
  index: number;
  title: string;
  meta?: ReactNode;
  metaSeparated?: boolean;
  status?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'default' | 'success' | 'warning';
}> = ({ index, title, meta, metaSeparated = false, status, onClick, disabled = false, tone = 'default' }) => {
  const interactive = Boolean(onClick) && !disabled;

  const toneClassName = {
    default: 'border-border/70 bg-background hover:border-primary-200 hover:shadow-[0_12px_28px_rgba(59,130,246,0.08)]',
    success: 'border-secondary-200/80 bg-secondary-50/30 hover:border-secondary-300 hover:shadow-[0_12px_28px_rgba(22,163,74,0.08)]',
    warning: 'border-border/70 bg-background hover:border-warning-200 hover:shadow-[0_12px_28px_rgba(245,158,11,0.08)]',
  }[tone];

  const content = (
    <div
      className={cn(
        'group flex min-h-[92px] h-full flex-col rounded-[20px] border px-4 py-3.5 text-left transition-all',
        toneClassName,
        interactive && 'cursor-pointer hover:-translate-y-0.5',
        disabled && 'cursor-not-allowed opacity-60 hover:translate-y-0 hover:shadow-none',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold tabular-nums tracking-[0.16em] text-text-muted/80">
          {String(index + 1).padStart(2, '0')}
        </span>
        {status && (
          <div className="text-right text-[11px] font-semibold leading-5 text-text-muted">
            {status}
          </div>
        )}
      </div>

      <div className="mt-2 min-w-0 flex-1">
        <h4 className="line-clamp-2 text-[15px] font-semibold leading-5 text-foreground">{title}</h4>

        {meta && (
          metaSeparated ? (
            <div className="mt-3 border-t border-border/60 pt-2.5 text-xs leading-5 text-text-muted">
              {meta}
            </div>
          ) : (
            <p className="mt-1 truncate text-xs leading-5 text-text-muted">
              {meta}
            </p>
          )
        )}
      </div>
    </div>
  );

  if (interactive) {
    return (
      <button type="button" onClick={onClick} className="h-full w-full text-left">
        {content}
      </button>
    );
  }

  return content;
};

export const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string; role: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { roleNavigate, getRolePath } = useRoleNavigate();
  const currentRole = useCurrentRole();
  const { user, isLoading: authLoading } = useAuth();

  const searchParams = new URLSearchParams(location.search);
  const fromDashboard = searchParams.get('from') === 'dashboard';

  const isStudent = !authLoading && currentRole === 'STUDENT';

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
        isCompleted: item.is_completed,
      }));
    }

    return (task.knowledge_items ?? []).map((item) => ({
      id: item.id,
      knowledgeId: item.knowledge,
      title: item.knowledge_title || '无标题',
      isCompleted: false,
    }));
  }, [isStudent, learningDetail, task]);

  if (!isValidTaskId) {
    return (
      <PageShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-border/60 bg-background p-12 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 rotate-3 items-center justify-center rounded-lg bg-destructive-50 text-destructive-500">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h3 className="mb-2 text-xl font-bold tracking-tight text-foreground">任务编号无效</h3>
            <p className="mb-8 text-sm leading-relaxed text-text-muted">无法找到指定任务，请检查后重试。</p>
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
      <PageFillShell>
        <div className="space-y-3">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-5 w-[28rem] max-w-full rounded-lg" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <PageSplit className="min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <Skeleton className="h-full min-h-[36rem] rounded-2xl" />
            <Skeleton className="h-full min-h-[28rem] rounded-2xl" />
          </PageSplit>
        </div>
      </PageFillShell>
    );
  }

  if (taskError || !task) {
    return (
      <PageShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-border/60 bg-background p-12 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 -rotate-3 items-center justify-center rounded-lg bg-muted text-text-muted">
              <Ghost className="h-8 w-8" />
            </div>
            <h3 className="mb-2 text-xl font-bold tracking-tight text-foreground">任务不存在</h3>
            <p className="mb-8 text-sm leading-relaxed text-text-muted">任务不存在或您没有权限查看。</p>
            <Button variant="outline" onClick={() => roleNavigate('tasks')} className="w-full">
              返回任务中心
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  const myAssignment = task.assignments?.find((assignment) => assignment.assignee === user?.id);
  const studentStatus = learningDetail?.status;
  const studentStatusDisplay = learningDetail?.status_display;

  const canStartExam = isStudent
    ? studentStatus === 'IN_PROGRESS'
    : Boolean(myAssignment && myAssignment.status === 'IN_PROGRESS');
  const canEditTask = !isStudent && Boolean(task.actions.update) && dayjs(task.deadline).isAfter(dayjs());

  const displayQuizzes: TaskQuizViewItem[] = isStudent
    ? (learningDetail?.quiz_items ?? [])
    : (task.quizzes ?? []);
  const practiceQuizzes = displayQuizzes.filter((item) => item.quiz_type !== 'EXAM');
  const examQuizzes = displayQuizzes.filter((item) => item.quiz_type === 'EXAM');
  const hasKnowledge = knowledgeList.length > 0;
  const hasPractice = practiceQuizzes.length > 0;
  const hasExam = examQuizzes.length > 0;
  const descriptionText = task.description ? richTextToPlainText(task.description).trim() : '';
  const hasDescription = Boolean(descriptionText);
  const statusValue = isStudent
    ? studentStatus
    : myAssignment?.status;
  const statusLabel = isStudent
    ? (studentStatusDisplay || (studentStatus ? assignmentStatusLabelMap[studentStatus] : ''))
    : (myAssignment ? assignmentStatusLabelMap[myAssignment.status] || myAssignment.status : '');
  const totalNodeCount = knowledgeList.length + practiceQuizzes.length + examQuizzes.length;

  const handleStartQuiz = (quizId: number, quizType?: string) => {
    if (!isStudent) return;
    const assignmentId = learningDetail?.id;
    if (!assignmentId || !quizId) return;
    if (quizType === 'EXAM' && !canStartExam) return;
    navigate(getRolePath(`quiz/${quizId}?assignment=${assignmentId}&task=${taskId}`));
  };

  const getQuizMetaText = (item: TaskQuizViewItem) =>
    [
      `${item.question_count} 题`,
      `总分 ${formatScore(item.total_score)}`,
      item.duration ? `参考 ${item.duration} 分钟` : null,
      item.quiz_type === 'EXAM' && item.pass_score ? `及格 ${formatScore(item.pass_score)}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

  return (
    <PageFillShell className="gap-4 selection:bg-primary-100 selection:text-primary-700">
      <section className={cn('flex gap-3', hasDescription ? 'items-start' : 'items-center')}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => roleNavigate(fromDashboard ? 'dashboard' : 'tasks')}
          className="flex h-8 w-8 shrink-0 rounded-full p-0 text-text-muted hover:bg-background hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className={cn('min-w-0', hasDescription ? 'space-y-1' : '')}>
          <h1 className="truncate text-[18px] font-semibold tracking-tight text-foreground">
            {task.title}
          </h1>
          {descriptionText && (
            <p className="line-clamp-2 max-w-4xl text-sm leading-6 text-text-muted">
              {descriptionText}
            </p>
          )}
        </div>
      </section>

      <div className="flex min-h-0 flex-1 flex-col">
        <PageSplit className="min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-background">
            <div className="shrink-0 border-b border-border/60 px-5 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <MicroLabel>任务结构</MicroLabel>
                <span className="text-xs font-medium text-text-muted">{totalNodeCount}</span>
              </div>
            </div>

            <ScrollContainer as="div" className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-7 px-5 py-5">
                <section className="space-y-3">
                  <TaskSectionHeader
                    icon={BookOpen}
                    title="学习资料"
                    iconBgClassName="bg-primary-50"
                    iconColorClassName="text-primary-600"
                  />

                  {!hasKnowledge ? (
                    <TaskEmptyState
                      icon={Layers}
                      title="暂无学习资料"
                      description="当前任务还没有配置学习资料。"
                    />
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                      {knowledgeList.map((item, index) => (
                        <TaskNodeCard
                          key={item.id}
                          index={index}
                          title={item.title}
                          status={
                            item.isCompleted ? (
                              <span className="inline-flex items-center gap-1 text-secondary-700">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                已完成
                              </span>
                            ) : null
                          }
                          tone={item.isCompleted ? 'success' : 'default'}
                          onClick={() => navigate(getRolePath(`knowledge/${item.knowledgeId ?? item.id}?taskKnowledgeId=${item.id}&task=${taskId}`))}
                        />
                      ))}
                    </div>
                  )}
                </section>

                {(hasPractice || hasExam) ? (
                  <>
                    {hasPractice && (
                      <section className="space-y-3">
                        <TaskSectionHeader
                          icon={ClipboardList}
                          title="测验"
                          iconBgClassName="bg-primary-50"
                          iconColorClassName="text-primary-600"
                        />

                        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                          {practiceQuizzes.map((item, index) => {
                            const studentQuizItem = isStudent ? (item as LearningTaskQuizItem) : null;
                            const adminQuizItem = !isStudent ? (item as TaskQuiz) : null;
                            const isCompleted = Boolean(studentQuizItem?.is_completed);
                            const quizId = studentQuizItem ? studentQuizItem.quiz_id : (adminQuizItem?.quiz ?? 0);
                            const title = studentQuizItem?.quiz_title || adminQuizItem?.quiz_title || '未命名测验';

                            return (
                              <TaskNodeCard
                                key={item.id}
                                index={index}
                                title={title}
                                meta={getQuizMetaText(item)}
                                metaSeparated
                                status={
                                  isStudent
                                    ? isCompleted
                                      ? (
                                        <span className="inline-flex items-center gap-1 text-secondary-700">
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                          {studentQuizItem?.score ?? '--'} 分
                                        </span>
                                      )
                                      : null
                                    : null
                                }
                                tone={isCompleted ? 'success' : 'default'}
                                onClick={isStudent && quizId ? () => handleStartQuiz(quizId, item.quiz_type) : undefined}
                              />
                            );
                          })}
                        </div>
                      </section>
                    )}

                    {hasExam && (
                      <section className="space-y-3">
                        <TaskSectionHeader
                          icon={Trophy}
                          title="考试"
                          iconBgClassName="bg-warning-50"
                          iconColorClassName="text-warning-600"
                        />

                        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                          {examQuizzes.map((item, index) => {
                            const studentQuizItem = isStudent ? (item as LearningTaskQuizItem) : null;
                            const adminQuizItem = !isStudent ? (item as TaskQuiz) : null;
                            const isCompleted = Boolean(studentQuizItem?.is_completed);
                            const isDisabled = Boolean(isStudent && !canStartExam && !isCompleted);
                            const quizId = studentQuizItem ? studentQuizItem.quiz_id : (adminQuizItem?.quiz ?? 0);
                            const title = studentQuizItem?.quiz_title || adminQuizItem?.quiz_title || '未命名考试';

                            return (
                              <TaskNodeCard
                                key={item.id}
                                index={index}
                                title={title}
                                meta={getQuizMetaText(item)}
                                metaSeparated
                                status={
                                  isStudent
                                    ? isCompleted
                                      ? (
                                        <span className="inline-flex items-center gap-1 text-secondary-700">
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                          {studentQuizItem?.score ?? '--'} 分
                                        </span>
                                      )
                                      : isDisabled
                                        ? <span className="text-warning-700">待解锁</span>
                                        : null
                                    : null
                                }
                                tone={isCompleted ? 'success' : 'warning'}
                                disabled={isDisabled}
                                onClick={isStudent && quizId && !isDisabled ? () => handleStartQuiz(quizId, item.quiz_type) : undefined}
                              />
                            );
                          })}
                        </div>
                      </section>
                    )}
                  </>
                ) : (
                  <section className="space-y-3">
                    <TaskSectionHeader
                      icon={GraduationCap}
                      title="考核"
                      iconBgClassName="bg-warning-50"
                      iconColorClassName="text-warning-600"
                    />
                    <TaskEmptyState
                      icon={GraduationCap}
                      title="暂无考核内容"
                      description="当前任务还没有配置测验或考试。"
                    />
                  </section>
                )}
              </div>
            </ScrollContainer>
          </section>

          <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-background">
            <div className="shrink-0 border-b border-border/60 px-5 py-5">
              <MicroLabel icon={<Info className="h-4 w-4 text-text-muted" />}>
                任务信息
              </MicroLabel>
              {statusValue && statusLabel && (
                <div className="mt-4">
                  <TaskStatusBadge status={statusValue} label={statusLabel} />
                </div>
              )}
            </div>

            <ScrollContainer as="aside" className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-6 px-5 py-5">
                {isStudent && learningDetail && (
                  <section className="space-y-4 rounded-2xl border border-primary-100/80 bg-primary-50/35 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[13px] font-semibold text-foreground">学习进度</p>
                        <p className="mt-1.5 text-[22px] font-semibold text-foreground">
                          {learningDetail.progress?.percentage ?? 0}
                          <span className="ml-1 text-xs font-medium text-text-muted">%</span>
                        </p>
                      </div>
                      <IconBox
                        icon={Activity}
                        size="sm"
                        bgColor="bg-primary-100"
                        iconColor="text-primary-600"
                        rounded="lg"
                        hoverScale={false}
                      />
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-primary-100">
                      <div
                        className="h-full rounded-full bg-primary-500 transition-[width] duration-700"
                        style={{ width: `${learningDetail.progress?.percentage ?? 0}%` }}
                      />
                    </div>

                    <div className="space-y-0">
                      {Number(learningDetail.progress?.knowledge_total) > 0 && (
                        <TaskInfoRow
                          label="学习资料"
                          value={`${learningDetail.progress?.knowledge_completed ?? 0} / ${learningDetail.progress?.knowledge_total ?? 0}`}
                        />
                      )}
                      {Number(learningDetail.progress?.practice_total) > 0 && (
                        <TaskInfoRow
                          label="测验"
                          value={`${learningDetail.progress?.practice_completed ?? 0} / ${learningDetail.progress?.practice_total ?? 0}`}
                        />
                      )}
                      {Number(learningDetail.progress?.exam_total) > 0 && (
                        <TaskInfoRow
                          label="考试"
                          value={`${learningDetail.progress?.exam_completed ?? 0} / ${learningDetail.progress?.exam_total ?? 0}`}
                        />
                      )}
                    </div>
                  </section>
                )}

                <section>
                  <div className="space-y-0">
                    <TaskInfoRow
                      label="截止日期"
                      value={dayjs(task.deadline).format('YYYY-MM-DD HH:mm')}
                    />
                    <TaskInfoRow
                      label="最后更新"
                      value={task.updated_by_name || task.created_by_name}
                    />
                    <TaskInfoRow
                      label="更新时间"
                      value={formatListDateTime(task.updated_at)}
                    />
                  </div>
                </section>

                <section className="pt-2">
                  {canEditTask && (
                    <Button
                      variant="outline"
                      className="w-full rounded-xl border-border/80 hover:bg-muted"
                      onClick={() => navigate(getRolePath(`tasks/${taskId}/edit`))}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      编辑任务配置
                    </Button>
                  )}
                </section>
              </div>
            </ScrollContainer>
          </aside>
        </PageSplit>
      </div>
    </PageFillShell>
  );
};
