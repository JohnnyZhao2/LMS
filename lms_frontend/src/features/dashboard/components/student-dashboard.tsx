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
 * 空状态组件 - Flat Design
 */
const EmptyState: React.FC<{ icon?: React.ReactNode; description: string }> = ({ icon, description }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    {icon && <div className="mb-4">{icon}</div>}
    <span className="text-[#6B7280] font-medium">{description}</span>
  </div>
);

/**
 * 进度环组件 - Flat Design (纯色，无渐变)
 */
const ProgressCircle: React.FC<{
  percent: number;
  color: string;
  size?: number;
  label: string;
}> = ({ percent, color, size = 100, label }) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center group">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-[#111827] group-hover:scale-110 transition-transform">
            {percent}%
          </span>
        </div>
      </div>
      <span className="mt-3 text-xs font-semibold text-[#6B7280] uppercase tracking-widest">{label}</span>
    </div>
  );
};

/**
 * 学员仪表盘组件 - Flat Design 版本
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
      {/* Hero 欢迎区 - Flat Design: 纯色背景 */}
      <div className="relative overflow-hidden rounded-lg p-10 md:p-14 bg-[#3B82F6]">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-8">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-4 bg-white/20 w-fit px-4 py-1.5 rounded-md">
              <Rocket className="w-4 h-4 text-white" />
              <span className="text-white/90 text-sm font-semibold tracking-wide">
                {getGreeting()}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl text-white mb-6 leading-[1.1] font-bold">
              你好, <span className="font-bold">{user?.username || '学员'}</span>
              <br />
              <span className="text-white/80">又是一个进步的好时机！</span>
            </h1>
            <p className="text-white/60 text-lg max-w-md font-medium">
              你已经连续学习 12 天了，今天也要全力以赴哦。完成下面的任务领取你的今日成就。
            </p>
          </div>

          <div className="hidden lg:flex items-center gap-6 bg-white/10 p-6 rounded-lg">
            <div className="text-center px-4">
              <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-1">本月完成</p>
              <p className="text-white text-3xl font-bold">{data?.pending_tasks ? 24 - data.pending_tasks.length : '--'}</p>
            </div>
            <div className="w-[2px] h-10 bg-white/20" />
            <div className="text-center px-4">
              <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-1">学习时长</p>
              <p className="text-white text-3xl font-bold">42h</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* 待办任务 */}
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#3B82F6] rounded-md flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#111827]">待办任务</h3>
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest">Ongoing Tasks</p>
              </div>
            </div>
            {data?.pending_tasks && data.pending_tasks.length > 0 && (
              <span className="bg-[#DBEAFE] text-[#3B82F6] px-3 py-1 rounded-md text-xs font-bold">
                {data.pending_tasks.length}
              </span>
            )}
          </div>

          <Card className="overflow-hidden h-[calc(100%-4rem)] bg-[#F3F4F6] rounded-lg">
            <div className="p-2">
              {isLoading ? (
                <div className="space-y-3 p-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                  ))}
                </div>
              ) : data?.pending_tasks && data.pending_tasks.length > 0 ? (
                <div className="space-y-2">
                  {data.pending_tasks.map((task) => {
                    const isUrgent = dayjs(task.deadline).diff(dayjs(), 'day') <= 1;

                    return (
                      <div
                        key={task.id}
                        onClick={() => navigate(`${ROUTES.TASKS}/${task.task_id}`)}
                        className="flex items-center gap-5 p-5 rounded-lg bg-white hover:scale-[1.01] cursor-pointer transition-all duration-200 group"
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-md flex items-center justify-center text-xl font-bold transition-transform group-hover:scale-110",
                          isUrgent ? "bg-[#FEE2E2] text-[#EF4444]" : "bg-[#DBEAFE] text-[#3B82F6]"
                        )}>
                          {isUrgent ? '!' : '#'}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-bold text-[#111827] text-base truncate">
                              {task.task_title}
                            </span>
                            <StatusBadge status="processing" text="进行中" size="small" showIcon={false} />
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                              <Clock className={cn("w-3.5 h-3.5", isUrgent && "text-[#EF4444]")} />
                              <span className={isUrgent ? "text-[#EF4444] font-bold" : ""}>
                                {dayjs(task.deadline).format('MM-DD HH:mm')} 截止
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="w-10 h-10 rounded-md bg-[#F3F4F6] flex items-center justify-center text-[#9CA3AF] group-hover:bg-[#3B82F6] group-hover:text-white transition-all">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={<Trophy className="w-12 h-12 text-[#F59E0B]" />}
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
              <div className="w-10 h-10 bg-[#10B981] rounded-md flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#111827]">最新资源</h3>
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest">Recent Knowledge</p>
              </div>
            </div>

            <Card className="bg-[#F3F4F6] rounded-lg p-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-24 rounded-lg" />
                  ))}
                </div>
              ) : data?.latest_knowledge && data.latest_knowledge.length > 0 ? (
                <div className="space-y-4">
                  {data.latest_knowledge.map((knowledge) => (
                    <div
                      key={knowledge.id}
                      onClick={() => navigate(`${ROUTES.KNOWLEDGE}/${knowledge.id}`)}
                      className="p-4 rounded-lg bg-white hover:scale-[1.01] cursor-pointer transition-all group"
                    >
                      <span className="font-bold text-[#111827] block mb-2 group-hover:text-[#10B981] transition-colors">
                        {knowledge.title}
                      </span>
                      <p className="text-xs text-[#6B7280] line-clamp-2 mb-3 leading-relaxed">
                        {knowledge.summary}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
                          {dayjs(knowledge.updated_at).format('YYYY-MM-DD')}
                        </span>
                        <TrendingUp className="w-3.5 h-3.5 text-[#10B981] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState description="暂无最新知识" />
              )}
            </Card>
          </div>

          {/* 统计指标 - Flat Design: 纯色背景 */}
          <Card className="bg-[#111827] p-8 flex justify-between items-center overflow-hidden relative rounded-lg">
            <div className="flex flex-col gap-8 flex-1">
              <ProgressCircle
                percent={75}
                color="#3B82F6"
                label="本月进度"
                size={70}
              />
              <div className="space-y-1">
                <p className="text-[#60A5FA] text-[10px] font-semibold uppercase tracking-tighter">Your Score</p>
                <p className="text-white text-3xl font-bold">A+ <span className="text-sm font-normal text-white/40 ml-2">Top 5%</span></p>
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center justify-center p-4 bg-white/10 rounded-lg">
              <Trophy className="w-12 h-12 text-[#F59E0B]" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
