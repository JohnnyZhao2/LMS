import React from 'react';
import {
  BookOpen,
  FileText,
  Clock,
  Rocket,
  Trophy,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useStudentDashboard } from '../api/student-dashboard';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import dayjs from '@/lib/dayjs';
import { Card, Skeleton } from '@/components/ui';
import { StatusBadge } from '@/components/ui';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { cn } from '@/lib/utils';

/**
 * 空状态组件
 */
const EmptyState: React.FC<{ icon?: React.ReactNode; description: string }> = ({ icon, description }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center reveal-item">
    {icon && <div className="mb-4 transform hover:scale-110 transition-transform duration-500">{icon}</div>}
    <span className="text-gray-500 font-medium">{description}</span>
  </div>
);

/**
 * 进度环组件 - 极致视觉增强
 */
const ProgressCircle: React.FC<{
  percent: number;
  gradientStart: string;
  gradientEnd: string;
  size?: number;
  label: string;
}> = ({ percent, gradientStart, gradientEnd, size = 100, label }) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const gradientId = `progress-gradient-${label.replace(/\s/g, '-')}`;

  return (
    <div className="flex flex-col items-center group">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={gradientStart} />
              <stop offset="100%" stopColor={gradientEnd} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-gray-100)"
            strokeWidth={strokeWidth}
          />
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
            className="transition-all duration-1000 ease-out"
            filter="url(#glow)"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-gray-900 group-hover:scale-110 transition-transform">
            {percent}%
          </span>
        </div>
      </div>
      <span className="mt-3 text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</span>
    </div>
  );
};

/**
 * 学员仪表盘组件 - 极致美学重构
 */
