import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * 指标徽章组件
 *
 * 用于显示统计数据、元信息等指标的徽章
 *
 * @example
 * <MetricBadge icon={<User className="w-3.5 h-3.5" />} label="张三" />
 * <MetricBadge variant="primary" label="5 道题目" />
 */

const metricBadgeVariants = cva(
  'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-muted border-border text-foreground',
        primary: 'bg-primary-50 border-primary-100 text-primary-700',
        secondary: 'bg-secondary-50 border-secondary-100 text-secondary-700',
        success: 'bg-secondary-50 border-secondary-200 text-secondary-700',
        warning: 'bg-warning-50 border-warning-200 text-warning-700',
        destructive: 'bg-destructive-50 border-destructive-200 text-destructive-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface MetricBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof metricBadgeVariants> {
  /** 显示文本 */
  label: string;

  /** 图标（可选） */
  icon?: React.ReactNode;

  /** 图标颜色类名（可选） */
  iconColor?: string;
}

/**
 * 指标徽章组件
 */
export const MetricBadge: React.FC<MetricBadgeProps> = ({
  variant = 'default',
  label,
  icon,
  iconColor = 'text-muted-foreground',
  className,
  ...props
}) => {
  return (
    <div
      className={cn(metricBadgeVariants({ variant }), className)}
      {...props}
    >
      {icon && <span className={iconColor}>{icon}</span>}
      <span>{label}</span>
    </div>
  );
};
