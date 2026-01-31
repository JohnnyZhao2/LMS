import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from '@/lib/dayjs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StudentDashboardTask } from '@/types/api';

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
      "relative border-border/40 bg-card shadow-xl shadow-slate-200/30 dark:shadow-none flex flex-col overflow-hidden group/calendar transition-all duration-700 hover:shadow-primary/5 h-full",
      className
    )}>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[image:var(--noise-texture)]" />
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-muted/50 to-transparent opacity-50" />

      <div className="relative z-10 px-6 pt-2 pb-0">
        <div className="relative flex items-center justify-between h-14">
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/30 hover:text-foreground" onClick={prevMonth}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-4xl font-black text-foreground tracking-tighter leading-none">
              {monthNum}
            </span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/30 hover:text-foreground" onClick={nextMonth}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            {!isCurrentMonth && (
              <Button variant="ghost" size="sm" className="text-[9px] h-5 px-2 text-muted-foreground/40 hover:text-foreground font-bold ml-1" onClick={goToToday}>
                今日
              </Button>
            )}
          </div>
          <span className="text-[60px] font-black text-foreground/[0.04] tracking-tighter leading-none italic select-none">
            {year}
          </span>
        </div>
      </div>

      <div className="relative z-10 px-6 pb-5 flex-1 flex flex-col">
        <div className="grid grid-cols-7 gap-x-0.5 mb-2 border-t border-dashed border-border/40 pt-3 pb-1">
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
                {isToday && (
                  <div className="absolute inset-1 pointer-events-none transition-all duration-500">
                    <div className="absolute top-0 left-0 w-3 h-3 border-t-[1.5px] border-l-[1.5px] border-slate-400/60" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-[1.5px] border-r-[1.5px] border-slate-400/60" />
                  </div>
                )}

                {isDeadline && (
                  <div className="absolute inset-[6px] flex items-center justify-center pointer-events-none">
                    <span className="absolute text-[6px] font-serif font-black uppercase tracking-widest text-rose-600/[0.04] rotate-[-12deg] scale-[1.2]">
                      DEAD
                    </span>
                    <div className="absolute inset-0 border-[1.5px] border-rose-600/20 rotate-[-4deg]">
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

        <div className="mt-auto pt-3 border-t border-dashed border-border/40">
          {selectedTask ? (() => {
            const daysLeft = dayjs(selectedTask.deadline).startOf('day').diff(today.startOf('day'), 'day');
            const isOverdue = daysLeft < 0;
            const isTaskToday = daysLeft === 0;
            return (
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground/60 truncate max-w-[55%] uppercase tracking-wider">
                  {selectedTask.task_title}
                </span>
                <span className={cn(
                  "text-[10px] font-black",
                  isOverdue ? "text-rose-500" : isTaskToday ? "text-amber-500" : "text-primary"
                )}>
                  {isOverdue ? `已逾期 ${Math.abs(daysLeft)} 天` : isTaskToday ? '今日截止' : `剩余 ${daysLeft} 天`}
                </span>
              </div>
            );
          })() : (
            <p className="text-[9px] text-muted-foreground/40 text-center font-bold tracking-widest">选择任务查看截止日期</p>
          )}
        </div>
      </div>
    </Card>
  );
};
