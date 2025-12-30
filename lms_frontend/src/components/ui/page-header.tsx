import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  title: string;
  path?: string;
  icon?: React.ReactNode;
}

export interface PageHeaderProps {
  /** 页面标题 */
  title: string;
  /** 副标题/描述 (英文版或小标题) */
  subtitle?: string;
  /** 面包屑导航 */
  breadcrumbs?: BreadcrumbItem[];
  /** 右侧操作区 */
  extra?: React.ReactNode;
  /** 标题前的图标 */
  icon?: React.ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 是否应用渐进式入场动画 */
  reveal?: boolean;
}

/**
 * 页面头部组件 - 极致美学版
 * 包含：
 * 1. 现代排版 (Outfit font + Tracking tight)
 * 2. 动态图标背景
 * 3. 玻璃拟态面包屑 (可选)
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  extra,
  icon,
  className = '',
  reveal = true,
}) => {
  return (
    <div className={cn(
      "flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 px-2",
      reveal && "reveal-item",
      className
    )}>
      <div className="flex flex-col gap-4">
        {/* 面包屑 */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase">
            <Link to="/dashboard" className="text-gray-400 hover:text-primary-500 transition-colors">
              <Home className="w-3.5 h-3.5" />
            </Link>
            {breadcrumbs.map((item, index) => (
              <React.Fragment key={index}>
                <ChevronRight className="w-3 h-3 text-gray-300" />
                {item.path ? (
                  <Link
                    to={item.path}
                    className="flex items-center gap-1 text-gray-400 hover:text-primary-500 transition-colors"
                  >
                    {item.title}
                  </Link>
                ) : (
                  <span className="text-primary-500">{item.title}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* 标题区域 */}
        <div className="flex items-center gap-6">
          {icon && (
            <div className="w-20 h-20 bg-gradient-to-br from-clay-primary to-clay-secondary rounded-3xl flex items-center justify-center shadow-clay-btn relative overflow-hidden group animate-breathe">
              {React.isValidElement<{ className?: string }>(icon) ? React.cloneElement(icon, {
                className: cn(icon.props.className, "text-white w-10 h-10 relative z-10")
              }) : icon}
            </div>
          )}
          <div>
            <h2 className="text-4xl md:text-5xl font-black text-clay-foreground tracking-tighter leading-none font-display">
              {title}
            </h2>
            {subtitle && (
              <p className="text-lg font-bold text-clay-muted uppercase tracking-widest mt-2 flex items-center gap-3 leading-none italic opacity-60">
                <span className="w-10 h-[3px] bg-clay-primary/30 rounded-full" />
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 操作区 */}
      {extra && (
        <div className="flex items-center gap-3">
          {extra}
        </div>
      )}
    </div>
  );
};


