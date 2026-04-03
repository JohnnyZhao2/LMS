import React from 'react';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { QuizType } from '@/types/api';

interface QuizFormHeaderProps {
  title: string;
  quizType: QuizType;
  onQuizTypeChange: (quizType: QuizType) => void;
  onTitleChange: (title: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export const QuizFormHeader: React.FC<QuizFormHeaderProps> = ({
  title,
  quizType,
  onQuizTypeChange,
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

      <div className="relative flex h-10 min-w-0 items-center justify-center rounded-xl border border-border bg-background px-5">
        <div className="absolute inset-y-1 left-1 flex items-stretch">
          <Select
            value={quizType}
            onValueChange={(value) => onQuizTypeChange(value as QuizType)}
          >
            <SelectTrigger
              className={cn(
                'h-full w-[84px] rounded-lg border-none px-3 py-0 text-[12px] font-semibold shadow-none focus-visible:ring-0 data-[state=open]:ring-0',
                quizType === 'EXAM'
                  ? 'bg-destructive-500/10 text-destructive-600'
                  : 'bg-secondary-500/10 text-secondary-700',
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PRACTICE">
                测验
              </SelectItem>
              <SelectItem value="EXAM">
                考试
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-16">
          <Input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="输入试卷标题..."
            className="pointer-events-auto h-7 w-full max-w-[320px] rounded-none border-transparent bg-transparent px-0 text-center text-[14px] font-semibold shadow-none placeholder:text-text-muted/40 hover:border-transparent focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      <div className="flex min-w-0 items-center justify-end">
        <Button onClick={onSubmit} disabled={isSubmitting} className="h-10 rounded-xl bg-foreground px-4 text-[12px] font-semibold text-background hover:bg-foreground/90">
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          保存更改
        </Button>
      </div>
    </div>
  );
};
