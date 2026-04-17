import * as React from 'react';
import { useRoleNavigate } from '@/hooks/use-role-navigate';

import { ErrorBoundary } from '@/components/ui/error-boundary';

import type { StudentTaskCenterItem } from '@/types/task';
import dayjs from '@/lib/dayjs';
import { cn } from '@/lib/utils';
import { ListTag } from '@/components/ui/list-tag';

interface TaskCardProps {
  task: StudentTaskCenterItem;
}

const taskCategoryBadgeClassMap = {
  knowledge: 'bg-secondary-100/70 text-text-muted',
  practice: 'bg-warning-100/70 text-text-muted',
  exam: 'bg-primary-100/70 text-text-muted',
  completed: 'bg-muted/85 text-text-muted',
} as const;

const TaskStatusDot: React.FC<{
  color: string;
  animate?: boolean;
}> = ({ color, animate = false }) => (
  <div
    className={cn(
      'h-1.5 w-1.5 rounded-full',
      color,
      animate && 'animate-pulse'
    )}
  />
);

const TaskCategoryBadge: React.FC<{
  count: number;
  label: string;
  variant: keyof typeof taskCategoryBadgeClassMap;
}> = ({ count, label, variant }) => (
  <ListTag
    size="xs"
    className={cn(
      'transition-colors',
      taskCategoryBadgeClassMap[variant]
    )}
  >
    {count} {label}
  </ListTag>
);

/**
 * 任务卡片组件 - Flat Design 版本
 *
 * 设计规范：
 * - 无阴影
 * - 无渐变 (no gradient)
 * - 实心背景色
 * - hover:scale 交互反馈
 * - rounded-lg 圆角
 */
export const TaskCard: React.FC<TaskCardProps> = ({ task }) => (
  <ErrorBoundary>
    <TaskCardContent task={task} />
  </ErrorBoundary>
);

const TaskCardContent: React.FC<TaskCardProps> = ({ task }) => {
  const { roleNavigate } = useRoleNavigate();
  const hasQuiz = task.has_quiz;
  const hasKnowledge = task.has_knowledge;
  const progressBarClass = hasQuiz && hasKnowledge
    ? 'bg-primary'
    : hasQuiz
      ? 'bg-primary-500'
      : 'bg-secondary';

  const targetTaskId = task.task_id;
  const progress = task.progress;
  const now = dayjs();
  const deadline = dayjs(task.deadline);
  const isUrgent = deadline.isAfter(now) && deadline.diff(now, 'hour') <= 48;
  const progressBadges = [
    {
      key: 'knowledge',
      total: progress.knowledge_total ?? 0,
      completed: progress.knowledge_completed ?? 0,
      label: '知识',
      variant: 'knowledge' as const,
    },
    {
      key: 'practice',
      total: progress.practice_total ?? 0,
      completed: progress.practice_completed ?? 0,
      label: '测验',
      variant: 'practice' as const,
    },
    {
      key: 'exam',
      total: progress.exam_total ?? 0,
      completed: progress.exam_completed ?? 0,
      label: '考试',
      variant: 'exam' as const,
    },
  ].filter((item) => item.total > 0);

  return (
    <div
      className={cn(
        'group relative flex h-[188px] cursor-pointer flex-col rounded-2xl border border-border/50 bg-background p-5 transition-all duration-200 hover:-translate-y-0.5',
        task.status === 'COMPLETED' && 'border-transparent bg-muted'
      )}
      onClick={() => roleNavigate(`tasks/${targetTaskId}`)}
    >
      <div className="min-h-0 flex-1">
        <div className="mb-2.5 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <h3 className="line-clamp-2 text-[17px] font-semibold leading-[1.35] tracking-[-0.015em] text-foreground transition-colors group-hover:text-primary-600">
            {task.task_title}
          </h3>
          <div className="flex shrink-0 items-center gap-2.5 text-[10.5px] font-semibold tracking-[0.01em] text-text-muted">
            <div className="max-w-[5.5rem] truncate">
              {task.created_by_name || '发布人'}
            </div>
            <div className="shrink-0">
              {dayjs(task.deadline).format('YYYY-MM-DD')}
            </div>
            {isUrgent ? (
              <div className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-destructive-600">
                <TaskStatusDot color="bg-destructive-500" animate />
                紧急
              </div>
            ) : null}
          </div>
        </div>
        <p className="line-clamp-2 text-[13px] font-medium leading-[1.5] text-text-muted/80">
          {task.task_description || '此任务暂无描述...'}
        </p>
      </div>

      <div className="mt-auto space-y-3.5">
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {progressBadges.map((item) => {
              const isCompleted = item.completed >= item.total;
              return (
                <TaskCategoryBadge
                  key={item.key}
                  count={item.total}
                  label={item.label}
                  variant={isCompleted ? 'completed' : item.variant}
                />
              );
            })}
          </div>
          <span className="shrink-0 text-[15px] font-semibold leading-none text-foreground">
            {progress.percentage ?? 0}
            <span className="ml-0.5 text-[11px] font-medium">%</span>
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700 ease-out',
              progressBarClass
            )}
            style={{ width: `${progress.percentage ?? 0}%` }}
          />
        </div>
      </div>
    </div>
  );
};
