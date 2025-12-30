import React from 'react';
import {
  CheckCircle,
  Pencil,
  FileSearch,
  Plus,
  Send,
  Trophy,
  Users,
  Layout,
  GraduationCap
} from 'lucide-react';
import { useMentorDashboard } from '../api/mentor-dashboard';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { StatCard, PageHeader, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';


/**
 * 导师/室经理仪表盘组件
 * Sophisticated dashboard for Mentors and Managers.
 */
export const MentorDashboard: React.FC = () => {
  const { data, isLoading } = useMentorDashboard();
  const navigate = useNavigate();
  const { user, availableRoles, currentRole } = useAuth();

  const roleName = availableRoles.find((r) => r.code === currentRole)?.name || '导师';

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
        title={`${roleName}工作台`}
        subtitle={`欢迎回来，${user?.username || '老师'}。今天各项教学工作正有序进行。`}
        icon={<GraduationCap />}
        extra={
          <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-2xl border border-purple-100">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <span className="text-xs font-bold text-purple-700">
              待评分: {data?.pending_grading_count || 0}
            </span>
          </div>
        }
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="学员数量"
          value={data?.mentees_count || 0}
          icon={Users}
          color="var(--color-primary-500)"
          gradient="linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-primary-300) 100%)"
          delay="stagger-delay-1"
        />
        <StatCard
          title="任务完成率"
          value={data?.completion_rate || '0%'}
          icon={CheckCircle}
          color="var(--color-success-500)"
          gradient="linear-gradient(135deg, var(--color-success-500) 0%, var(--color-success-300) 100%)"
          delay="stagger-delay-2"
        />
        <StatCard
          title="平均分"
          value={data?.average_score || '0'}
          icon={Trophy}
          color="var(--color-purple-500)"
          gradient="linear-gradient(135deg, var(--color-purple-500) 0%, var(--color-purple-300) 100%)"
          delay="stagger-delay-3"
        />
        <StatCard
          title="待评分"
          value={data?.pending_grading_count || 0}
          icon={Pencil}
          color="var(--color-orange-500)"
          gradient="linear-gradient(135deg, var(--color-orange-500) 0%, var(--color-orange-300) 100%)"
          delay="stagger-delay-4"
        />
      </div>

      {/* 快捷操作 */}
      <div className="space-y-6 reveal-item stagger-delay-2">
        <h3 className="text-lg font-black text-gray-900 pl-2 flex items-center gap-2">
          <Layout className="w-5 h-5 text-primary-500" />
          快速开始
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: '发起抽查',
              description: '对学员进行知识抽查',
              icon: FileSearch,
              color: 'text-error-500',
              bg: 'bg-error-50',
              route: ROUTES.SPOT_CHECKS,
            },
            {
              title: '发布任务',
              description: '创建学习/练习/考试任务',
              icon: Send,
              color: 'text-primary-500',
              bg: 'bg-primary-50',
              route: `${ROUTES.TASKS}/create`,
            },
            {
              title: '新建试卷',
              description: '创建新的考试或练习试卷',
              icon: Plus,
              color: 'text-success-500',
              bg: 'bg-success-50',
              route: ROUTES.TEST_CENTER,
            },
            {
              title: '批改作业',
              description: '查看待批改的答卷',
              icon: Pencil,
              color: 'text-orange-500',
              bg: 'bg-orange-50',
              route: ROUTES.GRADING,
            },
          ].map((action, index) => (
            <div
              key={index}
              onClick={() => navigate(action.route)}
              className="group relative bg-white p-6 rounded-[2rem] shadow-sm border border-transparent hover:border-primary-100 hover:shadow-xl hover:shadow-primary-500/5 transition-all duration-300 cursor-pointer overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform duration-500" />
              <div className="relative z-10 flex flex-col gap-4">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:rotate-12", action.bg)}>
                  <action.icon className={cn("w-7 h-7", action.color)} />
                </div>
                <div>
                  <div className="text-lg font-black text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">{action.title}</div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">{action.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
