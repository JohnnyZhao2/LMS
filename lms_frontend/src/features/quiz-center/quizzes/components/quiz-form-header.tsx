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
    <div className="flex h-14 shrink-0 items-center justify-between gap-6 border-b border-border bg-background px-8">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-9 w-9 shrink-0 rounded-lg text-text-muted hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="flex items-center gap-3 px-0.5">
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
          <Input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="输入试卷标题..."
            className="h-9 max-w-[460px] rounded-none border-transparent bg-transparent px-0 text-[14px] font-semibold shadow-none placeholder:text-text-muted/40 hover:border-transparent focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <Button onClick={onSubmit} disabled={isSubmitting} className="h-8 rounded-md bg-foreground px-4 text-[12px] font-semibold text-background hover:bg-foreground/90">
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          保存更改
        </Button>
      </div>
    </div>
  );
};
