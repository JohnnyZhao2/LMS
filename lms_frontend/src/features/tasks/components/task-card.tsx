import * as React from 'react';
import { useRoleNavigate } from '@/hooks/use-role-navigate';

import { ErrorBoundary } from '@/components/ui/error-boundary';
import { CategoryBadge } from '@/components/common/category-badge';
import { StatusDot } from '@/components/common/status-dot';

import type { StudentTaskCenterItem } from '@/types/api';
import dayjs from '@/lib/dayjs';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: StudentTaskCenterItem;
}

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
    ? { bgClass: 'bg-primary', label: '综合任务' }
    : hasQuiz
      ? { bgClass: 'bg-primary-500', label: '考核任务' }
      : { bgClass: 'bg-secondary', label: '知识任务' };

  const targetTaskId = task.task_id;
  const progress = task.progress;
  const now = dayjs();
  const deadline = dayjs(task.deadline);
  const isUrgent = deadline.isAfter(now) && deadline.diff(now, 'hour') <= 48;

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
          <div className="flex items-center gap-2">
            <StatusDot
              color={isUrgent ? 'bg-destructive-500' : missionConfig.bgClass}
              animate={isUrgent}
            />
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              {isUrgent ? '紧急任务' : missionConfig.label}
            </span>
          </div>
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
            {(progress.knowledge_total ?? 0) > 0 && (
              <CategoryBadge
                variant={(progress.knowledge_completed ?? 0) >= (progress.knowledge_total ?? 0) ? 'completed' : 'knowledge'}
                label={(progress.knowledge_completed ?? 0) >= (progress.knowledge_total ?? 0) ? '知识' : undefined}
                count={progress.knowledge_total}
              />
            )}
            {(progress.practice_total ?? 0) > 0 && (
              <CategoryBadge
                variant={(progress.practice_completed ?? 0) >= (progress.practice_total ?? 0) ? 'completed' : 'practice'}
                label={(progress.practice_completed ?? 0) >= (progress.practice_total ?? 0) ? '测验' : undefined}
                count={progress.practice_total}
              />
            )}
            {(progress.exam_total ?? 0) > 0 && (
              <CategoryBadge
                variant={(progress.exam_completed ?? 0) >= (progress.exam_total ?? 0) ? 'completed' : 'exam'}
                label={(progress.exam_completed ?? 0) >= (progress.exam_total ?? 0) ? '考试' : undefined}
                count={progress.exam_total}
              />
            )}
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
              missionConfig.bgClass
            )}
            style={{ width: `${progress.percentage ?? 0}%` }}
          />
        </div>
      </div>
    </div>
  );
};
