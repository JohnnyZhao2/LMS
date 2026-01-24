import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * 状态指示点组件
 *
 * 用于显示状态的小圆点，支持动画效果
 *
 * @example
 * <StatusDot variant="primary" />
 * <StatusDot variant="destructive" animate />
 */
export interface StatusDotProps {
  /** 状态变体 */
  variant?:
    | 'primary'
    | 'secondary'
    | 'destructive'
    | 'warning'
    | 'success'
    | 'gray';

  /** 自定义颜色类名（优先级高于 variant） */
  color?: string;

  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';

  /** 是否启用脉冲动画 */
  animate?: boolean;

  /** 自定义类名 */
  className?: string;
}

const variantConfig = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  destructive: 'bg-destructive-500',
  warning: 'bg-warning',
  success: 'bg-secondary',
  gray: 'bg-gray-400',
};

const sizeConfig = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
};

/**
 * 状态指示点组件
 */
export const StatusDot: React.FC<StatusDotProps> = ({
  variant = 'primary',
  color,
  size = 'md',
  animate = false,
  className,
}) => {
  const bgColor = color || variantConfig[variant];

  return (
    <div
      className={cn(
        'rounded-full',
        sizeConfig[size],
        bgColor,
        animate && 'animate-pulse',
        className
      )}
    />
  );
};
