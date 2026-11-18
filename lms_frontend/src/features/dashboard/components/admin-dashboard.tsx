import React from 'react';
import {
  Users,
  Cloud,
  ClipboardCheck,
} from 'lucide-react';
import { useAdminDashboard } from '../api/admin-dashboard';
import { ExamReportPanel } from './exam-report-panel';

import { StatCard } from '@/components/ui/stat-card';
import { PageWorkbench } from '@/components/ui/page-shell';
import { Skeleton } from '@/components/ui/skeleton';


/**
 * ADMIN DASHBOARD - Flat Design 版本
 */
export const AdminDashboard: React.FC = () => {
  const { data, isLoading } = useAdminDashboard();

  return (
    <PageWorkbench className="gap-4">
      {isLoading ? (
        <>
          <div className="grid shrink-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
          <Skeleton className="min-h-0 flex-1 rounded-lg" />
        </>
      ) : (
        <>
          <div className="grid shrink-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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

          <div className="flex min-h-0 flex-1 flex-col">
            <ExamReportPanel />
          </div>
        </>
      )}
    </PageWorkbench>
  );
};
