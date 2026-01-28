import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokenStorage } from '@/lib/token-storage';

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
}) => {
  const { role: urlRole } = useParams<{ role: string }>();

  // 获取带角色前缀的 dashboard 路径
  const getDashboardPath = () => {
    const role = urlRole || tokenStorage.getCurrentRole();
    return role ? `/${role.toLowerCase()}/dashboard` : '/dashboard';
  };

  return (
    <div className={cn(
      "flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5",
      className
    )}>
      <div className="flex flex-col gap-1.5">
        {/* 面包屑 */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase mb-1">
            <Link to={getDashboardPath()} className="text-text-muted hover:text-primary-500 transition-colors">
              <Home className="w-3 h-3" />
            </Link>
            {breadcrumbs.map((item, index) => (
              <React.Fragment key={index}>
                <ChevronRight className="w-2.5 h-2.5 text-text-muted" />
                {item.path ? (
                  <Link
                    to={item.path}
                    className="flex items-center gap-1 text-text-muted hover:text-primary-500 transition-colors"
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
        <div className="flex items-center gap-4">
          {icon && (
            <div className="w-14 h-14 bg-primary-600 rounded-xl flex items-center justify-center transition-transform duration-200 hover:scale-105 shadow-sm">
              {React.isValidElement<{ className?: string }>(icon) ? React.cloneElement(icon, {
                className: cn(icon.props.className, "text-white w-7 h-7")
              }) : icon}
            </div>
          )}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-none" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm font-semibold text-text-muted uppercase tracking-wider mt-1.5 flex items-center gap-2.5 leading-none" style={{ fontFamily: "'Outfit', sans-serif" }}>
                <span className="w-5 h-1 bg-primary-600 rounded-full" />
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 操作区 */}
      {extra && (
        <div className="flex items-center gap-3 self-end md:self-auto">
          {extra}
        </div>
      )}
    </div>
  );
};


