import React from 'react';
import {
  CheckCircle,
  Pencil,
  FileSearch,
  Plus,
  Send,
  Trophy,
  Users,
  BarChart3,
} from 'lucide-react';
import { useMentorDashboard } from '../api/mentor-dashboard';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useKnowledgeStats } from '@/features/knowledge/api/get-knowledge-stats';
import { Card, Skeleton } from '@/components/ui';
import type { MentorDashboard as MentorDashboardData } from '@/types/api';

/**
 * 统计卡片配置
 */
const statCards = [
  {
    key: 'mentees',
    title: '学员数量',
    icon: <Users className="w-5 h-5" />,
    color: 'var(--color-primary-500)',
    bg: 'var(--color-primary-50)',
    getValue: (data: MentorDashboardData | undefined) => data?.mentees_count || 0,
    suffix: '人',
  },
  {
    key: 'completion',
    title: '任务完成率',
    icon: <CheckCircle className="w-5 h-5" />,
    color: 'var(--color-success-500)',
    bg: 'var(--color-success-50)',
    getValue: (data: MentorDashboardData | undefined) => data?.completion_rate || '0%',
    suffix: '',
  },
  {
    key: 'score',
    title: '平均分',
    icon: <Trophy className="w-5 h-5" />,
    color: 'var(--color-purple-500)',
    bg: 'rgba(155, 0, 255, 0.1)',
    getValue: (data: MentorDashboardData | undefined) => data?.average_score || '0',
    suffix: '分',
  },
  {
    key: 'grading',
    title: '待评分',
    icon: <Pencil className="w-5 h-5" />,
    color: 'var(--color-orange-500)',
    bg: 'rgba(255, 140, 82, 0.1)',
    getValue: (data: MentorDashboardData | undefined) => data?.pending_grading_count || 0,
    suffix: '份',
  },
];

/**
 * 快捷操作配置
 */
const quickActions = [
  {
    key: 'spot-check',
    title: '发起抽查',
    description: '对学员进行知识抽查',
    icon: <FileSearch className="w-5 h-5" />,
    color: 'var(--color-error-500)',
    bg: 'linear-gradient(135deg, var(--color-error-500) 0%, var(--color-pink-500) 100%)',
    route: ROUTES.SPOT_CHECKS,
  },
  {
    key: 'task',
    title: '发布任务',
    description: '创建学习/练习/考试任务',
    icon: <Send className="w-5 h-5" />,
    color: 'var(--color-primary-500)',
    bg: 'linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-purple-500) 100%)',
    route: `${ROUTES.TASKS}/create`,
  },
  {
    key: 'quiz',
    title: '新建试卷',
    description: '创建新的考试或练习试卷',
    icon: <Plus className="w-5 h-5" />,
    color: 'var(--color-success-500)',
    bg: 'linear-gradient(135deg, var(--color-success-500) 0%, var(--color-cyan-500) 100%)',
    route: ROUTES.TEST_CENTER,
  },
  {
    key: 'grading',
    title: '批改作业',
    description: '查看待批改的答卷',
    icon: <Pencil className="w-5 h-5" />,
    color: 'var(--color-orange-500)',
    bg: 'linear-gradient(135deg, var(--color-orange-500) 0%, var(--color-warning-500) 100%)',
    route: ROUTES.GRADING,
  },
];

/**
 * 导师/室经理仪表盘组件
 * Migrated from Ant Design to ShadCN UI
 */
