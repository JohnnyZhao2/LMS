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
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useMentorDashboard } from '../api/mentor-dashboard';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import { Card, Skeleton, Button } from '@/components/ui';
import { PageHeader, StatusBadge } from '@/components/ui';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useKnowledgeStats } from '@/features/knowledge/api/get-knowledge-stats';

// Pre-generated chart heights for the learning load analysis chart
const CHART_HEIGHTS = [45, 62, 78, 55, 88, 72, 65, 82, 58, 90, 75, 95];

/**
 * STUDIO ADMIN DASHBOARD
 * Sophisticated system control interface.
 * Migrated from Ant Design to ShadCN UI
 */
export const AdminDashboard: React.FC = () => {
  const { data, isLoading } = useMentorDashboard();
  const { data: knowledgeStats, isLoading: knowledgeStatsLoading } = useKnowledgeStats();
  const navigate = useNavigate();
  const { user } = useAuth();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  if (isLoading) {
    return (
      <div style={{ padding: '40px' }}>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
          <div className="grid grid-cols-4 gap-6 mt-8">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <PageHeader
        title="系统概览"
        subtitle="全局资源分配、用户权限审计及核心性能指标监控。"
        icon={<Settings className="w-5 h-5" />}
        extra={
          <div className="flex items-center gap-3">
            <div style={{ textAlign: 'right', marginRight: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Operator</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-accent)' }}>{user?.username}</div>
            </div>
            <Button variant="outline" size="icon">
              <Bell className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}
      >
        {/* STATS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
          {[
            { label: '注册成员总数', value: data?.mentees_count || 0, icon: <Users className="w-5 h-5" />, color: 'var(--color-accent)' },
            { label: '知识库条目', value: knowledgeStatsLoading ? '...' : (knowledgeStats?.total || 0), icon: <BookOpen className="w-5 h-5" />, color: 'var(--color-success)' },
            { label: '本月发布任务', value: 28, icon: <ClipboardCheck className="w-5 h-5" />, color: 'var(--color-warning)' },
            { label: '系统正常运行时间', value: '99.9%', icon: <Cloud className="w-5 h-5" />, color: 'var(--color-accent)' },
          ].map((stat, i) => (
            <motion.div key={i} variants={itemVariants}>
              <Card className="p-6 hover:shadow-md transition-shadow">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>
                    {stat.icon}
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>{stat.value}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>{stat.label}</div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* 知识库资产统计 */}
        <motion.div variants={itemVariants}>
          <Card className="mb-6">
            <div className="p-6">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <BookOpen className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600 }}>知识库资产</span>
              </div>
              {knowledgeStatsLoading ? (
                <div className="flex gap-8">
                  <Skeleton className="h-12 w-24" />
                  <Skeleton className="h-12 w-24" />
                  <Skeleton className="h-12 w-24" />
                </div>
              ) : (
                <div className="flex gap-8" style={{ fontSize: '14px' }}>
                  <div>
                    <span style={{ fontSize: '12px', display: 'block', marginBottom: '4px', color: 'var(--color-gray-500)' }}>文档总数</span>
                    <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {knowledgeStats?.total || 0}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', display: 'block', marginBottom: '4px', color: 'var(--color-gray-500)' }}>应急类总数</span>
                    <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-error-500)' }}>
                      {knowledgeStats?.emergency || 0}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', display: 'block', marginBottom: '4px', color: 'var(--color-gray-500)' }}>本月新增</span>
                    <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-success-500)' }}>
                      {knowledgeStats?.monthly_new || 0}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
          {/* QUICK COMMANDS */}
          <motion.div variants={itemVariants} style={{ gridColumn: 'span 12' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
              {[
                { label: '成员管理', description: '管理权限与身份', icon: <Users className="w-6 h-6" />, route: ROUTES.USERS },
                { label: '资源库', description: '编排知识与文档', icon: <Database className="w-6 h-6" />, route: ROUTES.ADMIN_KNOWLEDGE },
                { label: '测评引擎', description: '试卷与题库维护', icon: <ClipboardCheck className="w-6 h-6" />, route: ROUTES.TEST_CENTER },
                { label: '系统审计', description: '查看操作与日志', icon: <Shield className="w-6 h-6" />, route: ROUTES.ANALYTICS },
              ].map((cmd, i) => (
                <div 
                  key={i}
                  onClick={() => navigate(cmd.route)}
                  style={{
                    padding: '24px',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px'
                  }}
                  className="hover:border-primary-500 hover:bg-gray-50"
                >
                  <div style={{ color: 'var(--color-accent)' }}>{cmd.icon}</div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{cmd.label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>{cmd.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* LOGS */}
          <motion.div variants={itemVariants} style={{ gridColumn: 'span 7' }}>
            <Card style={{ height: '440px' }}>
              <div className="p-6">
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>系统安全日志</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    { time: '14:22:01', action: 'ROOT ACCESS', target: 'Super Admin', status: 'success' },
                    { time: '14:21:45', action: 'KNOWLEDGE_PUBLISHED', target: 'Intel_4021', status: 'success' },
                    { time: '14:20:12', action: 'DB_BACKUP_COMPLETED', target: 'Main Cluster', status: 'success' },
                    { time: '14:18:33', action: 'PERMISSION_CHANGED', target: 'Member: Chen', status: 'warning' },
                    { time: '14:15:09', action: 'TASK_DEPLOYED', target: 'Group: Students', status: 'success' },
                    { time: '14:10:55', action: 'API_PEAK_DETECTED', target: 'Analytics Svc', status: 'info' },
                  ].map((log, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-tertiary)' }}>[{log.time}]</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{log.action}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>Target: {log.target}</div>
                      </div>
                      <StatusBadge status={log.status as 'success' | 'warning' | 'info'} text={log.status === 'success' ? 'OK' : 'WARN'} />
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>

          {/* TRENDS */}
          <motion.div variants={itemVariants} style={{ gridColumn: 'span 5' }}>
            <Card style={{ height: '440px' }}>
              <div className="p-6">
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>学习负载分析</div>
                <div style={{ height: '280px', display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '24px' }}>
                  {CHART_HEIGHTS.map((height, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ duration: 1, delay: i * 0.05 }}
                        style={{ 
                          width: '100%', 
                          background: 'var(--color-accent)', 
                          opacity: 0.1 + (i / 12) * 0.9,
                          borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0'
                        }} 
                      />
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>M{i+1}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '16px', background: 'var(--color-surface-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                    系统当前处于 <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>高效率</span> 运行状态。近 24 小时内学习节点活跃度增长了 12.5%。
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
