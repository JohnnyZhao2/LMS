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
import { useMentorDashboard } from '../api/mentor-dashboard';

import { ROUTES } from '@/config/routes';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { StatCard } from '@/components/ui/stat-card';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { ActionCard } from '@/components/ui/action-card';


/**
 * 导师/室经理仪表盘组件
 * Sophisticated dashboard for Mentors and Managers.
 */
export const MentorDashboard: React.FC = () => {
  const { data, isLoading } = useMentorDashboard();

  const { availableRoles, currentRole } = useAuth();

  const roleName = availableRoles.find((r) => r.code === currentRole)?.name || '导师';

  if (isLoading) {
    return (
      <div className="p-10 space-y-6 animate-pulse">
        <Skeleton className="h-20 w-1/3 rounded-2xl" />
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-10">
      <PageHeader
        title={`${roleName}工作台`}
        icon={<GraduationCap />}
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="学员数量"
          value={data?.summary?.total_students ?? 0}
          icon={Users}
          accentClassName="bg-primary"
          gradient="linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-primary-300) 100%)"
          delay="stagger-delay-1"
        />
        <StatCard
          title="任务完成率"
          value={`${data?.summary?.overall_completion_rate ?? 0}%`}
          icon={CheckCircle}
          accentClassName="bg-secondary"
          gradient="linear-gradient(135deg, var(--color-success-500) 0%, var(--color-success-300) 100%)"
          delay="stagger-delay-2"
        />
        <StatCard
          title="平均分"
          value={data?.summary?.overall_avg_score ?? 0}
          icon={Trophy}
          accentClassName="bg-primary-500"
          gradient="linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-primary-300) 100%)"
          delay="stagger-delay-3"
        />
      </div>

      {/* 快捷操作 */}
      <div className="space-y-6 reveal-item stagger-delay-2">
        <h3 className="text-lg font-black text-foreground pl-2 flex items-center gap-2">
          <Layout className="w-5 h-5 text-primary-500" />
          快速开始
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <ActionCard
            title="发起抽查"
            description="对学员进行知识抽查"
            icon={FileSearch}
            route={`${ROUTES.SPOT_CHECKS}/create`}
            actionColor="rose" // Was destructive
            delay="stagger-delay-1"
          />
          <ActionCard
            title="发布任务"
            description="创建学习/练习/考试任务"
            icon={Send}
            route={`${ROUTES.TASKS}/create`}
            actionColor="indigo" // Was primary
            delay="stagger-delay-2"
          />
          <ActionCard
            title="新建试卷"
            description="创建新的考试或练习试卷"
            icon={Plus}
            route={`${ROUTES.QUIZ_CENTER_QUIZZES}/create`}
            actionColor="emerald" // Was secondary
            delay="stagger-delay-3"
          />
          <ActionCard
            title="阅卷中心"
            description="批阅学员试卷答案"
            icon={FileCheck}
            route={ROUTES.GRADING_CENTER}
            actionColor="amber"
            delay="stagger-delay-4"
          />
        </div>
      </div>
    </div>
  );
};
