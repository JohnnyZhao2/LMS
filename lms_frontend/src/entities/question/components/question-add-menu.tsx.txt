import React from 'react';
import { Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { QUESTION_TYPE_PICKER_OPTIONS, getQuestionTypePresentation } from '@/entities/question/constants';
import { cn } from '@/lib/utils';
import type { QuestionType } from '@/types/common';

const QUESTION_TYPE_ICON_ADJUSTMENTS: Partial<Record<QuestionType, string>> = {
  SINGLE_CHOICE: 'translate-y-[0.5px]',
};

const QuestionTypeCompactContent: React.FC<{
  type: QuestionType;
}> = ({ type }) => {
  const { icon: Icon, label, color, bg } = getQuestionTypePresentation(type);

  return (
    <span className="inline-flex items-center justify-center gap-2">
      <span className={cn('inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-[5px]', bg, color)}>
        <Icon
          className={cn('h-2.75 w-2.75 shrink-0', QUESTION_TYPE_ICON_ADJUSTMENTS[type])}
          strokeWidth={2.3}
        />
      </span>
      <span className="text-[12px] font-semibold tracking-[-0.01em] text-foreground/84">
        {label}
      </span>
    </span>
  );
};

interface QuestionAddMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (questionType: QuestionType) => void;
}

export const QuestionAddMenu: React.FC<QuestionAddMenuProps> = ({
  open,
  onOpenChange,
  onAdd,
}) => {
  if (open) {
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-8 z-20 flex flex-col items-center">
        <div className="pointer-events-auto mb-3 flex flex-wrap items-center justify-center gap-3 px-6">
          {QUESTION_TYPE_PICKER_OPTIONS.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => onAdd(type.value)}
              className="flex h-10 min-w-[94px] items-center justify-center rounded-full border border-border/70 bg-background px-4 shadow-[0_10px_24px_rgba(15,23,42,0.07)] transition-[border-color,background-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:border-interaction-border hover:bg-interaction-surface-strong hover:shadow-[0_12px_28px_rgba(15,23,42,0.1)]"
            >
              <QuestionTypeCompactContent type={type.value} />
            </button>
          ))}
        </div>
        <Button
          onClick={() => onOpenChange(false)}
          variant="outline"
          className="pointer-events-auto h-10 rounded-full border-[color:color-mix(in_oklab,var(--theme-primary)_18%,var(--color-border))] bg-background px-5 text-[12px] font-semibold text-[color:color-mix(in_oklab,var(--theme-primary)_62%,var(--color-foreground))] shadow-[0_10px_22px_rgba(15,23,42,0.08)] hover:bg-interaction-surface-strong"
        >
          <X className="mr-1.5 h-4 w-4" />
          取消添加
        </Button>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-8 z-20 flex justify-center">
      <Button
        onClick={() => onOpenChange(true)}
        className="pointer-events-auto h-10 rounded-full border border-border bg-background px-4 text-[12px] font-semibold text-foreground shadow-[0_8px_22px_rgba(15,23,42,0.08)] hover:bg-interaction-surface-strong"
      >
        <Plus className="mr-1.5 h-4 w-4" />
        添加新题
      </Button>
    </div>
  );
};
