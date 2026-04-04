import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, GripVertical, X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { QuestionType } from '@/types/api';

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
        'group flex items-center gap-2 will-change-transform',
        isDragging && 'relative z-10',
      )}
    >
      <button
        type="button"
        onClick={onToggleAnswer}
        disabled={disabled}
        aria-label={`${selected ? '取消' : '设为'}${isSingleChoice ? '正确答案' : '正确选项'} ${optionKey}`}
        className={cn(
          'flex h-[14px] w-[14px] shrink-0 items-center justify-center border transition-all duration-150',
          disabled ? 'cursor-default' : 'cursor-pointer',
          isSingleChoice ? 'rounded-full' : 'rounded-[7px]',
          selected
            ? 'border-primary-500 bg-primary-500 text-white shadow-[0_0_0_2px_var(--theme-interaction-outline)]'
            : 'border-gray-300 bg-transparent text-text-muted hover:border-gray-400 hover:bg-transparent',
        )}
      >
        {isSingleChoice ? (
          <span
            className={cn(
              'block rounded-full transition-all duration-150',
              selected ? 'h-[5px] w-[5px] bg-white' : 'h-0 w-0',
            )}
            aria-hidden="true"
          />
        ) : selected ? (
          <Check className="h-[8px] w-[8px]" strokeWidth={4.4} />
        ) : null}
      </button>

      <Input
        value={optionValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder=""
        interactionStyle="minimal"
        className={cn(
          'h-7 flex-1 rounded-lg border border-transparent px-3 text-[13px] shadow-none placeholder:text-text-muted/35 transition-[border-color,box-shadow,background-color,color] duration-200 focus-visible:ring-0',
          selected
            ? 'border-primary-300 bg-interaction-surface-strong text-foreground shadow-[inset_0_0_0_1px_var(--theme-interaction-outline)]'
            : 'bg-interaction-surface-strong',
          'hover:border-transparent hover:bg-interaction-surface-strong focus:border-primary-300 focus:bg-interaction-surface-strong focus:shadow-[inset_0_0_0_1px_var(--theme-interaction-outline)]',
        )}
        readOnly={disabled}
      />

      <div className="flex items-center gap-0.5">
        {canRemove && !disabled && (
          <button
            type="button"
            onClick={onRemove}
            className={cn(
              'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md',
              'text-text-muted/45 transition-colors hover:bg-destructive/10 hover:text-destructive',
            )}
          >
            <X className="h-3 w-3" />
          </button>
        )}
        {!disabled && (
          <button
            type="button"
            aria-label={`拖动排序选项 ${optionKey}`}
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-muted transition hover:bg-interaction-surface-strong hover:text-foreground',
              isDragging ? 'cursor-grabbing' : 'cursor-grab active:cursor-grabbing',
            )}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
