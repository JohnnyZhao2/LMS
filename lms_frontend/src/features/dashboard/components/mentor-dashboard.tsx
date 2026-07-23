import React from 'react';
import {
  CheckCircle,
  FileCheck,
  FileSearch,
  Plus,
  Send,
  Trophy,
  Users,
  Layout,
  GraduationCap
} from 'lucide-react';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/lib/auth-context';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { StatCard } from '@/components/ui/stat-card';
import { PageHeader } from '@/components/ui/page-header';
import { PageFillShell, PageWorkbench } from '@/components/ui/page-shell';
import { Skeleton } from '@/components/ui/skeleton';
import { ActionCard } from '@/components/ui/action-card';
import { Card } from '@/components/ui/card';

import { useMentorDashboard } from '@/features/dashboard/api/dashboard-queries';
import { ExamReportPanel } from '@/features/dashboard/components/exam-report-panel';


/**
 * 导师/室经理仪表盘组件
 */
export const MentorDashboard: React.FC = () => {
  const { data, isLoading } = useMentorDashboard();
  const { roleNavigate } = useRoleNavigate();
  const { availableRoles, currentRole } = useAuth();

  const roleName = availableRoles.find((r) => r.code === currentRole)?.name || '导师';

  if (isLoading) {
    return (
      <PageFillShell>
        <Skeleton className="h-20 w-1/3 rounded-lg" />
        <PageWorkbench>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
          <Skeleton className="min-h-0 flex-1 rounded-lg" />
        </PageWorkbench>
      </PageFillShell>
    );
  }

  return (
    <PageFillShell>
      <PageHeader
        title={`${roleName}工作台`}
        icon={<GraduationCap />}
      />

      <PageWorkbench className="gap-4">
        <div className="shrink-0 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="学员数量"
              value={data?.summary?.total_students ?? 0}
              icon={Users}
              accentClassName="bg-primary"
              size="sm"
            />
            <StatCard
              title="任务完成率"
              value={`${data?.summary?.overall_completion_rate ?? 0}%`}
              icon={CheckCircle}
              accentClassName="bg-secondary"
              size="sm"
            />
            <StatCard
              title="平均分"
              value={data?.summary?.overall_avg_score ?? 0}
              icon={Trophy}
              accentClassName="bg-primary-500"
              size="sm"
            />
          </div>

          <Card className="border border-border p-4">
            <div className="mb-3 flex items-center gap-2">
              <Layout className="h-4 w-4 text-primary-500" />
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">
                快速开始
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ActionCard
                title="发起抽查"
                description="对学员进行知识抽查"
                icon={FileSearch}
                onClick={() => roleNavigate(ROUTES.SPOT_CHECKS)}
                actionColor="rose"
              />
              <ActionCard
                title="发布任务"
                description="创建学习/测验/考试任务"
                icon={Send}
                onClick={() => roleNavigate(`${ROUTES.TASKS}/create`)}
                actionColor="indigo"
              />
              <ActionCard
                title="新建试卷"
                description="创建新的考试或测验试卷"
                icon={Plus}
                onClick={() => roleNavigate(`${ROUTES.QUIZZES}/create`)}
                actionColor="emerald"
              />
              <ActionCard
                title="阅卷中心"
                description="批阅学员试卷答案"
                icon={FileCheck}
                onClick={() => roleNavigate(ROUTES.GRADING_CENTER)}
                actionColor="amber"
              />
            </div>
          </Card>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <ExamReportPanel />
        </div>
      </PageWorkbench>
    </PageFillShell>
  );
};
