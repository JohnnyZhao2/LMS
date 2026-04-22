import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';

import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { QuestionType } from '@/types/common';
import { QuestionChoiceIndicator } from './question-document-shared';

interface SortableOptionItemProps {
  id: string;
  questionType: QuestionType;
  optionKey: string;
  optionValue: string;
  selected: boolean;
  disabled?: boolean;
  canRemove: boolean;
  onToggleAnswer: () => void;
  onChange: (value: string) => void;
  onRemove: () => void;
}

export const SortableOptionItem: React.FC<SortableOptionItemProps> = ({
  id,
  questionType,
  optionKey,
  optionValue,
  selected,
  disabled = false,
  canRemove,
  onToggleAnswer,
  onChange,
  onRemove,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const isSingleChoice = questionType === 'SINGLE_CHOICE';
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-stretch gap-2.5 will-change-transform',
        isDragging && 'relative z-10',
      )}
    >
      <button
        type="button"
        onClick={onToggleAnswer}
        disabled={disabled}
        aria-label={`${selected ? '取消' : '设为'}${isSingleChoice ? '正确答案' : '正确选项'} ${optionKey}`}
        className={cn(
          'flex w-[18px] shrink-0 items-center justify-center self-stretch p-0 leading-none',
          disabled ? 'cursor-default' : 'cursor-pointer',
        )}
      >
        <QuestionChoiceIndicator
          selected={selected}
          shape={isSingleChoice ? 'circle' : 'square'}
          className={cn(
            'h-[14px] w-[14px] border transition-colors duration-150',
            selected && 'shadow-[0_0_0_2px_var(--theme-interaction-outline)]',
          )}
          selectedClassName="border-primary-500 bg-primary-500"
          unselectedClassName="border-gray-300 bg-transparent"
          iconClassName="h-[8px] w-[8px]"
          dotClassName="h-[5px] w-[5px] bg-white"
        />
      </button>

      <div
        className={cn(
          'flex min-h-[42px] flex-1 items-start gap-1.5 rounded-xl border px-3.5 py-2.5',
          selected
            ? 'border-primary-300 bg-primary-50/70'
            : 'border-border bg-background',
        )}
      >
        <Textarea
          autoResize
          rows={1}
          value={optionValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder=""
          interactionStyle="minimal"
          className={cn(
            'min-h-[20px] min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1 py-0 text-[14px] leading-5 break-all shadow-none placeholder:text-text-muted/35 transition-[border-color,box-shadow,background-color,color] duration-200 focus-visible:ring-0',
            'hover:border-transparent hover:bg-transparent focus:border-transparent focus:bg-transparent focus:shadow-none',
            'resize-none',
          )}
          readOnly={disabled}
        />

        <div className="flex shrink-0 items-center gap-0.5 self-center">
          {canRemove && !disabled && (
            <button
              type="button"
              onClick={onRemove}
              className={cn(
                'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md',
                'text-text-muted/45 transition-colors hover:bg-destructive/10 hover:text-destructive',
              )}
            >
              <X className="h-[11px] w-[11px]" />
            </button>
          )}
          {!disabled && (
            <button
              type="button"
              aria-label={`拖动排序选项 ${optionKey}`}
              className={cn(
                'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md text-text-muted transition hover:bg-interaction-surface-strong hover:text-foreground',
                isDragging ? 'cursor-grabbing' : 'cursor-grab active:cursor-grabbing',
              )}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-[11px] w-[11px]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