export const StudentDashboard: React.FC = () => {
  const { data, isLoading } = useStudentDashboard();
  const navigate = useNavigate();
  const { user } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '早上好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Hero 欢迎区 - 玻璃拟态结合强渐变 */}
      <div
        className="reveal-item relative overflow-hidden rounded-[2rem] p-10 md:p-14 shadow-2xl border-none"
        style={{
          background: 'linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-purple-600) 100%)',
        }}
      >
        {/* 背景装饰球 */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 blur-3xl rounded-full" />
        <div className="absolute top-1/2 -left-12 w-48 h-48 bg-cyan-400/10 blur-2xl rounded-full" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-8">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-4 bg-white/10 w-fit px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10">
              <Rocket className="w-4 h-4 text-cyan-300 animate-pulse" />
              <span className="text-white/90 text-sm font-bold tracking-wide">
                {getGreeting()}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl text-white mb-6 leading-[1.1]">
              你好, <span className="font-black italic underline decoration-cyan-400/50 underline-offset-8">{user?.username || '学员'}</span>
              <br />
              <span className="text-white/80">又是一个进步的好时机！</span>
            </h1>
            <p className="text-white/60 text-lg max-w-md font-medium">
              你已经连续学习 12 天了，今天也要全力以赴哦。完成下面的任务领取你的今日成就。
            </p>
          </div>

          <div className="hidden lg:flex items-center gap-6 bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10">
            <div className="text-center px-4">
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">本月完成</p>
              <p className="text-white text-3xl font-black">{data?.pending_tasks ? 24 - data.pending_tasks.length : '--'}</p>
            </div>
            <div className="w-[1px] h-10 bg-white/10" />
            <div className="text-center px-4">
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">学习时长</p>
              <p className="text-white text-3xl font-black">42h</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* 待办任务 - 极致列表 */}
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center shadow-glow">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">待办任务</h3>
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Ongoing Tasks</p>
              </div>
            </div>
            {data?.pending_tasks && data.pending_tasks.length > 0 && (
              <span className="bg-primary-50 text-primary-600 px-3 py-1 rounded-full text-xs font-bold">
                {data.pending_tasks.length}
              </span>
            )}
          </div>

          <Card className="card-premium overflow-hidden border-none shadow-premium h-[calc(100%-4rem)]">
            <div className="p-2">
              {isLoading ? (
                <div className="space-y-3 p-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 rounded-2xl" />
                  ))}
                </div>
              ) : data?.pending_tasks && data.pending_tasks.length > 0 ? (
                <div className="space-y-2">
                  {data.pending_tasks.map((task, index) => {
                    const isUrgent = dayjs(task.deadline).diff(dayjs(), 'day') <= 1;

                    return (
                      <div
                        key={task.id}
                        onClick={() => navigate(`${ROUTES.TASKS}/${task.task_id}`)}
                        className={cn(
                          "reveal-item flex items-center gap-5 p-5 rounded-2xl hover:bg-gray-50 cursor-pointer transition-all duration-300 group",
                          `stagger-delay-${(index % 4) + 1}`
                        )}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold transition-transform group-hover:scale-110",
                          isUrgent ? "bg-red-50 text-red-500" : "bg-primary-50 text-primary-500"
                        )}>
                          {isUrgent ? '!' : '#'}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-bold text-gray-900 text-base truncate">
                              {task.task_title}
                            </span>
                            <StatusBadge status="processing" text="进行中" size="small" showIcon={false} className="opacity-70" />
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Clock className={cn("w-3.5 h-3.5", isUrgent && "text-red-500 animate-pulse")} />
                              <span className={isUrgent ? "text-red-500 font-bold" : ""}>
                                {dayjs(task.deadline).format('MM-DD HH:mm')} 截止
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-gray-300 group-hover:bg-primary-500 group-hover:text-white group-hover:border-primary-500 transition-all">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={<Trophy className="w-12 h-12 text-warning-500" />}
                  description="暂无待办，去休息一下吧"
                />
              )}
            </div>
          </Card>
        </div>

        {/* 最新知识 & 学习进度 */}
        <div className="lg:col-span-5 space-y-8">
          {/* 最新知识 */}
          <div>
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="w-10 h-10 bg-success-500 rounded-xl flex items-center justify-center shadow-lg shadow-success-500/20">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">最新资源</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Recent Knowledge</p>
              </div>
            </div>

            <Card className="card-premium border-none shadow-premium p-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-24 rounded-2xl" />
                  ))}
                </div>
              ) : data?.latest_knowledge && data.latest_knowledge.length > 0 ? (
                <div className="space-y-4">
                  {data.latest_knowledge.map((knowledge, index) => (
                    <div
                      key={knowledge.id}
                      onClick={() => navigate(`${ROUTES.KNOWLEDGE}/${knowledge.id}`)}
                      className={cn(
                        "reveal-item p-4 rounded-xl hover:bg-success-50/30 border border-transparent hover:border-success-100 cursor-pointer transition-all group",
                        `stagger-delay-${(index % 4) + 1}`
                      )}
                    >
                      <span className="font-bold text-gray-900 block mb-2 group-hover:text-success-600 transition-colors">
                        {knowledge.title}
                      </span>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
                        {knowledge.summary}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {dayjs(knowledge.updated_at).format('YYYY-MM-DD')}
                        </span>
                        <TrendingUp className="w-3.5 h-3.5 text-success-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState description="暂无最新知识" />
              )}
            </Card>
          </div>

          {/* 统计指标 */}
          <Card className="card-premium border-none shadow-xl bg-gray-900 p-8 flex justify-between items-center overflow-hidden relative">
            {/* 背景修饰 */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl -mr-16 -mt-16" />

            <div className="flex flex-col gap-8 flex-1">
              <ProgressCircle
                percent={75}
                gradientStart="var(--color-primary-400)"
                gradientEnd="var(--color-primary-600)"
                label="本月进度"
                size={70}
              />
              <div className="space-y-1">
                <p className="text-primary-400 text-[10px] font-bold uppercase tracking-tighter">Your Score</p>
                <p className="text-white text-3xl font-black italic">A+ <span className="text-sm font-normal text-white/40 not-italic ml-2">Top 5%</span></p>
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center justify-center p-4 bg-white/5 rounded-2xl backdrop-blur-md">
              <Trophy className="w-12 h-12 text-warning-500 animate-float" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
