import React from 'react';
import { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * Material You 操作卡片组件
 * 用于快捷操作、功能入口等场景
 */
interface ActionCardProps {
  /** 标题 */
  title: string;
  /** 描述 */
  description?: string;
  /** 图标 */
  icon: LucideIcon;
  /** 点击跳转路径 */
  route?: string;
  /** 点击回调 */
  onClick?: () => void;
  /** 图标背景色变体 */
  iconVariant?: 'primary' | 'success' | 'warning' | 'error' | 'tertiary';
  /** 自定义类名 */
  className?: string;
}

/**
 * 操作卡片组件 - Material You 风格
 */
export const ActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  icon: Icon,
  route,
  onClick,
  iconVariant = 'primary',
  className,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (route) {
      navigate(route);
    } else if (onClick) {
      onClick();
    }
  };

  const iconBgClasses = {
    primary: 'bg-md-primary/10 text-md-primary',
    success: 'bg-md-success/10 text-md-success',
    warning: 'bg-md-warning/10 text-md-warning',
    error: 'bg-md-error/10 text-md-error',
    tertiary: 'bg-md-tertiary/10 text-md-tertiary',
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group relative bg-md-surface-container p-6 rounded-3xl shadow-md-1',
        'border border-md-outline-variant hover:border-md-primary',
        'hover:shadow-md-2 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]',
        'cursor-pointer overflow-hidden hover:scale-[1.02] hover:-translate-y-1',
        className
      )}
    >
      {/* 装饰性模糊形状背景 */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-md-primary/5 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-4">
        <div className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center',
          'transition-transform duration-300 group-hover:scale-110',
          iconBgClasses[iconVariant]
        )}>
          <Icon className="w-7 h-7" />
        </div>
        <div>
          <div className="text-lg font-medium text-md-on-surface-container mb-1 group-hover:text-md-primary transition-colors duration-300">
            {title}
          </div>
          {description && (
            <div className="text-xs font-normal text-md-on-surface-variant uppercase tracking-wide">
              {description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
