import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from '@/lib/dayjs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StudentDashboardTask } from '@/types/dashboard';

interface MiniCalendarProps {
  className?: string;
  selectedTask?: StudentDashboardTask | null;
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({ className, selectedTask }) => {
  const today = dayjs();
  const [displayDate, setDisplayDate] = React.useState(dayjs());

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
      "relative flex h-full w-full min-h-[252px] flex-col overflow-hidden border-border/40 bg-card shadow-xl shadow-slate-200/30 transition-all duration-700 group/calendar hover:shadow-primary/5 sm:min-h-[276px] lg:min-h-[292px] xl:min-h-0",
      className
    )}>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[image:var(--noise-texture)]" />
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-muted/50 to-transparent opacity-50 2xl:h-40" />

      <div className="relative z-10 flex h-full min-h-0 flex-col p-4 2xl:p-6">
        <div className="relative flex h-10 shrink-0 items-center justify-between 2xl:h-12">
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground/30 hover:text-foreground 2xl:h-6 2xl:w-6" onClick={prevMonth}>
              <ChevronLeft className="h-3 w-3 2xl:h-3.5 2xl:w-3.5" />
            </Button>
            <span className="text-[1.65rem] font-black text-foreground tracking-tighter leading-none 2xl:text-[2rem]">
              {monthNum}
            </span>
            <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground/30 hover:text-foreground 2xl:h-6 2xl:w-6" onClick={nextMonth}>
              <ChevronRight className="h-3 w-3 2xl:h-3.5 2xl:w-3.5" />
            </Button>
            {!isCurrentMonth && (
              <Button variant="ghost" size="sm" className="ml-1 h-5 px-1.5 text-[10px] font-bold text-muted-foreground/65 hover:text-foreground 2xl:px-2 2xl:text-[11px]" onClick={goToToday}>
                今日
              </Button>
            )}
          </div>
          <span className="select-none text-[40px] font-black italic leading-none tracking-tighter text-foreground/[0.04] md:text-[46px] 2xl:text-[56px]">
            {year}
          </span>
        </div>
        <div className="mt-1.5 mb-1.5 grid shrink-0 grid-cols-7 gap-x-0.5 border-t border-dashed border-border/40 pb-0.5 pt-2 2xl:mb-2 2xl:mt-2 2xl:pb-1 2xl:pt-2.5">
          {['日', '一', '二', '三', '四', '五', '六'].map((d, i) => (
            <span key={d} className={cn(
              "text-center text-[10px] font-black leading-none tracking-[0.04em] 2xl:text-[11px]",
              (i === 0 || i === 6) ? "text-rose-400/75" : "text-muted-foreground/65"
            )}>{d}</span>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-7 auto-rows-fr gap-x-0.5 gap-y-0.5">
          {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} className="h-full min-h-0" />)}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isToday = isCurrentMonth && day === currentDay;
            const isDeadline = isDeadlineMonth && day === deadlineDay;

            return (
              <div key={day} className="relative flex h-full min-h-0 items-center justify-center">
                {isToday && (
                  <div className="absolute inset-1 pointer-events-none transition-all duration-500 2xl:inset-1.5">
                    <div className="absolute top-0 left-0 h-2.5 w-2.5 border-t-[1.5px] border-l-[1.5px] border-slate-400/60 2xl:h-3 2xl:w-3" />
                    <div className="absolute bottom-0 right-0 h-2.5 w-2.5 border-b-[1.5px] border-r-[1.5px] border-slate-400/60 2xl:h-3 2xl:w-3" />
                  </div>
                )}

                {isDeadline && (
                  <div className="absolute inset-1 flex items-center justify-center pointer-events-none 2xl:inset-[5px]">
                    <span className="absolute text-[5px] font-serif font-black uppercase tracking-widest text-rose-600/[0.04] rotate-[-12deg] scale-[1.2] 2xl:text-[6px]">
                      DEAD
                    </span>
                    <div className="absolute inset-0 border-[1.5px] border-rose-600/20 rotate-[-4deg]">
                      <span className="absolute -top-1 left-0.5 text-[5px] font-black leading-none text-rose-600/55 tracking-normal 2xl:-top-1.5 2xl:text-[7px]">D.L.</span>
                    </div>
                    <div className="absolute inset-[2.5px] border-[0.5px] border-rose-600/10 rotate-[2deg]" />
                  </div>
                )}

                <span className={cn(
                  "relative z-10 transition-all duration-300",
                  isToday ? "text-[14px] font-[900] tabular-nums text-slate-800 scale-105 tracking-normal 2xl:text-[15px]" :
                    isDeadline ? "text-[12px] font-black tabular-nums text-rose-600/90 scale-105 tracking-normal 2xl:text-[13px]" :
                      "text-[12px] font-bold tabular-nums text-muted-foreground/55 hover:text-foreground hover:scale-105 2xl:text-[13px]"
                )}>
                  {day}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-1.5 flex h-5 shrink-0 items-center border-t border-dashed border-border/40 2xl:mt-2 2xl:h-6">
          {selectedTask ? (() => {
            const daysLeft = dayjs(selectedTask.deadline).startOf('day').diff(today.startOf('day'), 'day');
            const isOverdue = daysLeft < 0;
            const isTaskToday = daysLeft === 0;
            return (
              <div className="flex w-full items-center justify-between">
                <span className="max-w-[55%] truncate text-[10px] font-bold tracking-[0.04em] text-muted-foreground/75 2xl:text-[11px]">
                  {selectedTask.task_title}
                </span>
                <span className={cn(
                  "text-[10px] font-black 2xl:text-[11px]",
                  isOverdue ? "text-rose-500" : isTaskToday ? "text-amber-500" : "text-primary"
                )}>
                  {isOverdue ? `已逾期 ${Math.abs(daysLeft)} 天` : isTaskToday ? '今日截止' : `剩余 ${daysLeft} 天`}
                </span>
              </div>
            );
          })() : (
            <p className="flex w-full items-center justify-center text-[10px] font-bold tracking-[0.06em] text-muted-foreground/65 2xl:text-[11px]">选择任务查看截止日期</p>
          )}
        </div>
      </div>
    </Card>
  );
};
