import React from 'react';
import {
  Users,
  Cloud,
  Settings,
  ClipboardCheck,
  // Activity / Database / FileCheck 在移除“快捷指令”区块后不再使用
} from 'lucide-react';
import { useMentorDashboard } from '../api/mentor-dashboard';

import { StatCard } from '@/components/ui/stat-card';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import { Skeleton } from '@/components/ui/skeleton';


/**
 * ADMIN DASHBOARD - Flat Design 版本
 *
 * 设计规范：
 * - 无阴影
 * - 无渐变 (no gradient)
 * - 实心背景色
 * - hover:scale 交互反馈
 */
export const AdminDashboard: React.FC = () => {
  const { data, isLoading } = useMentorDashboard();

  if (isLoading) {
    return (
      <PageShell>
        <Skeleton className="h-20 w-1/3 rounded-lg" />
        <div className="grid grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="系统概览"
        icon={<Settings />}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="本月任务"
          value={data?.summary?.monthly_tasks ?? 0}
          icon={ClipboardCheck}
          accentClassName="bg-warning"
          size="sm"
        />
        <StatCard
          title="周活跃用户"
          value={data?.summary?.weekly_active_users ?? 0}
          icon={Users}
          accentClassName="bg-primary"
          size="sm"
        />
        <StatCard
          title="运行时间"
          value="99.9%"
          icon={Cloud}
          accentClassName="bg-cyan-500"
          size="sm"
        />
      </div>
    </PageShell>
  );
};
