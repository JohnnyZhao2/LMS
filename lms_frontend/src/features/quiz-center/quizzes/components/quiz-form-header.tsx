import React from 'react';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { QuizDetail, QuizType } from '@/types/api';

interface QuizFormHeaderProps {
  isEdit: boolean;
  quizData?: QuizDetail;
  title: string;
  quizType: QuizType;
  onTitleChange: (title: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export const QuizFormHeader: React.FC<QuizFormHeaderProps> = ({
  isEdit,
  quizData,
  title,
  quizType,
  onTitleChange,
  onBack,
  onSubmit,
  isSubmitting,
}) => {
  return (
    <div className="grid shrink-0 grid-cols-[1fr_minmax(320px,520px)_1fr] items-center gap-3">
      <div className="flex min-w-0 items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-10 w-10 shrink-0 rounded-full border border-border bg-background text-text-muted shadow-sm hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative flex h-12 min-w-0 items-center justify-center rounded-xl border border-border bg-background px-6">
        <div className="pointer-events-none absolute inset-y-0 left-6 flex items-center gap-2.5">
          <div className="flex items-center gap-2.5 px-0.5">
            <span
              className={
                quizType === 'EXAM'
                  ? 'rounded-md bg-destructive-500/10 px-2 py-0.5 text-[10px] font-bold text-destructive-600'
                  : 'rounded-md bg-secondary-500/10 px-2 py-0.5 text-[10px] font-bold text-secondary-700'
              }
            >
              {quizType === 'EXAM' ? '考试' : '测验'}
            </span>
            {isEdit && quizData && (
              <span className="text-[11px] font-medium tracking-tight text-text-muted">
                ID: {quizData.id}
              </span>
            )}
          </div>
        </div>
        <div className="flex w-full justify-center px-20">
          <Input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="输入试卷标题..."
            className="h-8 w-full max-w-[320px] rounded-none border-transparent bg-transparent px-0 text-center text-[14px] font-semibold shadow-none placeholder:text-text-muted/40 hover:border-transparent focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      <div className="flex min-w-0 items-center justify-end">
        <div className="flex h-12 items-center rounded-xl border border-border bg-background px-2.5 shadow-sm">
          <Button onClick={onSubmit} disabled={isSubmitting} className="h-8 rounded-xl bg-foreground px-4 text-[12px] font-semibold text-background hover:bg-foreground/90">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            保存更改
          </Button>
        </div>
      </div>
    </div>
  );
};
