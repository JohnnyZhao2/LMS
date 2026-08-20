import type { TaskExecutionStatus, TaskStatus } from '@/types/common';

export const TASK_EXECUTION_STATUS_META: Record<TaskExecutionStatus, {
  label: string;
  textClassName: string;
  bgClassName: string;
  badgeClassName: string;
  outlineClassName: string;
  dotClassName: string;
}> = {
  NOT_STARTED: {
    label: '未开始',
    textClassName: 'text-text-muted',
    bgClassName: 'bg-muted',
    badgeClassName: 'bg-muted text-text-muted',
    outlineClassName: 'border-border bg-muted/45 text-text-muted',
    dotClassName: 'bg-text-muted',
  },
  IN_PROGRESS: {
    label: '进行中',
    textClassName: 'text-primary-600',
    bgClassName: 'bg-primary-100',
    badgeClassName: 'bg-primary-100/70 text-primary-700',
    outlineClassName: 'border-primary-200 bg-primary-50 text-primary-700',
    dotClassName: 'bg-primary-500',
  },
  PENDING_GRADING: {
    label: '待批改',
    textClassName: 'text-warning',
    bgClassName: 'bg-warning-100',
    badgeClassName: 'bg-warning-100/75 text-warning-700',
    outlineClassName: 'border-warning-200 bg-warning-50 text-warning-700',
    dotClassName: 'bg-warning-500',
  },
  COMPLETED: {
    label: '已完成',
    textClassName: 'text-secondary',
    bgClassName: 'bg-secondary-100',
    badgeClassName: 'bg-secondary-100/70 text-secondary-700',
    outlineClassName: 'border-secondary-200 bg-secondary-50 text-secondary-700',
    dotClassName: 'bg-secondary-500',
  },
  OVERDUE: {
    label: '已逾期',
    textClassName: 'text-destructive',
    bgClassName: 'bg-destructive-100',
    badgeClassName: 'bg-destructive-100/75 text-destructive-700',
    outlineClassName: 'border-destructive-200 bg-destructive-50 text-destructive-700',
    dotClassName: 'bg-destructive-500',
  },
  COMPLETED_ABNORMAL: {
    label: '完成但异常',
    textClassName: 'text-warning',
    bgClassName: 'bg-warning-100',
    badgeClassName: 'bg-warning-100/75 text-warning-700',
    outlineClassName: 'border-warning-200 bg-warning-50 text-warning-700',
    dotClassName: 'bg-warning-500',
  },
};

export const STUDENT_TASK_STATUS_OPTIONS: Array<{ value: TaskStatus; label: string }> = [
  { value: 'NOT_STARTED', label: TASK_EXECUTION_STATUS_META.NOT_STARTED.label },
  { value: 'IN_PROGRESS', label: TASK_EXECUTION_STATUS_META.IN_PROGRESS.label },
  { value: 'PENDING_GRADING', label: TASK_EXECUTION_STATUS_META.PENDING_GRADING.label },
  { value: 'COMPLETED', label: TASK_EXECUTION_STATUS_META.COMPLETED.label },
  { value: 'OVERDUE', label: TASK_EXECUTION_STATUS_META.OVERDUE.label },
];
