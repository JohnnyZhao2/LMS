import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import dayjs from '@/lib/dayjs';
import { cn } from '@/lib/utils';
import { richTextToPreviewText } from '@/lib/rich-text';
import type { StudentDashboardTask } from '@/types/dashboard';
import type { LatestKnowledge } from '@/types/knowledge';

interface KnowledgeItemProps {
  knowledge: LatestKnowledge;
  navigate: (path: string) => void;
}

export const KnowledgeItem: React.FC<KnowledgeItemProps> = ({ knowledge, navigate }) => {
  return (
    <div
      onClick={() => navigate(`knowledge/${knowledge.id}?from=dashboard`)}
      className={cn(
        "group relative flex h-full min-h-[156px] cursor-pointer flex-col overflow-hidden rounded-xl p-4 transition-[box-shadow,border-color,background-color] duration-300",
        "bg-white border border-slate-200/70",
        "hover:border-slate-300/80 hover:shadow-[0_18px_40px_-28px_rgba(15,23,42,0.22),0_8px_18px_-14px_rgba(15,23,42,0.1)] active:scale-[0.985]"
      )}
    >
      <div className="relative z-10 flex h-full flex-col">
        <div className="min-w-0 flex-1">
          <h5 className="mb-2 line-clamp-2 text-[14px] font-bold leading-tight tracking-tight text-slate-800 transition-colors duration-300 group-hover:text-slate-950">
            {knowledge.title}
          </h5>
          <p className="line-clamp-3 break-all text-[11px] font-medium leading-[1.1rem] tracking-tight text-slate-400/85">
            {richTextToPreviewText(knowledge.content_preview || '') || '点击进入深度学习...'}
          </p>
        </div>

        <div className="mt-auto flex items-end justify-between border-t border-slate-200/60 pt-2.5">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400/50">
              最近更新
            </p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[11px] font-mono font-bold tracking-wider text-slate-500/85">
                {dayjs(knowledge.updated_at).format('MM.DD')}
              </span>
              <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-slate-400/50">
                {dayjs(knowledge.updated_at).format('YYYY')}
              </span>
            </div>
          </div>

          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/70 bg-white/70 text-primary/50 transition-[transform,border-color,color,background-color] duration-300 group-hover:border-primary/25 group-hover:bg-primary/[0.03] group-hover:text-primary">
            <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
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
  const compositionParts = [
    task.progress?.knowledge_total ? `知识 ${task.progress.knowledge_total}` : null,
    task.progress?.quiz_total ? `测验 ${task.progress.quiz_total}` : null,
  ].filter(Boolean) as string[];
  const deadlineLabel = dayjs(task.deadline).format('MM.DD');
  const deadlineYear = dayjs(task.deadline).format('YYYY');

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative flex h-full min-h-[168px] cursor-pointer flex-col overflow-hidden rounded-xl border p-4 transition-[box-shadow,border-color,background-color] duration-300",
        isSelected
          ? "bg-white border border-slate-300/70 shadow-[0_16px_32px_-24px_rgba(15,23,42,0.2),0_8px_18px_-16px_rgba(15,23,42,0.12)]"
          : "bg-white border-slate-200/70 hover:border-slate-300/80 hover:shadow-[0_18px_40px_-28px_rgba(15,23,42,0.22),0_8px_18px_-14px_rgba(15,23,42,0.1)]"
      )}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNavigate();
        }}
        className={cn(
          "absolute right-3.5 top-3.5 flex h-7 w-7 items-center justify-center rounded-full border transition-all duration-500",
          isSelected
            ? "border-primary/20 bg-primary/[0.06] text-primary"
            : "border-slate-200/70 bg-white/75 text-primary/45 opacity-0 group-hover:opacity-100"
        )}
      >
        <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
      </button>

      <div className="min-w-0 flex-1 pr-9">
        <h5 className={cn(
          "line-clamp-2 text-[14px] font-bold leading-tight tracking-tight transition-colors duration-300",
          isCompleted ? "text-slate-400 line-through" : "text-slate-800",
          isSelected && !isCompleted && "text-slate-950"
        )}>
          {task.task_title}
        </h5>

        <p className="mt-2 line-clamp-3 text-[11px] font-medium leading-[1.1rem] tracking-tight text-slate-400/85">
          {compositionParts.length > 0 ? compositionParts.join(' · ') : '暂无任务项'}
        </p>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400/55">
            进度
          </span>
          <span className={cn(
            "flex items-center gap-1 text-[10px] font-black tracking-[0.18em]",
            isCompleted
              ? "text-emerald-500/80"
              : isSelected
                ? "text-primary/80"
                : "text-slate-400/80"
          )}>
            {isCompleted && <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />}
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/60">
          <div
            className={cn(
              "h-full transition-all duration-1000",
              isCompleted ? "bg-emerald-500/75" : isSelected ? "bg-primary" : "bg-slate-300/60"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] font-medium tracking-tight text-slate-400/80">
          已完成 {task.progress?.completed ?? 0}/{task.progress?.total ?? 0}
        </p>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-3 border-t border-slate-200/60 pt-3">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400/55">
            分配人
          </p>
          <p className="mt-1 truncate text-[12px] font-semibold tracking-tight text-slate-600">
            {task.created_by_name}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400/55">
            截止时间
          </p>
          <div className="mt-1 flex items-baseline justify-end gap-1.5">
            <span className={cn(
              "text-[12px] font-mono font-bold tracking-wider",
              isSelected ? "text-primary/85" : "text-slate-600"
            )}>
              {deadlineLabel}
            </span>
            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-slate-400/55">
              {deadlineYear}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
