import React from 'react';
import {
  BookOpen,
  FileText,
  Clock,
  ArrowRight,
  TrendingUp,
  GraduationCap,
  Calendar,
  Trophy,
} from 'lucide-react';
import { useStudentDashboard } from '../api/student-dashboard';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import dayjs from '@/lib/dayjs';
import { Skeleton } from '@/components/ui';
import { IconBox } from '@/components/common';
import { cn } from '@/lib/utils';



/**
 * 学员仪表盘组件 - Simplified Essential Version
 */
export const StudentDashboard: React.FC = () => {
  const { data, isLoading } = useStudentDashboard();
  const { roleNavigate } = useRoleNavigate();

  return (
    <div className="space-y-12 pb-10 animate-in fade-in duration-500 pt-4">
      {/* 最新知识 - Horizontal Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <IconBox
              icon={BookOpen}
              size="md"
              bgColor="bg-white border border-gray-100"
              iconColor="text-secondary-600"
              rounded="xl"
              hoverScale={false}
            />
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">知识速递</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fresh Insights</p>
            </div>
          </div>
          <button
            onClick={() => roleNavigate('knowledge')}
            className="text-xs font-bold text-secondary-600 hover:text-secondary-700 transition-colors flex items-center gap-1"
          >
            查看全部 <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            [1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-40 rounded-3xl" />)
          ) : data?.latest_knowledge && data.latest_knowledge.length > 0 ? (
            data.latest_knowledge.map((knowledge) => (
              <div
                key={knowledge.id}
                onClick={() => roleNavigate(`knowledge/${knowledge.id}`)}
                className="group flex flex-col p-6 rounded-3xl bg-white border border-gray-100    hover:border-secondary-100 cursor-pointer transition-all duration-300"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 bg-secondary-50 text-secondary-600 text-[10px] font-black rounded-md uppercase tracking-tighter">
                    最新
                  </span>
                  <span className="text-[10px] font-bold text-gray-400">
                    {dayjs(knowledge.updated_at).format('YYYY.MM.DD')}
                  </span>
                </div>
                <h5 className="font-extrabold text-gray-800 mb-2 group-hover:text-secondary-600 transition-colors leading-snug line-clamp-1">
                  {knowledge.title}
                </h5>
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed font-medium mb-4">
                  {knowledge.content_preview || '暂无详细内容'}
                </p>
                <div className="mt-auto flex items-center gap-1 text-[10px] font-bold text-secondary-600 opacity-0 group-hover:opacity-100 transition-all">
                  阅读详情 <TrendingUp className="w-3 h-3" />
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-10 bg-gray-50/50 rounded-3xl text-center border border-dashed border-gray-200 text-gray-400 font-bold">
              暂无知识更新
            </div>
          )}
        </div>
      </div>

      {/* 待办任务 - Grid Layout */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <IconBox
              icon={Calendar}
              size="md"
              bgColor="bg-white border border-gray-100"
              iconColor="text-primary-600"
              rounded="xl"
              hoverScale={false}
            />
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">任务中心</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Engagements</p>
            </div>
          </div>
          {data?.pending_tasks && data.pending_tasks.length > 0 && (
            <div className="bg-primary-50 text-primary-600 px-3 py-1 rounded-full text-[10px] font-black border border-primary-100">
              {data.pending_tasks.length} 项进行中
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-44 rounded-3xl" />)
          ) : data?.pending_tasks && data.pending_tasks.length > 0 ? (
            data.pending_tasks.map((task) => {
              const now = dayjs();
              const deadline = dayjs(task.deadline);
              const isUrgent = deadline.isAfter(now) && deadline.diff(now, 'hour') <= 48;

              return (
                <div
                  key={task.id}
                  onClick={() => roleNavigate(`tasks/${task.task_id}`)}
                  className="group relative flex flex-col p-6 rounded-3xl bg-white border border-gray-100    hover:border-primary-100 cursor-pointer transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-4">
                    <IconBox
                      icon={task.task_title.includes('考试') ? GraduationCap : FileText}
                      size="md"
                      bgColor={isUrgent ? "bg-destructive-50" : "bg-primary-50"}
                      iconColor={isUrgent ? "text-destructive-500" : "text-primary-500"}
                      rounded="xl"
                      hoverScale={true}
                    />
                    {isUrgent && (
                      <div className="px-2 py-0.5 bg-destructive-500 text-white text-[9px] font-black rounded-md uppercase">
                        即将截止
                      </div>
                    )}
                  </div>

                  <h4 className="font-extrabold text-gray-800 text-base mb-4 group-hover:text-primary-600 transition-colors line-clamp-2 leading-snug h-12">
                    {task.task_title}
                  </h4>

                  <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Clock className={cn("w-3.5 h-3.5", isUrgent && "text-destructive-500")} />
                      <span className={cn("text-[10px] font-bold", isUrgent ? "text-destructive-500" : "text-gray-500")}>
                        {dayjs(task.deadline).format('MM.DD HH:mm')}
                      </span>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-primary-600 group-hover:text-white transition-all">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-16 bg-gray-50/50 rounded-3xl flex flex-col items-center justify-center text-center border border-dashed border-gray-200">
              <div className="w-16 h-16 bg-white rounded-2xl  flex items-center justify-center mb-4">
                <Trophy className="w-8 h-8 text-warning-400" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-1">任务全部完成！</h4>
              <p className="text-xs text-gray-500 font-medium">所有的学习目标都已达成</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
