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
import { motion } from 'framer-motion';
import { useStudentDashboard, useTaskParticipants } from '../api/student-dashboard';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import dayjs from '@/lib/dayjs';
import { Skeleton, Card, Button } from '@/components/ui';
import { StatCard } from '@/components/ui/stat-card';
import type { LatestKnowledge, StudentDashboardTask } from '@/types/api';
import { cn } from '@/lib/utils';

/**
 * 迷你学习日历
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
      "relative overflow-hidden border-border/50 bg-card transition-all duration-500 group hover:shadow-[0_12px_40px_rgb(0,0,0,0.04)] hover:border-primary/20 flex flex-col h-full",
      className
    )}>
      {/* 噪点纹理 */}
      <div className="absolute inset-0 opacity-[0.4] mix-blend-soft-light pointer-events-none z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150" />

      {/* 头部 */}
      <div className="relative z-10 px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/60 hover:text-foreground" onClick={prevMonth}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-sm font-semibold text-foreground/80 min-w-[90px] text-center">
              {displayDate.format('YYYY年M月')}
            </span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/60 hover:text-foreground" onClick={nextMonth}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          {!isCurrentMonth && (
            <Button variant="ghost" size="sm" className="text-xs h-6 text-muted-foreground/60 hover:text-foreground" onClick={goToToday}>
              今天
            </Button>
          )}
        </div>
      </div>

      <div className="relative z-10 mx-5 border-b border-border/50" />

      {/* 日历主体 */}
      <div className="relative z-10 px-5 pb-4 pt-3 flex-1 flex flex-col">
        <div className="grid grid-cols-7 mb-3">
          {['日', '一', '二', '三', '四', '五', '六'].map((d, i) => (
            <span key={i} className={cn(
              "text-[10px] font-medium text-center",
              (i === 0 || i === 6) ? "text-rose-400" : "text-muted-foreground/60"
            )}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {Array.from({ length: startDay }).map((_, i) => <div key={i} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isToday = isCurrentMonth && day === currentDay;
            const isDeadline = isDeadlineMonth && day === deadlineDay;
            const isInRange = selectedTask && isCurrentMonth && isDeadlineMonth && day >= currentDay && day <= deadlineDay!;

            return (
              <div key={day} className="aspect-square relative flex items-center justify-center">
                {isInRange && (
                  <svg
                    className={cn(
                      "absolute inset-0 w-full h-full -rotate-[10deg]",
                      isToday ? "text-primary" : isDeadline ? "text-primary" : "text-primary/30"
                    )}
                    viewBox="0 0 100 100"
                  >
                    <path
                      d="M35,15 C55,10 85,25 90,50 C95,75 75,90 50,92 C25,94 10,75 12,50 C14,25 35,15 42,18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={isToday || isDeadline ? "3" : "2"}
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                <span className={cn(
                  "relative z-10 text-xs font-medium transition-colors",
                  isToday ? "text-primary font-semibold" :
                    isDeadline ? "text-primary font-semibold" :
                      isInRange ? "text-primary/80" :
                        "text-muted-foreground/80"
                )}>{day}</span>
                {isDeadline && (
                  <div className="absolute -top-0.5 -right-1 px-1 py-0.5 bg-primary text-primary-foreground text-[5px] font-medium rounded">
                    截止
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 底部提示 */}
        <div className="mt-auto pt-2 border-t border-border/50">
          {selectedTask ? (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground/60 truncate max-w-[55%]">{selectedTask.task_title}</span>
              <span className="text-primary font-medium">
                {dayjs(selectedTask.deadline).diff(today, 'day')}天后截止
              </span>
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground/40 text-center">选择任务查看截止日期</p>
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
    "relative overflow-hidden border-border/50 bg-card transition-all duration-500 group hover:shadow-[0_12px_40px_rgb(0,0,0,0.04)] hover:border-primary/20 flex flex-col h-full",
    className
  )}>
    {/* 噪点纹理 */}
    <div className="absolute inset-0 opacity-[0.4] mix-blend-soft-light pointer-events-none z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150" />

    {/* 头部 */}
    <div className="relative z-10 px-6 pt-5 pb-3 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <Icon className={cn("w-[18px] h-[18px]", accentColor)} strokeWidth={1.8} />
        <h3 className="text-sm font-semibold text-foreground/80 tracking-tight group-hover:text-foreground transition-colors duration-300">
          {title}
        </h3>
      </div>
      {action}
    </div>

    {/* 内容区 */}
    <div className="relative z-10 px-6 pb-5 flex-1">
      {children}
    </div>
  </Card>
);

const KnowledgeItem: React.FC<{ knowledge: LatestKnowledge; navigate: (path: string) => void; index: number }> = ({ knowledge, navigate, index }) => {
  const colors = ['text-teal-500', 'text-sky-500', 'text-violet-500', 'text-amber-500'];
  const hoverColors = ['hover:text-teal-600', 'hover:text-sky-600', 'hover:text-violet-600', 'hover:text-amber-600'];
  const textColor = colors[index % colors.length];
  const hoverColor = hoverColors[index % hoverColors.length];

  return (
    <div
      onClick={() => navigate(`knowledge/${knowledge.id}`)}
      className="group py-3 cursor-pointer flex items-center gap-3 border-b border-border/30 last:border-0 hover:bg-muted/30 -mx-2 px-2 rounded transition-colors"
    >
      <div className="flex-1 min-w-0">
        <h5 className={cn(
          "text-sm font-medium text-foreground/70 transition-colors truncate",
          hoverColor, "group-hover:text-foreground"
        )}>
          {knowledge.title}
        </h5>
        <span className="text-xs text-muted-foreground/60 mt-0.5 block">
          {dayjs(knowledge.updated_at).format('M月D日')}
        </span>
      </div>
      <ArrowRight className={cn("w-4 h-4 opacity-0 group-hover:opacity-100 transition-all", textColor)} />
    </div>
  );
};

const TaskItem: React.FC<{ task: StudentDashboardTask; isSelected: boolean; onSelect: () => void }> = ({ task, isSelected, onSelect }) => {
  const isCompleted = task.status === 'COMPLETED';
  const isUrgent = !isCompleted && dayjs(task.deadline).isAfter(dayjs()) && dayjs(task.deadline).diff(dayjs(), 'hour') <= 48;
  const progress = task.progress?.percentage ?? 0;

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative py-3 flex items-center gap-3 transition-all cursor-pointer border-b border-border/30 last:border-0",
        isCompleted && !isSelected ? "opacity-50" : "opacity-100",
        isSelected ? "bg-primary/5 -mx-2 px-2 rounded border-transparent" : "hover:bg-muted/30 -mx-2 px-2 rounded"
      )}
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
            action={
              <button
                onClick={() => roleNavigate('knowledge')}
                className="text-xs font-medium text-muted-foreground/60 hover:text-teal-500 transition-colors"
              >
                查看全部 →
              </button>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              {isLoading ? [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 mb-3" />) :
                data?.latest_knowledge?.slice(0, 4).map((k, index) => (
                  <KnowledgeItem key={k.id} knowledge={k} navigate={roleNavigate} index={index} />
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
                  <TaskItem key={t.id} task={t} isSelected={selectedTask?.id === t.id} onSelect={() => setSelectedTask(selectedTask?.id === t.id ? null : t)} />
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
