import React from 'react';
import {
  Users,
  Cloud,
  Database,
  Settings,
  ClipboardCheck,
  Activity,
  FileCheck
} from 'lucide-react';
import { useMentorDashboard } from '../api/mentor-dashboard';

import { ROUTES } from '@/config/routes';
import { StatCard } from '@/components/ui/stat-card';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { ActionCard } from '@/components/ui/action-card';
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
    <div className="space-y-8 pb-10">
      <PageHeader
        title="系统概览"
        icon={<Settings />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 左侧边栏 - 占据 4 列 */}
        <div className="lg:col-span-4 space-y-8">

          {/* 快捷操作卡片 */}
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-extrabold text-foreground uppercase tracking-widest">
                快捷指令
              </h3>
            </div>

            <div className="flex flex-col gap-4 grow justify-center">
              <ActionCard
                title="成员管理"
                description="权限与身份"
                icon={Users}
                route={ROUTES.USERS}
                actionColor="indigo"
                delay="stagger-delay-1"
              />
              <ActionCard
                title="知识管理"
                description="知识与文档"
                icon={Database}
                route={ROUTES.KNOWLEDGE}
                actionColor="cyan"
                delay="stagger-delay-2"
              />
              <ActionCard
                title="测评引擎"
                description="试卷与题库"
                icon={ClipboardCheck}
                route={ROUTES.QUIZ_CENTER}
                actionColor="rose"
                delay="stagger-delay-3"
              />
              <ActionCard
                title="阅卷中心"
                description="批阅试卷"
                icon={FileCheck}
                route={ROUTES.GRADING_CENTER}
                actionColor="emerald"
                delay="stagger-delay-4"
              />
            </div>
          </div>
        </div>

        {/* 右侧主要区域 - 占据 8 列 */}
        <div className="lg:col-span-8 space-y-8">
          {/* 统计指标网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

          {/* 活动日志面板 - 放在主栏下方 */}
          <ActivityLogsPanel />
        </div>
      </div>
    </div>
  );
};
