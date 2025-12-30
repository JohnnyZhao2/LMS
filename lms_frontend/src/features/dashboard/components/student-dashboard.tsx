import React from 'react';
import {
  BookOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  RocketOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { useStudentDashboard } from '../api/student-dashboard';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import dayjs from '@/lib/dayjs';
import { Card, Skeleton } from '@/components/ui';
import { StatusBadge, StaggeredList } from '@/components/ui';
import { useAuth } from '@/features/auth/hooks/use-auth';

/**
 * 任务类型配色
 */
const taskConfig = {
  color: 'var(--color-primary-500)',
  bg: 'var(--color-primary-50)',
  icon: <FileTextOutlined />,
  label: '任务',
};

/**
 * 空状态组件
 */
const EmptyState: React.FC<{ icon?: React.ReactNode; description: string }> = ({ icon, description }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    {icon && <div className="mb-2">{icon}</div>}
    <span style={{ color: 'var(--color-gray-500)' }}>{description}</span>
  </div>
);

/**
 * 进度环组件
 */
const ProgressCircle: React.FC<{
  percent: number;
  gradientStart: string;
  gradientEnd: string;
  size?: number;
  label: string;
}> = ({ percent, gradientStart, gradientEnd, size = 120, label }) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const gradientId = `progress-gradient-${label.replace(/\s/g, '-')}`;

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={gradientStart} />
            <stop offset="100%" stopColor={gradientEnd} />
          </linearGradient>
        </defs>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-gray-200)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
        {/* Center text */}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            transform: 'rotate(90deg)',
            transformOrigin: 'center',
            fontSize: '24px',
            fontWeight: 700,
            fill: 'var(--color-gray-900)',
          }}
        >
          {percent}%
        </text>
      </svg>
      <div style={{ marginTop: 'var(--spacing-2)' }}>
        <span style={{ color: 'var(--color-gray-500)' }}>{label}</span>
      </div>
    </div>
  );
};

/**
 * 学员仪表盘组件
 * Migrated from Ant Design to ShadCN UI
 */
