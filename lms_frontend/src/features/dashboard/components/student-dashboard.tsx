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
  ExternalLink,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
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
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
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
}> = ({ title, icon: Icon, action, children, className, accentColor = "text-primary-500" }) => (
  <Card className={cn(
    "relative border-border/40 bg-card flex flex-col h-full shadow-none overflow-hidden",
    className
  )}>
    {/* 头部 */}
    <div className="relative z-10 px-6 py-3.5 flex items-center justify-between border-b border-black/[0.02]">
      <div className="flex items-center gap-2.5">
        <Icon className={cn("w-[17px] h-[17px]", accentColor)} strokeWidth={2.5} />
        <h3 className="text-sm font-bold text-foreground/80 tracking-tight">
          {title}
        </h3>
      </div>
      {action}
    </div>

    {/* 内容区 */}
    <div className="relative z-10 p-4 flex-1">
      {children}
    </div>
  </Card>
);

const KnowledgeItem: React.FC<{ knowledge: LatestKnowledge; navigate: (path: string) => void }> = ({ knowledge, navigate }) => {
  return (
    <div
      onClick={() => navigate(`knowledge/${knowledge.id}`)}
      className={cn(
        "group relative p-5 rounded-2xl transition-all duration-500 cursor-pointer flex flex-col h-[96px] overflow-hidden",
        "bg-white/40 dark:bg-card/40 backdrop-blur-md border border-white/60 dark:border-white/5",
        "hover:bg-white/90 hover:shadow-[0_20px_40px_rgba(0,0,0,0.03)] hover:-translate-y-1 active:scale-[0.98]"
      )}
    >
      <div className="relative z-10 w-full flex h-full items-stretch">
        {/* 左侧：内容主场 - 重归沉稳深色 */}
        <div className="flex-1 min-w-0 pl-5 pr-8 flex flex-col justify-center">
          <h5 className="text-[16px] font-bold text-foreground/80 truncate tracking-tight leading-none mb-2.5">
            {knowledge.title}
          </h5>
          <p className="text-[12px] text-muted-foreground/45 line-clamp-1 break-all font-medium group-hover:text-muted-foreground/60 transition-colors tracking-tight leading-none">
            {knowledge.summary || knowledge.content_preview || "点击进入深度学习..."}
          </p>
        </div>

        {/* 垂直分割线 */}
        <div className="w-[1px] bg-black/[0.04] dark:bg-white/[0.02] h-10 my-auto" />

        {/* 右侧：纵向有序元数据 - 全部横向排版 */}
        <div className="w-[84px] flex flex-col items-center justify-center relative gap-1">
          {/* 年份：顶部横排，仅聚焦时显现 - 增强可见度 */}
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500/40 opacity-0 group-hover:opacity-100 transition-all duration-500">
            {dayjs(knowledge.updated_at).format('YYYY')}
          </span>

          {/* 日期：中部横排 - 增强可见度 */}
          <span className="text-[11px] font-mono font-bold text-slate-500/60 tracking-wider group-hover:text-slate-500 transition-colors duration-500">
            {dayjs(knowledge.updated_at).format('MM.DD')}
          </span>

          {/* 箭头：底部滑入 */}
          <div className="h-4 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-500">
              <ArrowRight className="w-3.5 h-3.5 text-primary/40 stroke-[2.5]" />
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
      className={cn(
        "group relative py-3 px-3 -mx-3 rounded-lg transition-all duration-200 flex items-center gap-4 cursor-pointer",
        isSelected ? "bg-primary/[0.04]" : "hover:bg-muted/40"
      )}
      onClick={onSelect}
    >
      {/* 简洁状态指示 */}
      <div className="relative w-10 h-10 shrink-0 flex items-center justify-center">
        <svg className="w-10 h-10 -rotate-90 absolute inset-0" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" className="text-border/40" strokeWidth="2" />
          {!isCompleted && (
            <circle
              cx="20" cy="20" r="18" fill="none"
              stroke="currentColor"
              className="text-primary/60"
              strokeWidth="2"
              strokeDasharray={`${progress * 1.13} 113`}
              strokeLinecap="round"
            />
          )}
        </svg>
        {isCompleted ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" strokeWidth={2.5} />
        ) : (
          <span className="text-[11px] font-bold text-foreground/60">{Math.round(progress)}%</span>
        )}
      </div>

      {/* 任务信息 */}
      <div className="flex-1 min-w-0">
        <h4 className={cn(
          "text-sm font-semibold truncate transition-colors",
          isCompleted ? "text-muted-foreground/60 line-through" : "text-foreground",
          isSelected && "text-primary"
        )}>
          {task.task_title}
        </h4>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[11px] text-muted-foreground/50">
            {dayjs(task.deadline).format('MM月DD日')}截止
          </span>
          {isCompleted && (
            <span className="text-[10px] font-bold text-emerald-500/70">已完成</span>
          )}
        </div>
      </div>

      {/* 侧边操作 */}
      <button
        onClick={(e) => { e.stopPropagation(); onNavigate(); }}
        className={cn(
          "p-2 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100",
          isSelected ? "opacity-100 text-primary bg-primary/10" : "text-muted-foreground/30 hover:text-primary hover:bg-primary/5"
        )}
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </button>
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
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              {isLoading ? [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 mb-3" />) :
                tasks.map(t => (
                  <TaskItem
                    key={t.id}
                    task={t}
                    isSelected={selectedTask?.id === t.id}
                    onSelect={() => setSelectedTask(selectedTask?.id === t.id ? null : t)}
                    onNavigate={() => roleNavigate(`tasks/${t.task_id}`)}
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
          >
            <div className="space-y-1 min-h-[300px]">
              {!selectedTask ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground/30">
                  <TrendingUp className="w-8 h-8 opacity-10 mb-2" />
                  <p className="text-[11px] font-medium">选择任务查看进度</p>
                </div>
              ) : participantsLoading ? (
                <div className="space-y-4 p-2">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-6 w-full rounded" />)}
                </div>
              ) : participants && participants.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {participants.map((p, index) => (
                    <div
                      key={p.id}
                      className={cn(
                        "flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors",
                        p.is_me ? "bg-violet-500/[0.04]" : "hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "text-[10px] font-bold w-4",
                          index < 3 ? "text-violet-500" : "text-muted-foreground/30"
                        )}>
                          {index + 1}
                        </span>
                        <span className={cn(
                          "text-sm",
                          p.is_me ? "font-bold text-violet-600" : "text-foreground/70"
                        )}>
                          {p.is_me ? '我' : p.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-20 h-1 bg-border/40 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-1000 ease-out",
                              p.is_me ? "bg-violet-500" : "bg-muted-foreground/20"
                            )}
                            style={{ width: `${p.progress}%` }}
                          />
                        </div>
                        <span className={cn(
                          "text-[11px] font-medium w-8 text-right",
                          p.is_me ? "text-violet-500" : "text-muted-foreground/50"
                        )}>
                          {Math.round(p.progress)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground/30">
                  <p className="text-[11px]">暂无数据</p>
                </div>
              )}
            </div>
          </EditorialCard>
        </div>
      </div>
    </div>
  );
};
