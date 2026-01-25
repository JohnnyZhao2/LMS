import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * 分类徽章组件
 *
 * 用于显示任务类型、状态等分类信息的徽章
 *
 * @example
 * <CategoryBadge variant="knowledge" count={5} />
 * <CategoryBadge variant="completed" label="知识" />
 */

const categoryBadgeVariants = cva(
  'inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors',
  {
    variants: {
      variant: {
        knowledge: 'text-secondary-600 bg-secondary-50',      // 知识学习 - 绿色
        practice: 'text-warning-600 bg-warning-50',           // 随堂测验 - 橙色
        exam: 'text-primary-600 bg-primary-50',               // 结业考核 - 蓝色
        completed: 'text-gray-400 bg-gray-50',                // 已完成 - 灰色
        'in-progress': 'text-primary-600 bg-primary-100',     // 进行中 - 蓝色
        overdue: 'text-destructive bg-destructive-100',       // 已逾期 - 红色
        abnormal: 'text-warning bg-warning-100',              // 异常 - 黄色
      },
    },
    defaultVariants: {
      variant: 'knowledge',
    },
  }
);

// 默认标签配置
const defaultLabels: Record<NonNullable<VariantProps<typeof categoryBadgeVariants>['variant']>, string> = {
  knowledge: '知识',
  practice: '测验',
  exam: '考试',
  completed: '已完成',
  'in-progress': '进行中',
  overdue: '已逾期',
  abnormal: '异常',
};

export interface CategoryBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof categoryBadgeVariants> {
  /** 显示文本（如果不提供，使用默认文本） */
  label?: string;

  /** 数量（可选，显示在文本后面） */
  count?: number;
}

/**
 * 分类徽章组件
 */
export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  variant = 'knowledge',
  label,
  count,
  className,
  ...props
}) => {
  const displayLabel = label || defaultLabels[variant ?? 'knowledge'];

  return (
    <span
      className={cn(categoryBadgeVariants({ variant }), className)}
      {...props}
    >
      {count !== undefined ? `${count} ${displayLabel}` : displayLabel}
    </span>
  );
};