export const MentorDashboard: React.FC = () => {
  const { data, isLoading } = useMentorDashboard();
  const { data: knowledgeStats, isLoading: knowledgeStatsLoading } = useKnowledgeStats();
  const navigate = useNavigate();
  const { user, availableRoles, currentRole } = useAuth();

  const roleName = availableRoles.find((r) => r.code === currentRole)?.name || '导师';
  const isAdmin = currentRole === 'ADMIN';

  return (
    <div>
      {/* 欢迎区 */}
      <div
        className="animate-fadeInDown"
        style={{
          marginBottom: 'var(--spacing-8)',
          padding: 'var(--spacing-8)',
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(135deg, var(--color-gray-800) 0%, var(--color-gray-900) 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 装饰 */}
        <div
          style={{
            position: 'absolute',
            right: -30,
            top: -30,
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: 'rgba(77, 108, 255, 0.2)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 80,
            bottom: -20,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(155, 0, 255, 0.15)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-2)' }}>
            <BarChart3 className="w-5 h-5" style={{ color: 'var(--color-primary-400)' }} />
            <span style={{ color: 'var(--color-gray-400)', fontSize: 'var(--font-size-sm)' }}>
              {roleName}工作台
            </span>
          </div>
          <h2
            style={{
              margin: 0,
              marginBottom: 'var(--spacing-1)',
              color: 'white',
              fontSize: 'var(--font-size-3xl)',
              fontWeight: 700,
            }}
          >
            欢迎回来，{user?.username || '老师'}
          </h2>
          <span style={{ color: 'var(--color-gray-400)' }}>
            今天有 {data?.pending_grading_count || 0} 份答卷等待批改
          </span>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div
            key={stat.key}
            className="animate-fadeInUp"
            style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
          >
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <div className="p-5">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>
                      {stat.title}
                    </span>
                    {isLoading ? (
                      <Skeleton className="h-10 w-20 mt-2" />
                    ) : (
                      <div style={{ marginTop: 'var(--spacing-2)' }}>
                        <span
                          style={{
                            fontSize: 'var(--font-size-4xl)',
                            fontWeight: 700,
                            color: stat.color,
                            lineHeight: 1,
                          }}
                        >
                          {String(stat.getValue(data))}
                        </span>
                        {stat.suffix && (
                          <span style={{ marginLeft: 4, fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                            {stat.suffix}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 'var(--radius-lg)',
                      background: stat.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: stat.color,
                      fontSize: 22,
                    }}
                  >
                    {stat.icon}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>

      {/* 知识库资产统计（仅管理员） */}
      {isAdmin && (
        <div style={{ marginBottom: 'var(--spacing-6)' }}>
          <span style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)', display: 'block', marginBottom: 'var(--spacing-4)' }}>
            知识库资产
          </span>
          <Card>
            <div className="p-5">
              {knowledgeStatsLoading ? (
                <div className="flex gap-8">
                  <Skeleton className="h-12 w-24" />
                  <Skeleton className="h-12 w-24" />
                  <Skeleton className="h-12 w-24" />
                </div>
              ) : (
                <div className="flex gap-8" style={{ fontSize: '14px' }}>
                  <div>
                    <span style={{ fontSize: '12px', display: 'block', marginBottom: '4px', color: 'var(--color-gray-500)' }}>
                      文档总数
                    </span>
                    <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {knowledgeStats?.total || 0}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', display: 'block', marginBottom: '4px', color: 'var(--color-gray-500)' }}>
                      应急类总数
                    </span>
                    <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-error-500)' }}>
                      {knowledgeStats?.emergency || 0}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', display: 'block', marginBottom: '4px', color: 'var(--color-gray-500)' }}>
                      本月新增
                    </span>
                    <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-success-500)' }}>
                      {knowledgeStats?.monthly_new || 0}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* 快捷操作 */}
      <div style={{ marginBottom: 'var(--spacing-6)' }}>
        <span style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)', display: 'block', marginBottom: 'var(--spacing-4)' }}>
          快捷操作
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, index) => (
            <div
              key={action.key}
              className="animate-fadeInUp"
              style={{ animationDelay: `${(index + 4) * 50}ms`, animationFillMode: 'both' }}
            >
              <Card
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(action.route)}
              >
                <div className="p-5">
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 'var(--radius-lg)',
                      background: action.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 22,
                      marginBottom: 'var(--spacing-4)',
                      boxShadow: `0 4px 14px ${action.color}40`,
                    }}
                  >
                    {action.icon}
                  </div>
                  <span style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    {action.title}
                  </span>
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                    {action.description}
                  </span>
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
