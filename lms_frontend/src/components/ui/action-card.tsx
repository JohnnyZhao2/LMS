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

  const iconBgColors = {
    primary: 'bg-blue-600 text-white',
    success: 'bg-emerald-500 text-white',
    warning: 'bg-amber-500 text-white',
    error: 'bg-red-600 text-white',
    tertiary: 'bg-amber-500 text-white',
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group relative bg-white p-6 rounded-lg border-2 border-gray-200',
        'hover:border-blue-600 transition-all duration-200',
        'cursor-pointer hover:scale-[1.02]',
        className
      )}
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <div className="flex flex-col gap-4">
        <div className={cn(
          'w-14 h-14 rounded-md flex items-center justify-center',
          'transition-transform duration-200 group-hover:scale-110',
          iconBgColors[iconVariant]
        )}>
          <Icon className="w-7 h-7" />
        </div>
        <div>
          <div className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors duration-200">
            {title}
          </div>
          {description && (
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
