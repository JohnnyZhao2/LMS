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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useStudentDashboard, useTaskParticipants } from '../api/student-dashboard';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import dayjs from '@/lib/dayjs';
import { Skeleton, Card, Button } from '@/components/ui';
import { StatCard } from '@/components/ui/stat-card';
import type { LatestKnowledge, StudentDashboardTask } from '@/types/api';
import { cn } from '@/lib/utils';

/**
 * 迷你学习日历 - 北欧社论风格 + 任务截止日期功能
 */
interface MiniCalendarProps {
  className?: string;
  selectedTask?: StudentDashboardTask | null;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ className, selectedTask }) => {
  const today = dayjs();
  const [displayDate, setDisplayDate] = React.useState(dayjs());

  // 选择任务时自动跳转到截止日期月份
  React.useEffect(() => {
    if (selectedTask) {
      setDisplayDate(dayjs(selectedTask.deadline));
    }
  }, [selectedTask]);

  const monthNum = displayDate.format('MM');
  const year = displayDate.format('YYYY');
  const daysInMonth = displayDate.daysInMonth();
  const startDay = displayDate.startOf('month').day();

  const isCurrentMonth = displayDate.isSame(today, 'month');
  const currentDay = today.date();

  const deadlineDay = selectedTask ? dayjs(selectedTask.deadline).date() : null;
  const isDeadlineMonth = selectedTask ? displayDate.isSame(dayjs(selectedTask.deadline), 'month') : false;

  const goToToday = () => setDisplayDate(dayjs());
  const prevMonth = () => setDisplayDate(displayDate.subtract(1, 'month'));
  const nextMonth = () => setDisplayDate(displayDate.add(1, 'month'));

  return (
    <Card className={cn(
      "relative border-border/40 bg-card shadow-xl shadow-slate-200/30 dark:shadow-none flex flex-col overflow-hidden group/calendar transition-all duration-700 hover:shadow-primary/5 h-full",
      className
    )}>
      <style>{`
        @keyframes draw {
          from { stroke-dashoffset: 400; }
          to { stroke-dashoffset: 0; }
        }
        .animate-draw {
          animation: draw 1.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
      `}</style>

      {/* 纸张纹理 */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[image:var(--noise-texture)]" />
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-muted/50 to-transparent opacity-50" />

      {/* 顶部标题区 */}
      <div className="relative z-10 px-6 pt-5 pb-2">
        <div className="relative flex flex-col pl-0.5">
          {/* 年份水印 - 触碰底部虚线对齐 */}
          <span className="absolute right-0 bottom-[-12px] text-[70px] font-black text-foreground/[0.03] tracking-tighter leading-none italic select-none">
            {year}
          </span>

          {/* 月份 + 切换按钮 */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/40 hover:text-foreground" onClick={prevMonth}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-3xl font-black text-foreground tracking-tighter leading-none">
              {monthNum}
            </span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/40 hover:text-foreground" onClick={nextMonth}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            {!isCurrentMonth && (
              <Button variant="ghost" size="sm" className="text-[9px] h-5 px-2 text-muted-foreground/50 hover:text-foreground font-bold ml-1" onClick={goToToday}>
                今日
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 撕纸虚线 */}
      <div className="relative z-10 mx-6 border-b border-dashed border-border/50" />

      {/* 日历主体 */}
      <div className="relative z-10 px-6 pb-6 pt-3 flex-1 flex flex-col">
        <div className="grid grid-cols-7 mb-4">
          {['日', '一', '二', '三', '四', '五', '六'].map((d, i) => (
            <span key={d} className={cn(
              "text-[8px] font-black text-center tracking-[0.2em]",
              (i === 0 || i === 6) ? "text-rose-400/60" : "text-muted-foreground/40"
            )}>{d}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-0 gap-x-0.5">
          {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} className="aspect-square" />)}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isToday = isCurrentMonth && day === currentDay;
            const isDeadline = isDeadlineMonth && day === deadlineDay;

            return (
              <div key={day} className="aspect-square relative flex items-center justify-center">
                {/* 1. 今日：外部精密对焦框架 (Today Focus Frame) */}
                {isToday && (
                  <div className="absolute inset-1 pointer-events-none transition-all duration-500">
                    <div className="absolute top-0 left-0 w-3 h-3 border-t-[1.5px] border-l-[1.5px] border-slate-400/60" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-[1.5px] border-r-[1.5px] border-slate-400/60" />
                  </div>
                )}

                {/* 2. 截止日期：内部印鉴盒 (Deadline Seal Case) */}
                {isDeadline && (
                  <div className="absolute inset-[6px] flex items-center justify-center pointer-events-none">
                    {/* 背景：超淡衬线影纹 */}
                    <span className="absolute text-[6px] font-serif font-black uppercase tracking-widest text-rose-600/[0.04] rotate-[-12deg] scale-[1.2]">
                      DEAD
                    </span>
                    {/* 阶梯压印框 */}
                    <div className="absolute inset-0 border-[1.5px] border-rose-600/20 rotate-[-4deg]">
                      {/* 嵌套在边框上的精致标签 - 移除背景块 */}
                      <span className="absolute -top-1.5 left-0.5 text-[5px] font-black text-rose-600/40 tracking-tighter">D.L.</span>
                    </div>
                    <div className="absolute inset-[2.5px] border-[0.5px] border-rose-600/10 rotate-[2deg]" />
                  </div>
                )}

                <span className={cn(
                  "relative z-10 transition-all duration-300",
                  isToday ? "text-[14px] font-[900] text-slate-800 dark:text-white scale-110 tracking-tighter" :
                    isDeadline ? "text-[12px] font-serif font-black text-rose-600/80 scale-105" :
                      "text-[11px] font-bold text-muted-foreground/30 hover:text-foreground hover:scale-110"
                )}>
                  {day}
                </span>
              </div>
            );
          })}
        </div>

        {/* 底部任务提示 */}
        <div className="mt-auto pt-3 border-t border-dashed border-border/30">
          {selectedTask ? (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground/60 truncate max-w-[55%] uppercase tracking-wider">
                {selectedTask.task_title}
              </span>
              <span className="text-[10px] font-black text-primary">
                剩余 {dayjs(selectedTask.deadline).startOf('day').diff(today.startOf('day'), 'day')} 天
              </span>
            </div>
          ) : (
            <p className="text-[9px] text-muted-foreground/40 text-center font-bold tracking-widest uppercase">选择任务查看截止日期</p>
          )}
        </div>
      </div>
    </Card >
  );
};

