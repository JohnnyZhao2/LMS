import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * 操作卡片组件 - Claymorphism 风格
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
  /** 图标颜色 (Tailwind class 如 'text-primary-500') */
  iconColor?: string;
  /** 图标背景色 (Tailwind class 如 'bg-primary-50') */
  iconBg?: string;
  /** 自定义类名 */
  className?: string;
}

/**
 * 操作卡片组件 - Claymorphism 风格
 * 统一的毛玻璃效果 + Clay 阴影
 */
export const ActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  icon: Icon,
  route,
  onClick,
  iconColor = 'text-[#3B82F6]',
  iconBg = 'bg-[#DBEAFE]',
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

  return (
    <div
      onClick={handleClick}
      className={cn(
        // Flat Design 统一样式
        'group relative bg-white p-6 rounded-lg',
        'hover:scale-[1.02]',
        'transition-all duration-200 cursor-pointer overflow-hidden',
        className
      )}
    >
      {/* 装饰性背景圆 */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#F3F4F6] rounded-full translate-x-10 -translate-y-10 opacity-50 group-hover:scale-110 transition-transform duration-500" />

      <div className="relative z-10 flex flex-col gap-4">
        <div className={cn(
          'w-14 h-14 rounded-lg flex items-center justify-center',
          'transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110',
          iconBg
        )}>
          <Icon className={cn('w-7 h-7', iconColor)} />
        </div>
        <div>
          <div className="text-lg font-bold text-[#111827] mb-1 group-hover:text-[#3B82F6] transition-colors duration-200">
            {title}
          </div>
          {description && (
            <div className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
              {description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
