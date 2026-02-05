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
 * 页面头部组件
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  breadcrumbs,
  extra,
  icon,
  className = '',
}) => {
  const { role: urlRole } = useParams<{ role: string }>();

  const getDashboardPath = () => {
    const role = urlRole || tokenStorage.getCurrentRole();
    return role ? `/${role.toLowerCase()}/dashboard` : '/dashboard';
  };

  return (
    <div className={cn(
      "flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8",
      className
    )}>
      <div className="flex flex-col gap-1">
        {/* 面包屑导航 */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-text-muted mb-2">
            <Link
              to={getDashboardPath()}
              className="hover:text-foreground transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
            </Link>
            {breadcrumbs.map((item, index) => (
              <React.Fragment key={index}>
                <ChevronRight className="w-3 h-3 text-border" />
                {item.path ? (
                  <Link
                    to={item.path}
                    className="hover:text-foreground transition-colors"
                  >
                    {item.title}
                  </Link>
                ) : (
                  <span className="text-foreground font-medium">{item.title}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* 标题区域 */}
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex items-center justify-center text-text-muted">
              {React.isValidElement<{ className?: string }>(icon) ? React.cloneElement(icon, {
                className: cn(icon.props.className, "w-6 h-6")
              }) : icon}
            </div>
          )}
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {title}
          </h1>
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


