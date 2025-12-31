import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Material You 空状态组件
 * 用于显示空列表、无数据等状态
 */
interface EmptyStateProps {
  /** 图标 */
  icon?: LucideIcon | React.ReactNode;
  /** 主标题 */
  title?: string;
  /** 描述文字 */
  description: string;
  /** 副描述（可选） */
  subDescription?: string;
  /** 自定义类名 */
  className?: string;
  /** 图标大小 */
  iconSize?: 'sm' | 'md' | 'lg';
  /** 子元素（用于添加操作按钮等） */
  children?: React.ReactNode;
}

/**
 * 空状态组件 - Material You 风格
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  subDescription,
  className,
  iconSize = 'md',
  children,
}) => {
  const iconSizes = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 text-center',
      className
    )}>
      {Icon && (
        <div className={cn(
          'mb-4 transform hover:scale-110 transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]',
          'text-md-on-surface-variant/40'
        )}>
          {React.isValidElement(Icon) ? (
            React.cloneElement(Icon as React.ReactElement<{ className?: string }>, {
              className: cn(iconSizes[iconSize], Icon.props.className),
            })
          ) : typeof Icon === 'function' ? (
            <Icon className={iconSizes[iconSize]} />
          ) : (
            Icon
          )}
        </div>
      )}
      {title && (
        <h3 className="text-2xl font-medium text-md-on-surface-container mb-2">
          {title}
        </h3>
      )}
      <p className="text-md-on-surface-variant font-normal">
        {description}
      </p>
      {subDescription && (
        <p className="text-sm text-md-on-surface-variant/60 mt-1 font-normal">
          {subDescription}
        </p>
      )}
      {children}
    </div>
  );
};
