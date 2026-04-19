import React from 'react';
import { BreadcrumbNav, type BreadcrumbItem } from '@/components/ui/breadcrumb-nav';
import { cn } from '@/lib/utils';
import { useCurrentRole } from '@/session/hooks/use-current-role';
import { getWorkspaceHome } from '@/session/workspace/role-paths';

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
  breadcrumbs,
  extra,
  className = '',
}) => {
  const currentRole = useCurrentRole();
  const dashboardPath = getWorkspaceHome(currentRole) ?? '/dashboard';
  const hasBreadcrumbs = Boolean(breadcrumbs?.length);

  if (!hasBreadcrumbs && !extra) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between',
        className,
      )}
    >
      {hasBreadcrumbs ? (
        <BreadcrumbNav
          items={breadcrumbs ?? []}
          homePath={dashboardPath}
          className="min-w-0"
        />
      ) : (
        <div className="hidden md:block" />
      )}

      {extra && (
        <div className="flex w-full flex-wrap items-center justify-end gap-3 md:w-auto">
          {extra}
        </div>
      )}
    </div>
  );
};
