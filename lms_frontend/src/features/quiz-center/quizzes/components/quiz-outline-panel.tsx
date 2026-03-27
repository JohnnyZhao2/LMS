import React, { useMemo } from 'react';
import { Clock3, FileText, PieChart, Target } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getQuestionTypeLabel, getQuestionTypeStyle } from '@/features/quiz-center/questions/constants';
import type { QuizType } from '@/types/api';
import type { InlineQuestionItem } from '../types';

interface QuizOutlinePanelProps {
  items: InlineQuestionItem[];
  activeKey: string | null;
  quizType: QuizType;
  duration?: number;
  passScore?: number;
  onSelectItem: (key: string) => void;
  onDurationChange: (value?: number) => void;
  onPassScoreChange: (value?: number) => void;
  onSortQuestions?: () => void;
}

export const QuizOutlinePanel: React.FC<QuizOutlinePanelProps> = ({
  items,
  activeKey,
  quizType,
  duration,
  passScore,
  onSelectItem,
  onDurationChange,
  onPassScoreChange,
}) => {
  const stats = useMemo(() => {
    let totalScore = 0;
    let single = 0, multi = 0, tf = 0, short = 0;
    items.forEach((item) => {
      const s = Number(item.score);
      totalScore += Number.isFinite(s) ? s : 0;
      if (item.questionType === 'SINGLE_CHOICE') single++;
      if (item.questionType === 'MULTIPLE_CHOICE') multi++;
      if (item.questionType === 'TRUE_FALSE') tf++;
      if (item.questionType === 'SHORT_ANSWER') short++;
    });
    return { totalScore, single, multi, tf, short };
  }, [items]);
  const totalScoreText = Number.isInteger(stats.totalScore)
    ? String(stats.totalScore)
    : stats.totalScore.toFixed(1).replace(/\.0$/, '');

  return (
    <div className="flex w-72 shrink-0 flex-col border-r border-border bg-background xl:w-80">
      <div className="flex h-14 items-center justify-between border-b border-border px-5">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
          <FileText className="h-4 w-4 text-primary-600" />
          <span>试卷结构</span>
        </div>
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
          共 {items.length} 题
        </span>
      </div>
      {quizType === 'EXAM' && (
        <div className="space-y-3 border-b border-border bg-muted/20 px-5 py-4">
          <div className="flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-1.5 font-medium text-text-muted">
              <Clock3 className="h-3.5 w-3.5" />
              时间限制
            </div>
            <div className="flex items-center gap-1 rounded-md bg-background px-1.5 py-0.5">
              <Input
                type="number"
                min={1}
                step={1}
                value={duration ?? ''}
                onChange={(e) => onDurationChange(Number(e.target.value) || undefined)}
                className="h-6 w-8 border-0 bg-transparent p-0 text-right text-[12px] font-semibold shadow-none focus-visible:ring-0"
              />
              <span className="text-[10px] text-text-muted">分钟</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-1.5 font-medium text-text-muted">
              <Target className="h-3.5 w-3.5" />
              及格分数
            </div>
            <div className="flex items-center gap-1 rounded-md bg-background px-1.5 py-0.5">
              <Input
                type="number"
                min={1}
                step={1}
                value={passScore ?? ''}
                onChange={(e) => onPassScoreChange(Number(e.target.value) || undefined)}
                className="h-6 w-8 border-0 bg-transparent p-0 text-right text-[12px] font-semibold shadow-none focus-visible:ring-0"
              />
              <span className="text-[10px] text-text-muted">分</span>
            </div>
          </div>
        </div>
      )}
      <div className="border-b border-border bg-background px-5 py-4">
        <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
          <PieChart className="h-3.5 w-3.5" />
          题型概览
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: '单选题', value: stats.single },
            { label: '多选题', value: stats.multi },
            { label: '判断题', value: stats.tf },
            { label: '简答题', value: stats.short },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-[12px] font-medium text-foreground">
              <span>{stat.label}</span>
              <span className="rounded bg-muted px-1 text-[10px] text-text-muted">{stat.value}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-[12px] font-medium text-foreground">
            <span>总分</span>
            <span className="rounded bg-muted px-1 text-[10px] text-text-muted">{totalScoreText}</span>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-subtle">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-12 text-text-muted">
            <FileText className="mb-3 h-10 w-10 opacity-25" />
            <span className="text-xs">从右侧题库添加题目</span>
          </div>
        ) : (
          <div className="space-y-1 p-3">
            {items.map((item, idx) => {
              const isActive = item.key === activeKey;
              const style = getQuestionTypeStyle(item.questionType);
              return (
                <div
                  key={item.key}
                  onClick={() => onSelectItem(item.key)}
                  className={cn(
                    'group flex cursor-pointer items-start gap-3 rounded-lg px-3 py-3 transition-all duration-150',
                    isActive ? 'bg-muted' : 'hover:bg-muted/60',
                  )}
                >
                  <div className={cn(
                    'mt-0.5 flex w-4 shrink-0 items-center justify-center text-[10px] font-mono text-text-muted',
                  )}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex items-center gap-1.5">
                      <Badge className={cn('h-4 px-1.5 text-[9px] leading-none font-medium', style.bg, style.color)}>
                        {getQuestionTypeLabel(item.questionType)}
                      </Badge>
                      <span className="text-[10px] text-text-muted tabular-nums">{item.score}分</span>
                    </div>
                    <p className={cn('line-clamp-2 text-[13px] leading-relaxed', isActive ? 'font-medium text-foreground' : 'text-foreground')}>
                      {item.content || '未填写题目'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
