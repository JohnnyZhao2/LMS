import React from 'react';
import {
  Shield,
  Users,
  BookOpen,
  Cloud,
  Database,
  Settings,
  ClipboardCheck,
  Bell,
  Activity,
  Server,
  RotateCw
} from 'lucide-react';
import { useMentorDashboard } from '../api/mentor-dashboard';

import { ROUTES } from '@/config/routes';
import { Card, Button, StatCard, PageHeader, StatusBadge, Skeleton, ActionCard } from '@/components/ui';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useKnowledgeStats } from '@/features/knowledge/api/get-knowledge-stats';

/**
 * ADMIN DASHBOARD - Flat Design 版本
 * 
 * 设计规范：
 * - 无阴影 (shadow-none)
 * - 无渐变 (no gradient)
 * - 实心背景色
 * - hover:scale 交互反馈
 */
export const AdminDashboard: React.FC = () => {
  const { data, isLoading } = useMentorDashboard();
  const { data: knowledgeStats, isLoading: knowledgeStatsLoading } = useKnowledgeStats();
  const { user } = useAuth();

  const CHART_HEIGHTS = [45, 62, 78, 55, 88, 72, 65, 82, 58, 90, 75, 95];

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
        extra={
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <div className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-widest">Operator</div>
              <div className="text-sm font-bold text-[#3B82F6]">{user?.username}</div>
            </div>
            <Button variant="outline" size="icon" className="h-12 w-12 rounded-md border-2 border-[#E5E7EB] relative group">
              <span className="absolute top-3 right-3 w-2 h-2 bg-[#EF4444] rounded-full ring-2 ring-white" />
              <Bell className="w-5 h-5 text-[#6B7280] group-hover:text-[#3B82F6] transition-colors" />
            </Button>
          </div>
        }
      />

      {/* STATS GRID - Flat Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="注册成员总数"
          value={data?.mentees_count || 0}
          icon={Users}
          color="#3B82F6"
          gradient=""
        />
        <StatCard
          title="知识库条目"
          value={knowledgeStatsLoading ? '...' : (knowledgeStats?.total || 0)}
          icon={BookOpen}
          color="#10B981"
          gradient=""
        />
        <StatCard
          title="本月发布任务"
          value={28}
          icon={ClipboardCheck}
          color="#F59E0B"
          gradient=""
        />
        <StatCard
          title="系统正常运行时间"
          value="99.9%"
          icon={Cloud}
          color="#06B6D4"
          gradient=""
        />
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* QUICK COMMANDS */}
        <div className="col-span-12">
          <h3 className="text-lg font-bold text-[#111827] mb-6 pl-2 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#3B82F6]" />
            快捷操作
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <ActionCard
              title="成员管理"
              description="管理权限与身份"
              icon={Users}
              route={ROUTES.USERS}
              iconColor="text-[#3B82F6]"
              iconBg="bg-[#DBEAFE]"
            />
            <ActionCard
              title="资源库"
              description="编排知识与文档"
              icon={Database}
              route={ROUTES.ADMIN_KNOWLEDGE}
              iconColor="text-[#8B5CF6]"
              iconBg="bg-[#EDE9FE]"
            />
            <ActionCard
              title="测评引擎"
              description="试卷与题库维护"
              icon={ClipboardCheck}
              route={ROUTES.TEST_CENTER}
              iconColor="text-[#EC4899]"
              iconBg="bg-[#FCE7F3]"
            />
            <ActionCard
              title="系统审计"
              description="查看操作与日志"
              icon={Shield}
              route={ROUTES.ANALYTICS}
              iconColor="text-[#F97316]"
              iconBg="bg-[#FFEDD5]"
            />
          </div>
        </div>

        {/* LOGS - Flat Design */}
        <div className="col-span-12 lg:col-span-7">
          <Card className="h-full bg-[#F3F4F6] p-8 rounded-lg">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-[#E5E7EB] flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[#6B7280]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#111827]">系统安全日志</h3>
                  <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest">System Security Audit</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="hover:bg-[#E5E7EB] rounded-md">
                <RotateCw className="w-4 h-4 text-[#6B7280]" />
              </Button>
            </div>

            <div className="space-y-4">
              {[
                { time: '14:22:01', action: 'ROOT ACCESS', target: 'Super Admin', status: 'success' },
                { time: '14:21:45', action: 'KNOWLEDGE_PUBLISHED', target: 'Intel_4021', status: 'success' },
                { time: '14:20:12', action: 'DB_BACKUP_COMPLETED', target: 'Main Cluster', status: 'success' },
                { time: '14:18:33', action: 'PERMISSION_CHANGED', target: 'Member: Chen', status: 'warning' },
                { time: '14:15:09', action: 'TASK_DEPLOYED', target: 'Group: Students', status: 'success' },
              ].map((log, i) => (
                <div key={i} className="group flex items-center gap-4 p-4 rounded-lg bg-white hover:scale-[1.01] transition-all duration-200">
                  <div className="font-mono text-[10px] font-semibold text-[#6B7280] bg-[#F3F4F6] px-2 py-1 rounded-md">
                    {log.time}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-[#111827] group-hover:text-[#3B82F6] transition-colors">{log.action}</div>
                    <div className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide">Target: {log.target}</div>
                  </div>
                  <StatusBadge
                    status={log.status as 'success' | 'warning' | 'info'}
                    text={log.status === 'success' ? 'OK' : 'WARN'}
                    className="text-[10px] uppercase font-bold px-3 py-1"
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* TRENDS & ASSETS - Flat Design */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
          {/* Knowledge Assets Card - 纯色背景 */}
          <Card className="bg-[#111827] p-8 rounded-lg text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-md bg-white/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-[#60A5FA]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">知识库概览</h3>
                  <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-widest">Asset Distribution</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="text-3xl font-bold mb-1">{knowledgeStats?.total || 0}</div>
                  <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">文档总数</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#F87171] mb-1">{knowledgeStats?.emergency || 0}</div>
                  <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">应急类</div>
                </div>
                <div className="col-span-2 pt-6 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-[#34D399] mb-1">+{knowledgeStats?.monthly_new || 0}</div>
                      <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">本月新增</div>
                    </div>
                    <div className="h-10 w-24">
                      <div className="flex items-end justify-between h-full w-full gap-1">
                        {[40, 60, 45, 70, 50, 80, 65].map((h, idx) => (
                          <div key={idx} className="bg-[#34D399]/30 w-full rounded-sm" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Load Chart Card - Flat Design */}
          <Card className="flex-1 bg-white p-6 rounded-lg">
            <div className="flex items-center gap-2 mb-6">
              <Server className="w-4 h-4 text-[#3B82F6]" />
              <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest">Load Analysis</span>
            </div>
            <div className="h-40 flex items-end justify-between gap-1 mb-4">
              {CHART_HEIGHTS.map((height, i) => (
                <div key={i} className="flex-1 flex flex-col gap-1 items-center group cursor-pointer">
                  <div className="relative w-full bg-[#F3F4F6] rounded-t-md overflow-hidden h-full group-hover:bg-[#DBEAFE] transition-colors">
                    <div
                      className="absolute bottom-0 w-full bg-[#3B82F6] transition-all duration-500 rounded-t-sm"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-[#F3F4F6] rounded-lg">
              <p className="text-xs font-medium text-[#6B7280] leading-relaxed">
                系统当前处于 <span className="text-[#10B981] font-bold">高效率</span> 运行状态。近 24 小时内学习节点活跃度增长了 <span className="text-[#111827] font-bold">12.5%</span>。
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
