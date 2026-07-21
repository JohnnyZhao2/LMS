import * as React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 图标容器组件
 *
 * 统一的图标展示容器，支持不同尺寸、颜色和形状
 *
 * @example
 * <IconBox icon={Users} size="md" bgColor="bg-primary-50" iconColor="text-primary" />
 * <IconBox icon={BookOpen} size="lg" bgColor="bg-secondary-100" iconColor="text-secondary" rounded="full" />
 */
export interface IconBoxProps {
  /** 图标组件 */
  icon: LucideIcon;

  /** 容器尺寸 */
  size?: 'sm' | 'md' | 'lg' | 'xl';

  /** 背景颜色类名 */
  bgColor: string;

  /** 图标颜色类名 */
  iconColor: string;

  /** 圆角大小 */
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';

  /** 是否启用 hover 缩放效果 */
  hoverScale?: boolean;

  /** 自定义类名 */
  className?: string;
}

const sizeConfig = {
  sm: {
    container: 'w-8 h-8',
    icon: 'h-4 w-4',
  },
  md: {
    container: 'w-12 h-12',
    icon: 'h-6 w-6',
  },
  lg: {
    container: 'w-14 h-14',
    icon: 'h-7 w-7',
  },
  xl: {
    container: 'w-16 h-16',
    icon: 'h-8 w-8',
  },
};

const roundedConfig = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-lg',
  full: 'rounded-full',
};

/**
 * 图标容器组件
 */
export const IconBox: React.FC<IconBoxProps> = ({
  icon: Icon,
  size = 'md',
  bgColor,
  iconColor,
  rounded = 'md',
  hoverScale = true,
  className,
}) => {
  const sizeClasses = sizeConfig[size];
  const roundedClass = roundedConfig[rounded];

  return (
    <div
      className={cn(
        'flex items-center justify-center transition-transform duration-200',
        sizeClasses.container,
        roundedClass,
        bgColor,
        hoverScale && 'group-hover:scale-110',
        className
      )}
    >
      <Icon className={cn(sizeClasses.icon, iconColor)} />
    </div>
  );
};
