import React from 'react';
import {
  BookOpen,
  ArrowRight,
  TrendingUp,
  Calendar as CalendarIcon,
  Activity,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
} from 'lucide-react';
import { useStudentDashboard, useTaskParticipants } from '../../api/student-dashboard';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import type { StudentDashboardTask } from '@/types/api';
import { cn } from '@/lib/utils';

import { MiniCalendar } from './mini-calendar';
import { EditorialCard } from './editorial-card';
import { KnowledgeItem, TaskItem } from './items';

export const StudentDashboard: React.FC = () => {
  const { data, isLoading } = useStudentDashboard();
  const { roleNavigate } = useRoleNavigate();
  const [selectedTask, setSelectedTask] = React.useState<StudentDashboardTask | null>(null);

  const { data: participants, isLoading: participantsLoading } = useTaskParticipants(
    selectedTask?.task_id ?? null
  );

  const stats = data?.stats;
  const tasks = data?.tasks || [];

  return (
    <div className="space-y-6 pb-8 pt-1 font-sans animate-in fade-in slide-in-from-bottom-4 duration-1000 2xl:space-y-5">
      {/* 统计横栏 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:gap-5">
        <StatCard title="进行中" value={stats?.in_progress_count ?? 0} icon={Activity} accentClassName="bg-primary-500" size="sm" />
        <StatCard title="即将截止" value={stats?.urgent_count ?? 0} icon={AlertCircle} accentClassName="bg-rose-500" size="sm" />
        <StatCard title="完成率" value={`${stats?.completion_rate ?? 0}%`} icon={CheckCircle2} accentClassName="bg-emerald-500" size="sm" />
        <StatCard title="考试均分" value={stats?.exam_avg_score ?? '-'} icon={GraduationCap} accentClassName="bg-amber-500" size="sm" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 2xl:gap-6">
        {/* 知识速递 */}
        <div className="min-w-0 xl:col-span-8 xl:h-full">
          <EditorialCard
            title="知识速递"
            icon={BookOpen}
            accentColor="text-teal-500"
            className="h-full overflow-visible"
            action={
              <button
                onClick={() => roleNavigate('knowledge')}
                className="group/btn flex items-center gap-1.5 text-xs font-semibold text-muted-foreground/50 hover:text-primary transition-all duration-300"
              >
                探索大千世界
                <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            }
          >
            <div className="grid h-full grid-cols-[repeat(auto-fit,minmax(17.5rem,1fr))] gap-3">
              {isLoading ? [1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-[88px] rounded-xl" />) :
                data?.latest_knowledge?.map((k) => (
                  <KnowledgeItem key={k.id} knowledge={k} navigate={roleNavigate} />
                ))}
            </div>
          </EditorialCard>
        </div>

        {/* 迷你日历 */}
        <div className="min-w-0 xl:col-span-4 xl:h-full">
          <MiniCalendar selectedTask={selectedTask} />
        </div>

        {/* 任务中心 */}
        <div className="min-w-0 xl:col-span-8 xl:h-full">
          <EditorialCard
            title="任务中心"
            icon={CalendarIcon}
            accentColor="text-sky-500"
            className="h-full"
          >
            <div className="grid grid-cols-[repeat(auto-fit,minmax(19rem,1fr))] gap-3">
              {isLoading ? [1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-24 rounded-xl" />) :
                tasks.map(t => (
                  <TaskItem
                    key={t.id}
                    task={t}
                    isSelected={selectedTask?.id === t.id}
                    onSelect={() => setSelectedTask(selectedTask?.id === t.id ? null : t)}
                    onNavigate={() => roleNavigate(`tasks/${t.task_id}?from=dashboard`)}
                  />
                ))}
            </div>
          </EditorialCard>
        </div>

        {/* 同伴进度 */}
        <div className="min-w-0 xl:col-span-4 xl:h-full">
          <EditorialCard
            title="同伴进度"
            icon={TrendingUp}
            accentColor="text-violet-500"
            className="h-full"
          >
            <div className="flex flex-col space-y-1 pt-1">
              {!selectedTask ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-4">
                  <div className="p-4 rounded-full bg-slate-50 overflow-hidden relative group/icon">
                    <TrendingUp className="w-8 h-8 opacity-20 group-hover/icon:scale-110 transition-transform duration-500" strokeWidth={0.5} />
                  </div>
                  <p className="text-[10px] font-black tracking-[0.25em] text-slate-400/40">选择任务查看同伴进度</p>
                </div>
              ) : participantsLoading ? (
                <div className="space-y-6 px-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="flex-1 space-y-3">
                        <div className="flex justify-between items-center">
                          <Skeleton className="h-3 w-1/4 rounded" />
                          <Skeleton className="h-3 w-8 rounded" />
                        </div>
                        <Skeleton className="h-[1.5px] w-full rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : participants && participants.length > 0 ? (
                <div className="flex flex-col gap-1 px-1">
                  {participants.map((p, index) => (
                    <div
                      key={p.id}
                      className={cn(
                        "group/peer flex items-center gap-5 p-3.5 rounded-xl transition-all duration-500",
                        p.is_me
                          ? "bg-primary/[0.03] shadow-[0_10px_30px_-10px_rgba(var(--primary-rgb),0.05)]"
                          : "hover:bg-slate-50"
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 flex items-center justify-center text-[13px] font-black italic tracking-tighter shrink-0 transition-transform group-hover/peer:scale-110 duration-500",
                        index === 0 ? "text-amber-500 font-black" :
                          index === 1 ? "text-slate-400" :
                            index === 2 ? "text-orange-400" :
                              "text-slate-200"
                      )}>
                        {String(index + 1).padStart(2, '0')}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className={cn(
                            "text-[13px] font-bold tracking-tight transition-colors",
                            p.is_me ? "text-primary" : "text-slate-600"
                          )}>
                            {p.is_me ? '我' : p.name}
                          </span>
                          <span className={cn(
                            "text-[10px] font-black transition-colors",
                            p.is_me ? "text-primary/70" : "text-slate-300"
                          )}>
                            {Math.round(p.progress)}%
                          </span>
                        </div>

                        <div className="h-[1.5px] w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all duration-1000 ease-out",
                              p.is_me ? "bg-primary" : "bg-slate-300/40"
                            )}
                            style={{ width: `${p.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300/40 gap-3">
                  <TrendingUp className="w-6 h-6 opacity-20" strokeWidth={0.5} />
                  <p className="text-[10px] font-black tracking-widest">暂无参与者</p>
                </div>
              )}
            </div>
          </EditorialCard>
        </div>
      </div>
    </div>
  );
};
