import React from 'react';
import {
  Users,
  BarChart3,
  TrendingUp,
  Trophy,
  User,
  Users2
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { Card, StatCard, PageHeader, Skeleton } from '@/components/ui';

/**
 * 空状态组件
 */
const EmptyState: React.FC<{ description: string; subDescription?: string }> = ({ description, subDescription }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="text-gray-400 mb-2">
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
    <span className="text-gray-500 font-bold">{description}</span>
    {subDescription && (
      <span className="text-sm text-gray-400 mt-1 font-medium">
        {subDescription}
      </span>
    )}
  </div>
);

/**
 * 团队经理仪表盘组件
 * Sophisticated dashboard for Team Managers.
 */
export const TeamManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const isLoading = false; // Mock loading state if needed, or derived from data hooks

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
        title="团队经理工作台"
        subtitle={`欢迎回来，${user?.username || '经理'}。全面掌握团队学习动态。`}
        icon={<Users2 />}
      />

      {/* 统计概览 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="团队人数"
          value="--"
          icon={Users}
          color="var(--color-primary-500)"
          gradient="linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-primary-300) 100%)"
          delay="stagger-delay-1"
        />
        <StatCard
          title="平均完成率"
          value="--%"
          icon={TrendingUp}
          color="var(--color-success-500)"
          gradient="linear-gradient(135deg, var(--color-success-500) 0%, var(--color-success-300) 100%)"
          delay="stagger-delay-2"
        />
        <StatCard
          title="平均分数"
          value="--"
          icon={Trophy}
          color="var(--color-purple-500)"
          gradient="linear-gradient(135deg, var(--color-purple-500) 0%, var(--color-purple-300) 100%)"
          delay="stagger-delay-3"
        />
        <StatCard
          title="活跃学员"
          value="--"
          icon={User}
          color="var(--color-cyan-500)"
          gradient="linear-gradient(135deg, var(--color-cyan-500) 0%, var(--color-cyan-300) 100%)"
          delay="stagger-delay-4"
        />
      </div>

      {/* 数据看板占位 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 reveal-item stagger-delay-2">
        <div className="lg:col-span-8">
          <Card className="h-full border-none shadow-premium p-6 rounded-[2.5rem]">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary-500" />
              </div>
              <span className="font-black text-lg text-gray-900">
                学习趋势
              </span>
            </div>
            <EmptyState
              description="数据看板开发中..."
              subDescription="将展示团队学习趋势图表"
            />
          </Card>
        </div>

        <div className="lg:col-span-4">
          <Card className="h-full border-none shadow-premium p-6 rounded-[2.5rem]">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-success-50 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-success-500" />
              </div>
              <span className="font-black text-lg text-gray-900">
                排行榜
              </span>
            </div>
            <EmptyState description="即将推出..." />
          </Card>
        </div>
      </div>
    </div>
  );
};
