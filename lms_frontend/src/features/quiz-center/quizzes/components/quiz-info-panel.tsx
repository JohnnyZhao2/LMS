import React from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { QuizType } from '@/types/api';

interface QuizInfoPanelProps {
  quizType: QuizType;
  duration?: number;
  passScore?: number;
  totalScore: number;
  typeStats: Record<string, number>;
  setQuizType: (value: QuizType) => void;
  setDuration: (value?: number) => void;
  setPassScore: (value?: number) => void;
}

export const QuizInfoPanel: React.FC<QuizInfoPanelProps> = ({
  quizType,
  duration,
  passScore,
  totalScore,
  typeStats,
  setQuizType,
  setDuration,
  setPassScore,
}) => {
  return (
    <div className="p-5 space-y-4 bg-background rounded-lg mx-5 mt-5 border border-border">
      <div className="space-y-2">
        <Label>试卷性质</Label>
        <div className="flex p-1 bg-muted rounded-lg gap-1">
          <button
            className={cn(
              "flex-1 py-2 text-sm font-semibold rounded-md transition-all",
              quizType === 'PRACTICE' ? "bg-background text-primary-600" : "text-text-muted hover:text-foreground"
            )}
            onClick={() => setQuizType('PRACTICE')}
          >
            练习模式
          </button>
          <button
            className={cn(
              "flex-1 py-2 text-sm font-semibold rounded-md transition-all",
              quizType === 'EXAM' ? "bg-destructive-500 text-white" : "text-text-muted hover:text-foreground"
            )}
            onClick={() => setQuizType('EXAM')}
          >
            考试模式
          </button>
        </div>
      </div>

      {quizType === 'EXAM' && (
        <div className="p-4 bg-destructive-50/50 border border-destructive-100 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-destructive-600">考试时长 (分钟)</Label>
              <Input
                type="number"
                value={duration ?? ''}
                onChange={e => setDuration(Number(e.target.value) || undefined)}
                className="bg-background border-destructive-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-destructive-600">合格分数线</Label>
              <Input
                type="number"
                value={passScore ?? ''}
                onChange={e => setPassScore(Number(e.target.value) || undefined)}
                className="bg-background border-destructive-200"
              />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
        <div className="bg-primary-50/50 p-4 rounded-xl border border-primary-50/80">
          <div className="text-xs text-primary-600 font-semibold mb-1">当前总分</div>
          <div className="text-2xl font-bold text-primary-700">{totalScore}<span className="text-sm ml-1 font-normal">pts</span></div>
        </div>
        <div className="bg-muted p-4 rounded-xl border border-border">
          <div className="text-xs text-text-muted font-semibold mb-1">各题分布</div>
          <div className="space-y-1 mt-2">
            {Object.entries(typeStats).map(([t, c]) => (
              <div key={t} className="flex justify-between items-center text-xs">
                <span className="text-text-muted">{t}</span>
                <span className="text-foreground font-semibold">{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
