import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, GripVertical, X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SortableOptionItemProps {
  index: number;
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
  index,
  optionKey,
  optionValue,
  selected,
  disabled = false,
  canRemove,
  onToggleAnswer,
  onChange,
  onRemove,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `${optionKey}-${index}` });
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
        'group flex items-center gap-2.5 transition-all duration-100',
        isDragging && 'scale-[0.995] opacity-90',
      )}
    >
      <button
        type="button"
        onClick={onToggleAnswer}
        disabled={disabled}
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border',
          'text-[11px] font-semibold transition-all duration-150',
          disabled ? 'cursor-default' : 'cursor-pointer',
          selected
            ? 'border-primary-500 bg-primary-500 text-white'
            : 'border-border bg-background text-text-muted hover:border-border/80 hover:bg-muted/20',
        )}
      >
        {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : optionKey}
      </button>

      <Input
        value={optionValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`选项 ${optionKey}`}
        className={cn(
          'h-9 flex-1 rounded-xl border px-3 text-[13px] shadow-none placeholder:text-text-muted/35 focus-visible:ring-0',
          selected
            ? 'border-primary-100 bg-primary-50/40'
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
