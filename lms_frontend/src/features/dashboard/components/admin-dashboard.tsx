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
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import { Card, Button, StatCard, PageHeader, StatusBadge, Skeleton } from '@/components/ui';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useKnowledgeStats } from '@/features/knowledge/api/get-knowledge-stats';
import { cn } from '@/lib/utils';

/**
 * STUDIO ADMIN DASHBOARD
 * Sophisticated system control interface.
 */
export const AdminDashboard: React.FC = () => {
  const { data, isLoading } = useMentorDashboard();
  const { data: knowledgeStats, isLoading: knowledgeStatsLoading } = useKnowledgeStats();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Mock chart heights for aesthetics
  const CHART_HEIGHTS = [45, 62, 78, 55, 88, 72, 65, 82, 58, 90, 75, 95];

  if (isLoading) {
    return (
      <div className="p-10 space-y-6 animate-pulse">
        <Skeleton className="h-20 w-1/3 rounded-2xl" />
        <div className="grid grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fadeIn pb-10">
      <PageHeader
        title="系统概览"
        subtitle="系统资源分配、用户权限审计及核心性能指标监控。"
        icon={<Settings />}
        extra={
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Operator</div>
              <div className="text-sm font-black text-primary-600">{user?.username}</div>
            </div>
            <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-2 border-gray-100 relative group">
              <span className="absolute top-3 right-3 w-2 h-2 bg-error-500 rounded-full ring-2 ring-white" />
              <Bell className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
            </Button>
          </div>
        }
      />

      {/* STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="注册成员总数"
          value={data?.mentees_count || 0}
          icon={Users}
          color="var(--color-primary-500)"
          gradient="linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-primary-300) 100%)"
          delay="stagger-delay-1"
        />
        <StatCard
          title="知识库条目"
          value={knowledgeStatsLoading ? '...' : (knowledgeStats?.total || 0)}
          icon={BookOpen}
          color="var(--color-success-500)"
          gradient="linear-gradient(135deg, var(--color-success-500) 0%, var(--color-success-300) 100%)"
          delay="stagger-delay-2"
        />
        <StatCard
          title="本月发布任务"
          value={28}
          icon={ClipboardCheck}
          color="var(--color-warning-500)"
          gradient="linear-gradient(135deg, var(--color-warning-500) 0%, var(--color-warning-300) 100%)"
          delay="stagger-delay-3"
        />
        <StatCard
          title="系统正常运行时间"
          value="99.9%"
          icon={Cloud}
          color="var(--color-cyan-500)"
          gradient="linear-gradient(135deg, var(--color-cyan-500) 0%, var(--color-cyan-300) 100%)"
          delay="stagger-delay-4"
        />
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* QUICK COMMANDS */}
        <div className="col-span-12 reveal-item stagger-delay-2">
          <h3 className="text-lg font-black text-gray-900 mb-6 pl-2 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary-500" />
            快捷操作
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: '成员管理', description: '管理权限与身份', icon: Users, route: ROUTES.USERS, color: 'text-primary-500', bg: 'bg-primary-50' },
              { label: '资源库', description: '编排知识与文档', icon: Database, route: ROUTES.ADMIN_KNOWLEDGE, color: 'text-purple-500', bg: 'bg-purple-50' },
              { label: '测评引擎', description: '试卷与题库维护', icon: ClipboardCheck, route: ROUTES.TEST_CENTER, color: 'text-pink-500', bg: 'bg-pink-50' },
              { label: '系统审计', description: '查看操作与日志', icon: Shield, route: ROUTES.ANALYTICS, color: 'text-orange-500', bg: 'bg-orange-50' },
            ].map((cmd, i) => (
              <div
                key={i}
                onClick={() => navigate(cmd.route)}
                className="group relative bg-white p-6 rounded-[2rem] shadow-sm border border-transparent hover:border-primary-100 hover:shadow-xl hover:shadow-primary-500/5 transition-all duration-300 cursor-pointer overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform duration-500" />
                <div className="relative z-10 flex flex-col gap-4">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:rotate-12", cmd.bg)}>
                    <cmd.icon className={cn("w-7 h-7", cmd.color)} />
                  </div>
                  <div>
                    <div className="text-lg font-black text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">{cmd.label}</div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">{cmd.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LOGS */}
        <div className="col-span-12 lg:col-span-7 reveal-item stagger-delay-3">
          <Card className="h-full border-none shadow-premium bg-white/60 backdrop-blur-xl p-8 rounded-[2.5rem]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">系统安全日志</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">System Security Audit</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="hover:bg-gray-100 rounded-xl">
                <RotateCw className="w-4 h-4 text-gray-400" />
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
                <div key={i} className="group flex items-center gap-4 p-4 rounded-2xl hover:bg-white hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300 border border-transparent hover:border-gray-100">
                  <div className="font-mono text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                    {log.time}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{log.action}</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Target: {log.target}</div>
                  </div>
                  <StatusBadge
                    status={log.status as 'success' | 'warning' | 'info'}
                    text={log.status === 'success' ? 'OK' : 'WARN'}
                    className="text-[10px] uppercase font-black px-3 py-1"
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* TRENDS & ASSETS */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6 reveal-item stagger-delay-4">
          {/* Knowledge Assets Card */}
          <Card className="border-none shadow-premium bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-[2.5rem] text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500 rounded-full opacity-10 blur-3xl translate-x-1/2 -translate-y-1/2" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                  <BookOpen className="w-5 h-5 text-primary-300" />
                </div>
                <div>
                  <h3 className="text-lg font-black">知识库概览</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Asset Distribution</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="text-3xl font-black mb-1">{knowledgeStats?.total || 0}</div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">文档总数</div>
                </div>
                <div>
                  <div className="text-3xl font-black text-error-400 mb-1">{knowledgeStats?.emergency || 0}</div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">应急类</div>
                </div>
                <div className="col-span-2 pt-6 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-black text-success-400 mb-1">+{knowledgeStats?.monthly_new || 0}</div>
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">本月新增</div>
                    </div>
                    <div className="h-10 w-24">
                      {/* Mini Trend Line visual */}
                      <div className="flex items-end justify-between h-full w-full gap-1">
                        {[40, 60, 45, 70, 50, 80, 65].map((h, idx) => (
                          <div key={idx} className="bg-success-500/30 w-full rounded-sm" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Load Chart Card */}
          <Card className="flex-1 border-none shadow-premium bg-white p-6 rounded-[2.5rem]">
            <div className="flex items-center gap-2 mb-6">
              <Server className="w-4 h-4 text-primary-500" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Load Analysis</span>
            </div>
            <div className="h-40 flex items-end justify-between gap-1 mb-4">
              {CHART_HEIGHTS.map((height, i) => (
                <div key={i} className="flex-1 flex flex-col gap-1 items-center group cursor-pointer">
                  <div className="relative w-full bg-gray-100 rounded-t-lg overflow-hidden h-full group-hover:bg-primary-50 transition-colors">
                    <div
                      className="absolute bottom-0 w-full bg-primary-500 opacity-80 group-hover:opacity-100 transition-all duration-500 rounded-t-sm"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-xs font-medium text-gray-500 leading-relaxed">
                系统当前处于 <span className="text-success-600 font-black">高效率</span> 运行状态。近 24 小时内学习节点活跃度增长了 <span className="text-gray-900 font-bold">12.5%</span>。
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
