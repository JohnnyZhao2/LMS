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
            <div className="w-10 h-10 bg-white shadow-md rounded-xl flex items-center justify-center text-emerald-600 border border-slate-100">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">知识速递</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fresh Insights</p>
            </div>
          </div>
          <button
            onClick={() => roleNavigate('knowledge')}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1"
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
                className="group flex flex-col p-6 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-emerald-100/40 hover:border-emerald-100 cursor-pointer transition-all duration-300"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-md uppercase tracking-tighter">
                    最新
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {dayjs(knowledge.updated_at).format('YYYY.MM.DD')}
                  </span>
                </div>
                <h5 className="font-extrabold text-[#1e293b] mb-2 group-hover:text-emerald-600 transition-colors leading-snug line-clamp-1">
                  {knowledge.title}
                </h5>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium mb-4">
                  {knowledge.content_preview || '暂无详细内容'}
                </p>
                <div className="mt-auto flex items-center gap-1 text-[10px] font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition-all">
                  阅读详情 <TrendingUp className="w-3 h-3" />
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-10 bg-slate-50/50 rounded-3xl text-center border border-dashed border-slate-200 text-slate-400 font-bold">
              暂无知识更新
            </div>
          )}
        </div>
      </div>

      {/* 待办任务 - Grid Layout */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white shadow-md rounded-xl flex items-center justify-center text-indigo-600 border border-slate-100">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">任务中心</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Engagements</p>
            </div>
          </div>
          {data?.pending_tasks && data.pending_tasks.length > 0 && (
            <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black border border-indigo-100">
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
                  className="group relative flex flex-col p-6 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-100/50 hover:border-indigo-100 cursor-pointer transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                      isUrgent ? "bg-rose-50 text-rose-500" : "bg-indigo-50 text-indigo-500"
                    )}>
                      {task.task_title.includes('考试') ? <GraduationCap className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </div>
                    {isUrgent && (
                      <div className="px-2 py-0.5 bg-rose-500 text-white text-[9px] font-black rounded-md uppercase">
                        即将截止
                      </div>
                    )}
                  </div>

                  <h4 className="font-extrabold text-[#1e293b] text-base mb-4 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug h-12">
                    {task.task_title}
                  </h4>

                  <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock className={cn("w-3.5 h-3.5", isUrgent && "text-rose-500")} />
                      <span className={cn("text-[10px] font-bold", isUrgent ? "text-rose-500" : "text-slate-500")}>
                        {dayjs(task.deadline).format('MM.DD HH:mm')}
                      </span>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-16 bg-slate-50/50 rounded-3xl flex flex-col items-center justify-center text-center border border-dashed border-slate-200">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-4">
                <Trophy className="w-8 h-8 text-yellow-400" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-1">任务全部完成！</h4>
              <p className="text-xs text-slate-500 font-medium">所有的学习目标都已达成</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
