import React from 'react';
import { Typography, Skeleton, Row, Col, Progress, Space } from 'antd';
import {
  SafetyOutlined,
  TeamOutlined,
  BookOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
  SettingOutlined,
  AuditOutlined,
  NotificationOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useMentorDashboard } from '../api/mentor-dashboard';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import { Card, PageHeader, Button, StatusBadge } from '@/components/ui';
import { useAuth } from '@/features/auth/hooks/use-auth';

const { Text, Title } = Typography;

/**
 * STUDIO ADMIN DASHBOARD
 * Sophisticated system control interface.
 */
export const AdminDashboard: React.FC = () => {
  const { data, isLoading } = useMentorDashboard();
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

  if (isLoading) return <div style={{ padding: '40px' }}><Skeleton active paragraph={{ rows: 10 }} /></div>;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <PageHeader
        title="系统概览"
        subtitle="全局资源分配、用户权限审计及核心性能指标监控。"
        icon={<SettingOutlined />}
        extra={
          <Space size={12}>
            <div style={{ textAlign: 'right', marginRight: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Operator</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-accent)' }}>{user?.username}</div>
            </div>
            <Button icon={<NotificationOutlined />} />
          </Space>
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
            { label: '注册成员总数', value: data?.summary?.total_students || 0, icon: <TeamOutlined />, color: 'var(--color-accent)' },
            { label: '知识库条目', value: 452, icon: <BookOutlined />, color: 'var(--color-success)' },
            { label: '本月发布任务', value: 28, icon: <AuditOutlined />, color: 'var(--color-warning)' },
            { label: '系统正常运行时间', value: '99.9%', icon: <CloudServerOutlined />, color: 'var(--color-accent)' },
          ].map((stat, i) => (
            <motion.div key={i} variants={itemVariants}>
              <Card variant="default" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, fontSize: '20px' }}>
                    {stat.icon}
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>{stat.value}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>{stat.label}</div>
              </Card>
            </motion.div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
          {/* QUICK COMMANDS */}
          <motion.div variants={itemVariants} style={{ gridColumn: 'span 12' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
              {[
                { label: '成员管理', description: '管理权限与身份', icon: <TeamOutlined />, route: ROUTES.USERS },
                { label: '资源库', description: '编排知识与文档', icon: <DatabaseOutlined />, route: ROUTES.ADMIN_KNOWLEDGE },
                { label: '测评引擎', description: '试卷与题库维护', icon: <AuditOutlined />, route: ROUTES.TEST_CENTER },
                { label: '系统审计', description: '查看操作与日志', icon: <SafetyOutlined />, route: ROUTES.ANALYTICS },
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
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-accent)';
                    e.currentTarget.style.background = 'var(--color-surface-hover)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.background = 'var(--color-surface)';
                  }}
                >
                  <div style={{ fontSize: '24px', color: 'var(--color-accent)' }}>{cmd.icon}</div>
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
            <Card title={<span style={{ fontFamily: 'var(--font-display)', fontSize: '18px' }}>系统安全日志</span>} style={{ height: '440px' }}>
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
                    <StatusBadge status={log.status as any} text={log.status === 'success' ? 'OK' : 'WARN'} />
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* TRENDS */}
          <motion.div variants={itemVariants} style={{ gridColumn: 'span 5' }}>
            <Card title={<span style={{ fontFamily: 'var(--font-display)', fontSize: '18px' }}>学习负载分析</span>} style={{ height: '440px' }}>
              <div style={{ height: '280px', display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '24px' }}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.random() * 80 + 20}%` }}
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
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
