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
            const isInRange = selectedTask && isCurrentMonth && isDeadlineMonth && day >= currentDay && day <= deadlineDay!;

            return (
              <div key={day} className="aspect-square relative flex items-center justify-center group/day">
                {/* 范围内的日期显示非闭合圆圈 */}
                {isInRange && (
                  <svg
                    className={cn(
                      "absolute inset-0 w-full h-full -rotate-[10deg]",
                      isToday ? "text-primary/50" : isDeadline ? "text-primary" : "text-primary/20"
                    )}
                    viewBox="0 0 100 100"
                  >
                    <path
                      d="M35,15 C55,10 85,25 90,50 C95,75 75,90 50,92 C25,94 10,75 12,50 C14,25 35,15 42,18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={isToday || isDeadline ? "3.5" : "2"}
                      strokeLinecap="round"
                      className={isToday ? "animate-draw" : ""}
                      style={isToday ? { strokeDasharray: 400, strokeDashoffset: 400 } : {}}
                    />
                  </svg>
                )}

                {/* 今天但不在范围内时也显示圆圈 */}
                {isToday && !isInRange && (
                  <svg className="absolute inset-0 w-full h-full text-primary/40 -rotate-[10deg]" viewBox="0 0 100 100">
                    <path
                      d="M35,15 C55,10 85,25 90,50 C95,75 75,90 50,92 C25,94 10,75 12,50 C14,25 35,15 42,18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      className="animate-draw"
                      style={{ strokeDasharray: 400, strokeDashoffset: 400 }}
                    />
                  </svg>
                )}

                <span className={cn(
                  "relative z-10 text-xs font-bold transition-colors",
                  isToday ? "text-primary font-black" :
                    isDeadline ? "text-primary font-black" :
                      isInRange ? "text-primary/80" :
                        "text-muted-foreground/70 group-hover/day:text-foreground"
                )}>{day}</span>

                {isDeadline && (
                  <div className="absolute -top-0.5 -right-1 px-1 py-0.5 bg-primary text-primary-foreground text-[5px] font-bold rounded">
                    截止
                  </div>
                )}
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
                剩余 {dayjs(selectedTask.deadline).diff(today, 'day')} 天
              </span>
            </div>
          ) : (
            <p className="text-[9px] text-muted-foreground/40 text-center font-bold tracking-widest uppercase">选择任务查看截止日期</p>
          )}
        </div>
      </div>
    </Card>
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
    <div className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-black/[0.02]">
      <div className="flex items-center gap-2.5">
        <Icon className={cn("w-[19px] h-[19px]", accentColor)} strokeWidth={2.2} />
        <h3 className="text-sm font-bold text-foreground/80 tracking-tight">
          {title}
        </h3>
      </div>
      {action}
    </div>

    {/* 内容区 */}
    <div className="relative z-10 p-5 flex-1 bg-muted/[0.04]">
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
  const isUrgent = !isCompleted && dayjs(task.deadline).isAfter(dayjs()) && dayjs(task.deadline).diff(dayjs(), 'hour') <= 48;
  const progress = task.progress?.percentage ?? 0;

  return (
    <div
      className={cn(
        "group relative py-3 flex items-center gap-3 transition-all border-b border-border/30 last:border-0",
        isCompleted && !isSelected ? "opacity-50" : "opacity-100",
        isSelected ? "bg-primary/5 -mx-2 px-2 rounded border-transparent" : "-mx-2 px-2 rounded"
      )}
    >
      {/* 点击选择区域 */}
      <div
        onClick={onSelect}
        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer hover:bg-muted/30 -my-3 py-3 -ml-2 pl-2 rounded-l transition-colors"
      >
        {/* 简洁进度指示 */}
        <div className="relative w-8 h-8 shrink-0">
          <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" className="text-border" strokeWidth="2.5" />
            <circle
              cx="18" cy="18" r="14" fill="none"
              stroke={isCompleted ? "#10b981" : isUrgent ? "#f43f5e" : "hsl(var(--primary))"}
              strokeWidth="2.5"
              strokeDasharray={`${progress * 0.88} 100`}
              strokeLinecap="round"
            />
          </svg>
          <span className={cn(
            "absolute inset-0 flex items-center justify-center text-[9px] font-semibold",
            isCompleted ? "text-emerald-600" : isUrgent ? "text-rose-500" : "text-primary"
          )}>
            {isCompleted ? '✓' : `${Math.round(progress)}`}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <h4 className={cn(
            "text-sm font-medium tracking-tight transition-all truncate",
            isCompleted && !isSelected ? "text-muted-foreground line-through" : isSelected ? "text-primary" : "text-foreground/80"
          )}>
            {task.task_title}
          </h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground/60">
              {dayjs(task.deadline).format('M/D')} {isCompleted ? '已完成' : '截止'}
            </span>
            {isUrgent && (
              <span className="text-[10px] font-medium text-rose-500">
                紧急
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 进入详情按钮 */}
      <button
        onClick={(e) => { e.stopPropagation(); onNavigate(); }}
        className="shrink-0 p-1.5 rounded-md text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors"
        title="查看任务详情"
      >
        <ExternalLink className="w-4 h-4" />
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

        {/* 同伴进度 (4) - 显示选中任务的参与者进度 */}
        <div className="lg:col-span-4">
          <EditorialCard title="同伴进度" icon={TrendingUp} accentColor="text-violet-500">
            <div className="space-y-1 min-h-[288px]">
              {!selectedTask ? (
                <div className="flex flex-col items-center justify-center h-[288px] text-muted-foreground/40">
                  <TrendingUp className="w-6 h-6 mb-2" strokeWidth={1.5} />
                  <p className="text-xs">选择任务查看进度</p>
                </div>
              ) : participantsLoading ? (
                [1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} className="h-8 mb-1" />)
              ) : participants && participants.length > 0 ? (
                participants.map((p, index) => (
                  <div
                    key={p.id}
                    className={cn(
                      "flex items-center justify-between py-2 px-2 -mx-2 rounded transition-colors",
                      p.is_me ? "bg-violet-500/5" : "hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs font-medium w-4",
                        p.is_me ? "text-violet-500" : "text-muted-foreground/60"
                      )}>
                        {index + 1}
                      </span>
                      <span className={cn(
                        "text-sm",
                        p.is_me ? "text-violet-600 font-medium" : "text-foreground/70"
                      )}>
                        {p.is_me ? '我' : p.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-border/50 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${p.progress}%` }}
                          transition={{ duration: 0.6, ease: "easeOut", delay: index * 0.08 }}
                          className={cn(
                            "h-full rounded-full",
                            p.is_me ? "bg-violet-400" : p.progress >= 80 ? "bg-emerald-400" : p.progress >= 50 ? "bg-sky-400" : "bg-muted-foreground/30"
                          )}
                        />
                      </div>
                      <span className={cn(
                        "text-xs w-8 text-right",
                        p.is_me ? "text-violet-500 font-medium" : "text-muted-foreground/60"
                      )}>
                        {p.progress}%
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-[288px] text-muted-foreground/40">
                  <p className="text-xs">暂无其他参与者</p>
                </div>
              )}
            </div>
          </EditorialCard>
        </div>
      </div>
    </div>
  );
};
