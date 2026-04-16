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
  knowledge: 'border-secondary-200 text-secondary-700',
  practice: 'border-warning-200 text-warning-700',
  exam: 'border-primary-200 text-primary-700',
  completed: 'border-border/80 text-muted-foreground',
} as const;

const TaskStatusDot: React.FC<{
  color: string;
  animate?: boolean;
}> = ({ color, animate = false }) => (
  <div
    className={cn(
      'h-2 w-2 rounded-full',
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

  const missionConfig = hasQuiz && hasKnowledge
    ? { barClass: 'bg-primary', tagClass: 'border-primary-200 text-primary-700', label: '综合任务' }
    : hasQuiz
      ? { barClass: 'bg-primary-500', tagClass: 'border-primary-200 text-primary-700', label: '考核任务' }
      : { barClass: 'bg-secondary', tagClass: 'border-secondary-200 text-secondary-700', label: '知识任务' };

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
        'group relative flex h-[210px] cursor-pointer flex-col rounded-2xl border border-border/50 bg-background p-6 transition-all duration-300 hover:-translate-y-1',
        task.status === 'COMPLETED' && 'border-transparent bg-muted'
      )}
      onClick={() => roleNavigate(`tasks/${targetTaskId}`)}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ListTag
            className={cn(
              isUrgent
                ? 'border-destructive-200 text-destructive-700'
                : missionConfig.tagClass
            )}
          >
            <TaskStatusDot
              color={isUrgent ? 'bg-destructive-500' : missionConfig.barClass}
              animate={isUrgent}
            />
            {isUrgent ? '紧急任务' : missionConfig.label}
          </ListTag>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-[11px] font-bold text-text-muted">
            {task.created_by_name || '发布人'}
          </div>
          <div className="text-[11px] font-bold text-text-muted">
            {dayjs(task.deadline).format('YYYY-MM-DD')}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <h3 className="mb-1 truncate text-xl font-black leading-tight text-foreground transition-colors group-hover:text-primary-600">
          {task.task_title}
        </h3>
        <p className="truncate text-[14px] font-medium text-text-muted/80">
          {task.task_description || '此任务暂无描述...'}
        </p>
      </div>

      <div className="mt-auto space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
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
          <span className="text-base font-black text-foreground">
            {progress.percentage ?? 0}
            <span className="ml-0.5 text-xs">%</span>
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700 ease-out',
              missionConfig.barClass
            )}
            style={{ width: `${progress.percentage ?? 0}%` }}
          />
        </div>
      </div>
    </div>
  );
};
