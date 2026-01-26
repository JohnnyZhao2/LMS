import React from 'react';
import {
  Shield,
  Users,
  Cloud,
  Database,
  Settings,
  ClipboardCheck,
  Activity
} from 'lucide-react';
import { useMentorDashboard } from '../api/mentor-dashboard';

import { ROUTES } from '@/config/routes';
import { StatCard, PageHeader, Skeleton, ActionCard } from '@/components/ui';
import { ActivityLogsPanel } from '@/features/activity-logs/components/activity-logs-panel';


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
      <div className="p-10 space-y-6">
        <Skeleton className="h-20 w-1/3 rounded-lg" />
        <div className="grid grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-10">
      <PageHeader
        title="系统概览"
        subtitle="系统资源分配、用户权限审计及核心性能指标监控。"
        icon={<Settings />}
      />

      {/* STATS GRID - Flat Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="周活跃用户数"
          value={data?.summary?.weekly_active_users ?? 0}
          icon={Users}
          accentClassName="bg-primary"
          gradient=""
        />

        <StatCard
          title="本月发布任务"
          value={28}
          icon={ClipboardCheck}
          accentClassName="bg-warning"
          gradient=""
        />
        <StatCard
          title="系统正常运行时间"
          value="99.9%"
          icon={Cloud}
          accentClassName="bg-cyan-500"
          gradient=""
        />
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* QUICK COMMANDS */}
        <div className="col-span-12">
          <h3 className="text-lg font-bold text-gray-900 mb-6 pl-2 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            快捷操作
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <ActionCard
              title="成员管理"
              description="管理权限与身份"
              icon={Users}
              route={ROUTES.USERS}
              iconColor="text-primary"
              iconBg="bg-primary-100"
            />
            <ActionCard
              title="资源库"
              description="编排知识与文档"
              icon={Database}
              route={ROUTES.KNOWLEDGE}
              iconColor="text-primary-500"
              iconBg="bg-primary-100"
            />
            <ActionCard
              title="测评引擎"
              description="试卷与题库维护"
              icon={ClipboardCheck}
              route={ROUTES.QUIZ_CENTER}
              iconColor="text-pink-500"
              iconBg="bg-pink-100"
            />
            <ActionCard
              title="系统审计"
              description="查看操作与日志"
              icon={Shield}
              route={ROUTES.ANALYTICS}
              iconColor="text-warning-500"
              iconBg="bg-warning-100"
            />
          </div>
        </div>
      </div>

      {/* Activity Logs Panel */}
      <ActivityLogsPanel />
    </div>
  );
};
