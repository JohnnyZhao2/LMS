import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, GripVertical, X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SortableOptionItemProps {
  id: string;
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
        'group flex items-center gap-2.5 will-change-transform',
        isDragging && 'relative z-10',
      )}
    >
      <button
        type="button"
        onClick={onToggleAnswer}
        disabled={disabled}
        className={cn(
          'flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] border',
          'text-[10.5px] font-semibold transition-all duration-150',
          disabled ? 'cursor-default' : 'cursor-pointer',
          selected
            ? 'border-primary-200 bg-primary-50 text-primary-600 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.08)]'
            : 'border-border bg-background text-text-muted hover:border-border/80 hover:bg-muted/20',
        )}
      >
        {selected ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : optionKey}
      </button>

      <Input
        value={optionValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder=""
        className={cn(
          'h-7 flex-1 rounded-lg border px-3 text-[13px] shadow-none placeholder:text-text-muted/35 focus-visible:ring-0',
          selected
            ? 'border-primary-200 bg-white'
            : 'border-border bg-white',
        )}
        readOnly={disabled}
      />

      <div className="flex items-center gap-1">
        {canRemove && !disabled && (
          <button
            type="button"
            onClick={onRemove}
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
              'opacity-0 transition-opacity group-hover:opacity-100',
              'text-text-muted/50 hover:bg-destructive/10 hover:text-destructive',
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
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-muted transition hover:bg-muted hover:text-foreground',
              isDragging ? 'cursor-grabbing' : 'cursor-grab active:cursor-grabbing',
            )}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