/**
 * 卡片容器 - 图标+文字标题，保留质感
 */
const EditorialCard: React.FC<{
  title: string;
  icon: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  accentColor?: string;
}> = ({ title, icon: Icon, action, children, className, accentColor = "text-primary" }) => {

  return (
    <Card className={cn(
      "relative overflow-hidden border-border/50 bg-card transition-all duration-500 group/card flex flex-col",
      "hover:shadow-[0_12px_40px_rgba(0,0,0,0.04)] hover:border-primary/20",
      className
    )}>
      {/* 噪点纹理 - 与 StatCard 保持一致 */}
      <div className="absolute inset-0 opacity-[0.4] mix-blend-soft-light pointer-events-none z-0 bg-[image:var(--noise-texture)] brightness-100 contrast-150" />

      {/* 头部 - 建筑级美学布局 */}
      <div className="relative z-10 px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={cn("w-4 h-4 opacity-40", accentColor)} strokeWidth={2.5} />
          <h3 className="font-bold text-muted-foreground/80 uppercase tracking-[0.25em] leading-none text-[11px] truncate group-hover/card:text-foreground transition-colors duration-300">
            {title}
          </h3>
        </div>
        {action}
      </div>

      {/* 内容区 */}
      <div className="relative z-10 px-8 pb-8 pt-2 flex-1 flex flex-col">
        {children}
      </div>
    </Card>
  );
};

