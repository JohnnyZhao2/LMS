import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BookOpen, ClipboardList, GripVertical, Trash2, Trophy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getTaskResourceGroup } from './use-task-form.helpers';
import type { SelectedResource } from './task-form.types';

interface SortableResourceItemProps {
  item: SelectedResource;
  indexInGroup: number;
  removeResource: (uid: number) => void;
  disabled?: boolean;
  isOverlay?: boolean;
}

export const SortableResourceItem: React.FC<SortableResourceItemProps> = ({
  item,
  indexInGroup,
  removeResource,
  disabled = false,
  isOverlay = false,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(item.uid),
    disabled: isOverlay || disabled,
  });

  const style = {
    transform: isOverlay ? undefined : CSS.Transform.toString(transform),
    transition: isOverlay ? undefined : transition,
    zIndex: isDragging && !isOverlay ? 20 : undefined,
  };

  const group = getTaskResourceGroup(item);
  const config = {
    DOCUMENT: {
      icon: BookOpen,
      iconClassName: 'bg-secondary-50 text-secondary',
    },
    PRACTICE: {
      icon: ClipboardList,
      iconClassName: 'bg-primary-50 text-primary',
    },
    EXAM: {
      icon: Trophy,
      iconClassName: 'bg-destructive-50 text-destructive',
    },
  }[group];
  const Icon = config.icon;

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      className={cn(
        'transition-[transform,opacity] duration-150',
        isDragging && !isOverlay && 'pointer-events-none opacity-0',
      )}
    >
      <div
        className={cn(
          'flex h-[64px] items-center gap-2.5 rounded-lg border border-border bg-background p-2.5 text-left',
          !isOverlay && 'hover:border-interaction-border hover:bg-interaction-surface',
          isOverlay && 'shadow-[0_10px_24px_rgba(15,23,42,0.1)]',
          item.isMissingSource && 'border-warning-300 bg-warning-50/30',
        )}
      >
        <div
          {...(disabled || isOverlay ? {} : attributes)}
          {...(disabled || isOverlay ? {} : listeners)}
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded text-text-muted transition-colors duration-150',
            disabled
              ? 'cursor-not-allowed opacity-50'
              : isOverlay
                ? 'cursor-grabbing'
                : 'cursor-grab hover:text-foreground active:cursor-grabbing',
          )}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>

        <div className="w-5 shrink-0 text-center text-[10px] font-medium tabular-nums text-text-muted">
          {indexInGroup + 1}
        </div>

        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', config.iconClassName)}>
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-foreground">{item.title}</div>
          <div className="mt-0.5 truncate text-[10px] font-medium text-text-muted">{item.category || '-'}</div>
        </div>

        {item.isMissingSource ? (
          <span className="shrink-0 text-[11px] font-medium text-warning-700">资源已删除</span>
        ) : null}

        <div className="flex shrink-0 items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive-500 hover:bg-destructive-50 hover:text-destructive-600"
            disabled={disabled || isOverlay}
            onClick={() => removeResource(item.uid)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
