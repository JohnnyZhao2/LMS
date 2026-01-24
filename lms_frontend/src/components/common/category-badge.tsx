import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * 分类徽章组件
 *
 * 用于显示任务类型、状态等分类信息的徽章
 *
 * @example
 * <CategoryBadge variant="knowledge" count={5} />
 * <CategoryBadge variant="completed" label="已完成" />
 */
export interface CategoryBadgeProps {
  /** 徽章变体类型 */
  variant:
    | 'knowledge'      // 知识学习 - 绿色
    | 'practice'       // 随堂测验 - 橙色
    | 'exam'           // 结业考核 - 蓝色
    | 'completed'      // 已完成 - 灰色
    | 'in-progress'    // 进行中 - 蓝色
    | 'overdue'        // 已逾期 - 红色
    | 'abnormal';      // 异常 - 黄色

  /** 显示文本（如果不提供，使用默认文本） */
  label?: string;

  /** 数量（可选，显示在文本后面） */
  count?: number;

  /** 自定义类名 */
  className?: string;
}

const variantConfig: Record<
  CategoryBadgeProps['variant'],
  { label: string; textClass: string; bgClass: string }
> = {
  knowledge: {
    label: '知识',
    textClass: 'text-secondary-600',
    bgClass: 'bg-secondary-50',
  },
  practice: {
    label: '测验',
    textClass: 'text-warning-600',
    bgClass: 'bg-warning-50',
  },
  exam: {
    label: '考试',
    textClass: 'text-primary-600',
    bgClass: 'bg-primary-50',
  },
  completed: {
    label: '已完成',
    textClass: 'text-gray-400',
    bgClass: 'bg-gray-50',
  },
  'in-progress': {
    label: '进行中',
    textClass: 'text-primary-600',
    bgClass: 'bg-primary-100',
  },
  overdue: {
    label: '已逾期',
    textClass: 'text-destructive',
    bgClass: 'bg-destructive-100',
  },
  abnormal: {
    label: '异常',
    textClass: 'text-warning',
    bgClass: 'bg-warning-100',
  },
};

/**
 * 分类徽章组件
 */
export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  variant,
  label,
  count,
  className,
}) => {
  const config = variantConfig[variant];
  const displayLabel = label || config.label;

  return (
    <span
      className={cn(
        'inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors',
        config.textClass,
        config.bgClass,
        className
      )}
    >
      {count !== undefined ? `${count} ${displayLabel}` : displayLabel}
    </span>
  );
};