export const StudentDashboard: React.FC = () => {
  const { data, isLoading } = useStudentDashboard();
  const navigate = useNavigate();
  const { user } = useAuth();

  // 获取问候语
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '早上好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  return (
    <div>
      {/* Hero 欢迎区 */}
      <div
        className="animate-fadeInDown"
        style={{
          marginBottom: 'var(--spacing-8)',
          padding: 'var(--spacing-8)',
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-purple-500) 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 装饰背景 */}
        <div
          style={{
            position: 'absolute',
            right: -50,
            top: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 50,
            bottom: -30,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.08)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-2)' }}>
            <RocketOutlined style={{ fontSize: 24, color: 'rgba(255, 255, 255, 0.9)' }} />
            <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 'var(--font-size-base)' }}>
              {getGreeting()}
            </span>
          </div>
          <h2
            style={{
              margin: 0,
              marginBottom: 'var(--spacing-2)',
              color: 'white',
              fontSize: 'var(--font-size-4xl)',
              fontWeight: 700,
            }}
          >
            {user?.username || '学员'}，继续加油！
          </h2>
          <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 'var(--font-size-base)' }}>
            今天是学习的好日子，让我们一起进步吧
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-24 gap-6">
        {/* 待办任务 */}
        <div className="lg:col-span-14">
          <Card className="hover:shadow-md transition-shadow h-full">
            <div className="p-5">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 'var(--spacing-5)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--color-primary-50)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-primary-500)',
                      fontSize: 18,
                    }}
                  >
                    <FileTextOutlined />
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>
                      待办任务
                    </span>
                    {data?.pending_tasks && (
                      <span style={{ marginLeft: 'var(--spacing-2)', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                        {data.pending_tasks.length} 项待完成
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : data?.pending_tasks && data.pending_tasks.length > 0 ? (
                <StaggeredList staggerDelay={60} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                  {data.pending_tasks.map((task) => {
                    const typeConfig = taskConfig;
                    const isUrgent = dayjs(task.deadline).diff(dayjs(), 'day') <= 1;

                    return (
                      <div
                        key={task.id}
                        onClick={() => navigate(`${ROUTES.TASKS}/${task.task_id}`)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--spacing-4)',
                          padding: 'var(--spacing-4)',
                          borderRadius: 'var(--radius-lg)',
                          background: 'var(--color-gray-50)',
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)',
                          borderLeft: `4px solid ${typeConfig.color}`,
                        }}
                        className="hover:bg-gray-100 hover:translate-x-1"
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 'var(--radius-md)',
                            background: typeConfig.bg,
                            color: typeConfig.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 16,
                            flexShrink: 0,
                          }}
                        >
                          {typeConfig.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {task.task_title}
                            </span>
                            <StatusBadge
                              status={'processing'}
                              text={'进行中'}
                              size="small"
                              showIcon={false}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                            <ClockCircleOutlined style={{ fontSize: 12, color: isUrgent ? 'var(--color-error-500)' : 'var(--color-gray-400)' }} />
                            <span
                              style={{
                                fontSize: 'var(--font-size-sm)',
                                color: isUrgent ? 'var(--color-error-500)' : 'var(--color-gray-500)',
                              }}
                            >
                              截止: {dayjs(task.deadline).format('MM-DD HH:mm')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </StaggeredList>
              ) : (
                <EmptyState
                  icon={<TrophyOutlined style={{ fontSize: 32, color: 'var(--color-success-500)', marginBottom: 'var(--spacing-2)' }} />}
                  description="太棒了！暂无待办任务"
                />
              )}
            </div>
          </Card>
        </div>

        {/* 最新知识 */}
        <div className="lg:col-span-10">
          <Card className="hover:shadow-md transition-shadow h-full">
            <div className="p-5">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-3)',
                  marginBottom: 'var(--spacing-5)',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--color-success-50)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-success-500)',
                    fontSize: 18,
                  }}
                >
                  <BookOutlined />
                </div>
                <span style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>
                  最新知识
                </span>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : data?.latest_knowledge && data.latest_knowledge.length > 0 ? (
                <StaggeredList staggerDelay={60} initialDelay={100} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                  {data.latest_knowledge.map((knowledge) => (
                    <div
                      key={knowledge.id}
                      onClick={() => navigate(`${ROUTES.KNOWLEDGE}/${knowledge.id}`)}
                      style={{
                        padding: 'var(--spacing-4)',
                        borderRadius: 'var(--radius-lg)',
                        background: 'var(--color-gray-50)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                      }}
                      className="hover:bg-gray-100 hover:-translate-y-0.5"
                    >
                      <span style={{ fontWeight: 600, display: 'block', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {knowledge.title}
                      </span>
                      <p
                        style={{
                          fontSize: 'var(--font-size-sm)',
                          color: 'var(--color-gray-500)',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          margin: 0,
                          marginBottom: 'var(--spacing-2)',
                        }}
                      >
                        {knowledge.summary}
                      </p>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>
                        {dayjs(knowledge.updated_at).format('YYYY-MM-DD')}
                      </span>
                    </div>
                  ))}
                </StaggeredList>
              ) : (
                <EmptyState description="暂无最新知识" />
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* 学习进度概览 */}
      <div className="mt-6">
        <Card className="hover:shadow-md transition-shadow">
          <div className="p-5">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-5)' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-lg)',
                  background: 'linear-gradient(135deg, var(--color-purple-500) 0%, var(--color-pink-500) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 18,
                }}
              >
                <TrophyOutlined />
              </div>
              <span style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>
                学习进度
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div style={{ textAlign: 'center' }}>
                <ProgressCircle
                  percent={75}
                  gradientStart="var(--color-primary-500)"
                  gradientEnd="var(--color-purple-500)"
                  label="本月完成率"
                />
              </div>
              <div style={{ textAlign: 'center' }}>
                <ProgressCircle
                  percent={88}
                  gradientStart="var(--color-success-500)"
                  gradientEnd="var(--color-cyan-500)"
                  label="平均得分"
                />
              </div>
              <div style={{ textAlign: 'center' }}>
                <ProgressCircle
                  percent={60}
                  gradientStart="var(--color-orange-500)"
                  gradientEnd="var(--color-error-500)"
                  label="知识覆盖"
                />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