const KnowledgeItem: React.FC<{ knowledge: LatestKnowledge; navigate: (path: string) => void }> = ({ knowledge, navigate }) => {
  return (
    <div
      onClick={() => navigate(`knowledge/${knowledge.id}?from=dashboard`)}
      className={cn(
        "group relative p-6 rounded-[22px] transition-all duration-500 cursor-pointer flex flex-col h-[100px] overflow-hidden",
        "bg-slate-50/40 dark:bg-card/40 border border-slate-200/30 dark:border-white/5",
        "hover:bg-white dark:hover:bg-slate-900 hover:shadow-[0_15px_40px_-15px_rgba(0,0,0,0.06)] hover:border-slate-200 dark:hover:border-white/10 hover:-translate-y-0.5 active:scale-[0.98]"
      )}
    >
      <div className="relative z-10 w-full flex h-full items-stretch">
        {/* 内容主场 */}
        <div className="flex-1 min-w-0 pr-8 flex flex-col justify-center">
          <h5 className="text-[16px] font-bold text-slate-800 dark:text-slate-100 truncate tracking-tight leading-none mb-3 group-hover:text-primary transition-colors">
            {knowledge.title}
          </h5>
          <p className="text-[12px] text-slate-400/80 line-clamp-1 break-all font-medium leading-none tracking-tight">
            {knowledge.summary || knowledge.content_preview || "点击进入深度学习..."}
          </p>
        </div>

        {/* 垂直分割线 */}
        <div className="w-[1px] bg-slate-200/50 dark:bg-white/5 h-10 my-auto" />

        {/* 右侧元数据 */}
        <div className="w-[84px] flex flex-col items-center justify-center relative gap-1">
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400/40 opacity-0 group-hover:opacity-100 transition-all duration-500">
            {dayjs(knowledge.updated_at).format('YYYY')}
          </span>

          <span className="text-[11px] font-mono font-bold text-slate-400/60 tracking-wider group-hover:text-slate-600 transition-colors duration-500">
            {dayjs(knowledge.updated_at).format('MM.DD')}
          </span>

          <div className="h-4 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-500">
              <ArrowRight className="w-3.5 h-3.5 text-primary/50 stroke-[2.5]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TaskItem: React.FC<{ task: StudentDashboardTask; isSelected: boolean; onSelect: () => void; onNavigate: () => void }> = ({ task, isSelected, onSelect, onNavigate }) => {
  const isCompleted = task.status === 'COMPLETED';
  const progress = task.progress?.percentage ?? 0;

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative p-6 rounded-[22px] transition-all duration-500 cursor-pointer flex items-center gap-6",
        isSelected
          ? "bg-white dark:bg-slate-900 shadow-[0_15px_40px_-15px_rgba(0,0,0,0.06)] border border-slate-200 dark:border-white/10 scale-[1.01]"
          : "bg-slate-50/40 dark:bg-card/40 border border-slate-200/30 dark:border-white/5 hover:bg-slate-50/80"
      )}
    >
      {/* 内容主场 */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h5 className={cn(
          "text-[16px] font-bold tracking-tight mb-3 transition-colors",
          isCompleted ? "text-slate-300 line-through" : "text-slate-800 dark:text-slate-100",
          isSelected && !isCompleted && "text-primary"
        )}>
          {task.task_title}
        </h5>
        {!isCompleted && (
          <div className="flex items-center gap-3">
            <div className="w-20 h-[1.5px] bg-slate-200/50 dark:bg-white/5 rounded-full overflow-hidden">
              <div
                className={cn("h-full transition-all duration-1000", isSelected ? "bg-primary" : "bg-slate-300/40")}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {Math.round(progress)}%
            </span>
          </div>
        )}
      </div>

      {/* 垂直分割线 */}
      <div className="w-[1px] bg-slate-200/50 dark:bg-white/5 h-10 my-auto" />

      {/* 右侧元数据与动作 - 智能交互展示逻辑 */}
      <div className="w-[84px] flex flex-col items-center justify-center relative gap-1">
        {/* 年份：仅在选中或聚焦时显现 */}
        <span className={cn(
          "text-[9px] font-mono font-bold uppercase tracking-widest transition-all duration-500",
          isSelected ? "text-primary/40 opacity-100" : "text-slate-400/40 opacity-0 group-hover:opacity-100"
        )}>
          {dayjs(task.deadline).format('YYYY')}
        </span>

        {/* 核心展示区：状态图标与日期的智能切换 */}
        <div className="relative h-4 flex items-center justify-center w-full">
          {isCompleted && (
            <div className={cn(
              "absolute transition-all duration-500",
              isSelected ? "opacity-0 scale-50" : "opacity-100 scale-100 group-hover:opacity-0 group-hover:scale-50"
            )}>
              <CheckCircle2 className="w-4 h-4 text-emerald-500/60" strokeWidth={2.5} />
            </div>
          )}

          <span className={cn(
            "text-[11px] font-mono font-bold tracking-wider transition-all duration-500",
            isCompleted
              ? (isSelected ? "opacity-100 scale-100 text-primary" : "opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 group-hover:text-slate-500")
              : (isSelected ? "text-primary" : "text-slate-400/60 group-hover:text-slate-500")
          )}>
            {dayjs(task.deadline).format('MM.DD')}
          </span>
        </div>

        {/* 箭头：滑入动画 - 点击跳转 */}
        <div className="h-4 flex items-center justify-center">
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate(); }}
            className={cn(
              "transition-all duration-500 hover:scale-125",
              isSelected
                ? "opacity-100 translate-y-0 text-primary"
                : "opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 text-primary/40"
            )}
          >
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const StudentDashboard: React.FC = () => {
  const { data, isLoading } = useStudentDashboard();
  const { roleNavigate } = useRoleNavigate();
  const [selectedTask, setSelectedTask] = React.useState<StudentDashboardTask | null>(null);

  // 获取选中任务的参与者进度
  const { data: participants, isLoading: participantsLoading } = useTaskParticipants(
    selectedTask?.task_id ?? null
  );

  const stats = data?.stats;
  const tasks = data?.tasks || [];

  return (
    <div className="space-y-12 pb-14 animate-in fade-in slide-in-from-bottom-4 duration-1000 pt-2 font-sans">
      {/* 统计横栏 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="进行中" value={stats?.in_progress_count ?? 0} icon={Activity} accentClassName="bg-primary-500" />
        <StatCard title="即将截止" value={stats?.urgent_count ?? 0} icon={AlertCircle} accentClassName="bg-rose-500" />
        <StatCard title="完成率" value={`${stats?.completion_rate ?? 0}%`} icon={CheckCircle2} accentClassName="bg-emerald-500" />
        <StatCard title="考试均分" value={stats?.exam_avg_score ?? '-'} icon={GraduationCap} accentClassName="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* 知识速递 (8) */}
        <div className="lg:col-span-8">
          <EditorialCard
            title="知识速递"
            icon={BookOpen}
            accentColor="text-teal-500"
            className="overflow-visible"
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
              {isLoading ? [1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-[96px] rounded-xl" />) :
                data?.latest_knowledge?.slice(0, 6).map((k) => (
                  <KnowledgeItem key={k.id} knowledge={k} navigate={roleNavigate} />
                ))}
            </div>
          </EditorialCard>
        </div>

        {/* 迷你日历 (4) */}
        <div className="lg:col-span-4"><MiniCalendar selectedTask={selectedTask} /></div>

        {/* 任务中心 (8) */}
        <div className="lg:col-span-8">
          <EditorialCard
            title="任务中心"
            icon={CalendarIcon}
            accentColor="text-sky-500"
            className="h-full"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isLoading ? [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 mb-3" />) :
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

        <div className="lg:col-span-4">
          <EditorialCard
            title="同伴进度"
            icon={TrendingUp}
            accentColor="text-violet-500"
            className="h-full"
          >
            <div className="space-y-1 flex flex-col pt-2">
              {!selectedTask ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-4">
                  <div className="p-4 rounded-full bg-slate-50 dark:bg-slate-900 overflow-hidden relative group/icon">
                    <TrendingUp className="w-8 h-8 opacity-20 group-hover/icon:scale-110 transition-transform duration-500" strokeWidth={1.5} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400/40">Select task to sync</p>
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
                        "group/peer flex items-center gap-5 p-3.5 rounded-[18px] transition-all duration-500",
                        p.is_me
                          ? "bg-primary/[0.03] dark:bg-primary/5 shadow-[0_10px_30px_-10px_rgba(var(--primary-rgb),0.05)]"
                          : "hover:bg-slate-50/60 dark:hover:bg-slate-900/40"
                      )}
                    >
                      {/* 极简名次标识 */}
                      <div className={cn(
                        "w-6 h-6 flex items-center justify-center text-[13px] font-black italic tracking-tighter shrink-0 transition-transform group-hover/peer:scale-110 duration-500",
                        index === 0 ? "text-amber-500 font-black" :
                          index === 1 ? "text-slate-400" :
                            index === 2 ? "text-orange-400" :
                              "text-slate-200 dark:text-slate-800"
                      )} style={{ fontFamily: "'Outfit', sans-serif" }}>
                        {String(index + 1).padStart(2, '0')}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className={cn(
                            "text-[13px] font-bold tracking-tight transition-colors",
                            p.is_me ? "text-primary" : "text-slate-600 dark:text-slate-400"
                          )}>
                            {p.is_me ? '我' : p.name}
                          </span>
                          <span className={cn(
                            "text-[10px] font-black transition-colors",
                            p.is_me ? "text-primary/70" : "text-slate-300 dark:text-slate-700"
                          )} style={{ fontFamily: "'Outfit', sans-serif" }}>
                            {Math.round(p.progress)}%
                          </span>
                        </div>

                        {/* 极细贯通进度条 - 系统一致性 */}
                        <div className="h-[1.5px] w-full bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden">
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
                  <TrendingUp className="w-6 h-6 opacity-20" strokeWidth={1} />
                  <p className="text-[10px] font-black uppercase tracking-widest">No participants found</p>
                </div>
              )}
            </div>
          </EditorialCard>
        </div>
      </div>
    </div>
  );
};
