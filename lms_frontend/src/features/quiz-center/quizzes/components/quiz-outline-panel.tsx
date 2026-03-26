import React, { useMemo } from 'react';
import { FileText, SortAsc } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  onSortQuestions,
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
    <div className="w-72 flex flex-col bg-background rounded-xl shadow-sm border border-border shrink-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <FileText className="w-4 h-4 text-primary-500" />
            试卷大纲
            <Badge variant="secondary" className="bg-muted min-w-5 text-center tabular-nums text-[10px] px-1.5">
              {items.length}
            </Badge>
          </div>
          {items.length > 0 && onSortQuestions && (
            <Button variant="ghost" size="sm" onClick={onSortQuestions} className="text-[10px] text-primary-600 hover:text-primary-700 hover:bg-primary-50 gap-1 h-6 px-1.5">
              <SortAsc className="w-3 h-3" />排序
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-text-muted font-medium">
          <span>总分 {totalScoreText}</span>
          <span className="text-border">|</span>
          <span>单{stats.single} 多{stats.multi} 判{stats.tf} 简{stats.short}</span>
        </div>
        {quizType === 'EXAM' && (
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="text-destructive-600 font-medium">时长</span>
            <Input type="number" min={1} step={1} value={duration ?? ''} onChange={(e) => onDurationChange(Number(e.target.value) || undefined)} className="h-6 w-14 text-[10px] bg-background border-destructive-200 text-foreground text-center" />
            <span className="text-text-muted">分</span>
            <span className="text-destructive-600 font-medium ml-1">及格</span>
            <Input type="number" min={1} step={1} value={passScore ?? ''} onChange={(e) => onPassScoreChange(Number(e.target.value) || undefined)} className="h-6 w-14 text-[10px] bg-background border-destructive-200 text-foreground text-center" />
            <span className="text-text-muted">分</span>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-subtle">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted py-12">
            <FileText className="w-10 h-10 mb-3 opacity-30" />
            <span className="text-xs">从右侧题库添加题目</span>
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {items.map((item, idx) => {
              const isActive = item.key === activeKey;
              const style = getQuestionTypeStyle(item.questionType);
              return (
                <div
                  key={item.key}
                  onClick={() => onSelectItem(item.key)}
                  className={cn(
                    'group flex items-start gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150',
                    isActive ? 'bg-primary-50 border border-primary-200 shadow-sm' : 'hover:bg-muted/60 border border-transparent',
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5',
                    isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-text-muted',
                  )}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge className={cn('text-[9px] px-1 py-0 h-4 leading-none font-medium', style.bg, style.color)}>
                        {getQuestionTypeLabel(item.questionType)}
                      </Badge>
                      <span className="text-[10px] text-text-muted tabular-nums">{item.score}分</span>
                    </div>
                    <p className={cn('text-xs leading-relaxed line-clamp-2', isActive ? 'text-foreground' : 'text-text-muted')}>
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
