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
import type { StudentDashboardTask } from '@/types/dashboard';
import { cn } from '@/lib/utils';

import { MiniCalendar } from './mini-calendar';
import { EditorialCard } from './editorial-card';
import { KnowledgeItem, TaskItem } from './items';

interface DashboardSectionHeaderProps {
  title: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  action?: React.ReactNode;
  accentColor?: string;
}

const DashboardSectionHeader: React.FC<DashboardSectionHeaderProps> = ({
  title,
  icon: Icon,
  action,
  accentColor = 'text-primary',
}) => (
  <div className="flex items-center justify-between px-1">
    <div className="flex items-center gap-2.5">
      <Icon className={cn("h-3.5 w-3.5 opacity-45", accentColor)} strokeWidth={2.5} />
      <h3 className="truncate text-[10px] font-bold leading-none tracking-[0.24em] text-muted-foreground/80 uppercase">
        {title}
      </h3>
    </div>
    {action}
  </div>
);

export const StudentDashboard: React.FC = () => {
  const { data, isLoading } = useStudentDashboard(4, 4);
  const { roleNavigate } = useRoleNavigate();
  const [selectedTask, setSelectedTask] = React.useState<StudentDashboardTask | null>(null);

  const { data: participants, isLoading: participantsLoading } = useTaskParticipants(
    selectedTask?.task_id ?? null
  );

  const stats = data?.stats;
  const tasks = (data?.tasks || []).slice(0, 4);
  const latestKnowledge = (data?.latest_knowledge || []).slice(0, 4);
  const visibleParticipants = (participants || []).slice(0, 2);

  return (
    <div className="grid min-h-0 w-full flex-1 grid-rows-[auto_minmax(0,1fr)] gap-4 pb-4 pt-1 font-sans">
      {/* 统计横栏 */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="进行中" value={stats?.in_progress_count ?? 0} icon={Activity} accentClassName="bg-primary-500" size="sm" />
        <StatCard title="即将截止" value={stats?.urgent_count ?? 0} icon={AlertCircle} accentClassName="bg-rose-500" size="sm" />
        <StatCard title="完成率" value={`${stats?.completion_rate ?? 0}%`} icon={CheckCircle2} accentClassName="bg-emerald-500" size="sm" />
        <StatCard title="考试均分" value={stats?.exam_avg_score ?? '-'} icon={GraduationCap} accentClassName="bg-amber-500" size="sm" />
      </div>

      <div className="grid min-h-0 gap-4 xl:grid-cols-12 xl:grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* 知识速递 */}
          <div className="min-h-0 min-w-0 xl:col-span-9 xl:row-start-1 xl:h-full">
            <div className="flex min-h-0 flex-col gap-3 xl:h-full">
              <DashboardSectionHeader
                title="知识速递"
                icon={BookOpen}
                accentColor="text-teal-500"
                action={
                  <button
                    onClick={() => roleNavigate('knowledge')}
                    className="group/btn flex items-center gap-1.5 text-xs font-semibold text-muted-foreground/55 transition-colors duration-300 hover:text-foreground"
                  >
                    探索大千世界
                    <ArrowRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-1" />
                  </button>
                }
              />
              <div className="overflow-visible xl:min-h-0 xl:flex-1">
                <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 xl:min-h-full xl:grid-cols-4 xl:grid-rows-1 xl:pr-1">
                  {isLoading ? [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-full min-h-[156px] rounded-xl" />) :
                    latestKnowledge.map((k) => (
                      <KnowledgeItem key={k.id} knowledge={k} navigate={roleNavigate} />
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* 任务中心 */}
          <div className="min-h-0 min-w-0 xl:col-span-9 xl:row-start-2 xl:h-full">
            <div className="flex min-h-0 flex-col gap-3 xl:h-full">
              <DashboardSectionHeader
                title="任务中心"
                icon={CalendarIcon}
                accentColor="text-sky-500"
              />
              <div className="overflow-visible xl:min-h-0 xl:flex-1">
                <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 xl:min-h-full xl:grid-cols-4 xl:grid-rows-1 xl:pr-1">
                  {isLoading ? [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-full min-h-[168px] rounded-xl" />) :
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
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:contents">
            <div className="min-h-0 min-w-0 xl:col-span-3 xl:col-start-10 xl:row-start-1 xl:h-full">
              <MiniCalendar
                selectedTask={selectedTask}
                className="xl:h-full"
              />
            </div>

            {/* 同伴进度 */}
            <div className="min-h-0 min-w-0 xl:col-span-3 xl:col-start-10 xl:row-start-2 xl:h-full">
              <EditorialCard
                title="同伴进度"
                icon={TrendingUp}
                accentColor="text-violet-500"
                className="min-h-0 xl:h-full"
              >
                <div className="flex flex-col overflow-visible pt-1 xl:min-h-0 xl:flex-1">
                  {!selectedTask ? (
                    <div className="px-1 py-2">
                      <p className="text-[10px] font-black tracking-[0.18em] text-slate-400/55">
                        选择任务查看同伴进度
                      </p>
                    </div>
                  ) : participantsLoading ? (
                    <div className="space-y-4 px-1 py-2">
                      {[1, 2].map(i => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton className="h-6 w-6 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <Skeleton className="h-3 w-14 rounded" />
                              <Skeleton className="h-3 w-8 rounded" />
                            </div>
                            <Skeleton className="h-[2px] w-full rounded-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : visibleParticipants.length > 0 ? (
                    <div className="flex flex-col gap-2 px-1 py-2">
                      {visibleParticipants.map((p, index) => (
                        <div
                          key={p.id}
                          className={cn(
                            "group/peer flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-all duration-500",
                            p.is_me
                              ? "bg-primary/[0.03] shadow-[0_10px_30px_-10px_rgba(var(--primary-rgb),0.05)]"
                              : "hover:bg-slate-50"
                          )}
                        >
                          <div className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center text-[11px] font-black italic tracking-tighter transition-transform duration-500 group-hover/peer:scale-110",
                            index === 0 ? "text-amber-500" :
                              index === 1 ? "text-slate-400" :
                                "text-slate-300"
                          )}>
                            {String(index + 1).padStart(2, '0')}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="mb-1.5 flex items-center justify-between">
                              <span className={cn(
                                "truncate text-[12px] font-bold tracking-tight transition-colors",
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

                            <div className="h-[2px] w-full overflow-hidden rounded-full bg-slate-100">
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
                    <div className="px-1 py-2">
                      <p className="text-[10px] font-black tracking-[0.18em] text-slate-400/55">
                        暂无参与者
                      </p>
                    </div>
                  )}
                </div>
              </EditorialCard>
            </div>
          </div>
        </div>
    </div>
  );
};
