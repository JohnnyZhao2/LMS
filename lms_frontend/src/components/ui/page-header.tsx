import React from 'react';
import { BreadcrumbNav, type BreadcrumbItem } from '@/components/ui/breadcrumb-nav';
import { cn } from '@/lib/utils';
import { getWorkspaceHome } from '@/app/workspace-config';
import { useCurrentRole } from '@/hooks/use-current-role';

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
  className = '',
}) => {
  const currentRole = useCurrentRole();
  const dashboardPath = getWorkspaceHome(currentRole) ?? '/dashboard';

  return (
    <div className={cn(
      'flex flex-col justify-between gap-4 md:flex-row md:items-start',
      className
    )}>
      <div className="flex min-w-0 flex-col gap-2.5">
        {/* 面包屑导航 */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <BreadcrumbNav
            items={breadcrumbs}
            homePath={dashboardPath}
            className="mb-1"
          />
        )}

        {/* 标题区域 */}
        <div className="min-w-0">
          <h1 className="truncate text-[28px] font-semibold leading-none tracking-[-0.045em] text-foreground md:text-[30px]">
            {title}
          </h1>
        </div>
      </div>

      {/* 操作区 */}
      {extra && (
        <div className="flex w-full flex-wrap items-center gap-3 md:w-auto md:justify-end md:self-end">
          {extra}
        </div>
      )}
    </div>
  );
};
