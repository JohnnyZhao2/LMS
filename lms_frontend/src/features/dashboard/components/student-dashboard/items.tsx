import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import dayjs from '@/lib/dayjs';
import { cn } from '@/lib/utils';
import { richTextToPreviewText } from '@/lib/rich-text';
import type { LatestKnowledge, StudentDashboardTask } from '@/types/api';

interface KnowledgeItemProps {
  knowledge: LatestKnowledge;
  navigate: (path: string) => void;
}

export const KnowledgeItem: React.FC<KnowledgeItemProps> = ({ knowledge, navigate }) => {
  return (
    <div
      onClick={() => navigate(`knowledge/${knowledge.id}?from=dashboard`)}
      className={cn(
        "group relative flex h-[88px] cursor-pointer flex-col overflow-hidden rounded-xl p-5 transition-all duration-500",
        "bg-slate-50 border border-slate-200/30",
        "hover:bg-white hover:shadow-[0_15px_40px_-15px_rgba(0,0,0,0.06)] hover:border-slate-200 hover:-translate-y-0.5 active:scale-[0.98]"
      )}
    >
      <div className="relative z-10 w-full flex h-full items-stretch">
        <div className="flex min-w-0 flex-1 flex-col justify-center pr-6">
          <h5 className="mb-2 truncate text-[15px] font-bold leading-tight tracking-tight text-slate-800 transition-colors group-hover:text-primary">
            {knowledge.title}
          </h5>
          <p className="line-clamp-1 break-all text-[11px] font-medium leading-tight tracking-tight text-slate-400/80">
            {richTextToPreviewText(knowledge.content_preview || '') || '点击进入深度学习...'}
          </p>
        </div>

        <div className="my-auto h-8 w-[1px] bg-slate-200/50" />

        <div className="relative flex w-[72px] flex-col items-center justify-center gap-0.5">
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400/40 opacity-0 group-hover:opacity-100 transition-all duration-500">
            {dayjs(knowledge.updated_at).format('YYYY')}
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-400/60 tracking-wider group-hover:text-slate-600 transition-colors duration-500">
            {dayjs(knowledge.updated_at).format('MM.DD')}
          </span>
          <div className="flex h-4 items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-500">
              <ArrowRight className="h-3 w-3 text-primary/50 stroke-[2.5]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface TaskItemProps {
  task: StudentDashboardTask;
  isSelected: boolean;
  onSelect: () => void;
  onNavigate: () => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, isSelected, onSelect, onNavigate }) => {
  const isCompleted = task.status === 'COMPLETED';
  const progress = task.progress?.percentage ?? 0;

  return (
    <div
      onClick={onSelect}
        className={cn(
          "group relative flex min-h-[92px] cursor-pointer items-center gap-4 rounded-xl p-5 transition-all duration-500",
          isSelected
          ? "bg-white border border-slate-200 shadow-[0_15px_40px_-15px_rgba(0,0,0,0.06)]"
          : "bg-slate-50 border border-slate-200/30 hover:bg-slate-50"
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <h5 className={cn(
          "mb-2 line-clamp-2 text-[15px] font-bold leading-tight tracking-tight transition-colors",
          isCompleted ? "text-slate-300 line-through" : "text-slate-800",
          isSelected && !isCompleted && "text-primary"
        )}>
          {task.task_title}
        </h5>
        {!isCompleted && (
          <div className="flex items-center gap-3">
            <div className="h-[1.5px] w-24 overflow-hidden rounded-full bg-slate-200/50">
              <div
                className={cn("h-full transition-all duration-1000", isSelected ? "bg-primary" : "bg-slate-300/40")}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">
              {Math.round(progress)}%
            </span>
          </div>
        )}
      </div>

      <div className="my-auto h-8 w-[1px] bg-slate-200/50" />

      <div className="relative flex w-[72px] flex-col items-center justify-center gap-0.5">
        <span className={cn(
          "text-[9px] font-mono font-bold uppercase tracking-widest transition-all duration-500",
          isSelected ? "text-primary/40 opacity-100" : "text-slate-400/40 opacity-0 group-hover:opacity-100"
        )}>
          {dayjs(task.deadline).format('YYYY')}
        </span>

        <div className="relative flex h-4 w-full items-center justify-center">
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
