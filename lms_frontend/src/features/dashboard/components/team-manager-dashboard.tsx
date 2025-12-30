import React from 'react';
import {
  TeamOutlined,
  BarChartOutlined,
  RiseOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { Card } from '@/components/ui';

/**
 * 空状态组件
 */
const EmptyState: React.FC<{ description: string; subDescription?: string }> = ({ description, subDescription }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div style={{ color: 'var(--color-gray-400)', marginBottom: 'var(--spacing-2)' }}>
      <svg width="64" height="41" viewBox="0 0 64 41" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(0 1)" fill="none" fillRule="evenodd">
          <ellipse fill="#f5f5f5" cx="32" cy="33" rx="32" ry="7" />
          <g fillRule="nonzero" stroke="#d9d9d9">
            <path d="M55 12.76L44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z" />
            <path d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z" fill="#fafafa" />
          </g>
        </g>
      </svg>
    </div>
    <span style={{ color: 'var(--color-gray-500)' }}>{description}</span>
    {subDescription && (
      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-400)', marginTop: 'var(--spacing-1)' }}>
        {subDescription}
      </span>
    )}
  </div>
);

/**
 * 团队经理仪表盘组件
 * Migrated from Ant Design to ShadCN UI
 */
export const TeamManagerDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div>
      {/* 欢迎区 */}
      <div
        className="animate-fadeInDown"
        style={{
          marginBottom: 'var(--spacing-8)',
          padding: 'var(--spacing-8)',
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(135deg, var(--color-success-500) 0%, var(--color-cyan-500) 100%)',
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
            background: 'rgba(255, 255, 255, 0.15)',
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
            background: 'rgba(255, 255, 255, 0.1)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-2)' }}>
            <BarChartOutlined style={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.9)' }} />
            <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 'var(--font-size-sm)' }}>
              团队经理工作台
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
            欢迎回来，{user?.username || '经理'}
          </h2>
          <span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
            全面掌握团队学习动态
          </span>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="animate-fadeInUp" style={{ animationDelay: '0ms', animationFillMode: 'both' }}>
          <Card className="hover:shadow-md transition-shadow">
            <div className="p-5">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>
                    团队人数
                  </span>
                  <div style={{ marginTop: 'var(--spacing-2)' }}>
                    <span
                      style={{
                        fontSize: 'var(--font-size-4xl)',
                        fontWeight: 700,
                        color: 'var(--color-primary-500)',
                        lineHeight: 1,
                      }}
                    >
                      --
                    </span>
                    <span style={{ marginLeft: 4, fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                      人
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--color-primary-50)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary-500)',
                    fontSize: 22,
                  }}
                >
                  <TeamOutlined />
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="animate-fadeInUp" style={{ animationDelay: '50ms', animationFillMode: 'both' }}>
          <Card className="hover:shadow-md transition-shadow">
            <div className="p-5">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>
                    平均完成率
                  </span>
                  <div style={{ marginTop: 'var(--spacing-2)' }}>
                    <span
                      style={{
                        fontSize: 'var(--font-size-4xl)',
                        fontWeight: 700,
                        color: 'var(--color-success-500)',
                        lineHeight: 1,
                      }}
                    >
                      --%
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--color-success-50)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-success-500)',
                    fontSize: 22,
                  }}
                >
                  <RiseOutlined />
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="animate-fadeInUp" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
          <Card className="hover:shadow-md transition-shadow">
            <div className="p-5">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>
                    平均分数
                  </span>
                  <div style={{ marginTop: 'var(--spacing-2)' }}>
                    <span
                      style={{
                        fontSize: 'var(--font-size-4xl)',
                        fontWeight: 700,
                        color: 'var(--color-purple-500)',
                        lineHeight: 1,
                      }}
                    >
                      --
                    </span>
                    <span style={{ marginLeft: 4, fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                      分
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--radius-lg)',
                    background: 'rgba(155, 0, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-purple-500)',
                    fontSize: 22,
                  }}
                >
                  <TrophyOutlined />
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="animate-fadeInUp" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
          <Card className="hover:shadow-md transition-shadow">
            <div className="p-5">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>
                    活跃学员
                  </span>
                  <div style={{ marginTop: 'var(--spacing-2)' }}>
                    <span
                      style={{
                        fontSize: 'var(--font-size-4xl)',
                        fontWeight: 700,
                        color: 'var(--color-cyan-500)',
                        lineHeight: 1,
                      }}
                    >
                      --
                    </span>
                    <span style={{ marginLeft: 4, fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                      人
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--radius-lg)',
                    background: 'rgba(0, 199, 230, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-cyan-500)',
                    fontSize: 22,
                  }}
                >
                  <UserOutlined />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 数据看板占位 */}
      <div className="grid grid-cols-1 lg:grid-cols-24 gap-6">
        <div className="lg:col-span-16">
          <Card className="hover:shadow-md transition-shadow">
            <div className="p-5">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-5)' }}>
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
                  <BarChartOutlined />
                </div>
                <span style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>
                  学习趋势
                </span>
              </div>
              <EmptyState
                description="数据看板开发中..."
                subDescription="将展示团队学习趋势图表"
              />
            </div>
          </Card>
        </div>

        <div className="lg:col-span-8">
          <Card className="hover:shadow-md transition-shadow h-full">
            <div className="p-5">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-5)' }}>
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
                  <TrophyOutlined />
                </div>
                <span style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>
                  排行榜
                </span>
              </div>
              <EmptyState description="即将推出..." />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
