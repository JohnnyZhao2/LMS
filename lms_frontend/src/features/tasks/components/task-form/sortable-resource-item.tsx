import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SelectedResource } from './task-form.types';

interface SortableResourceItemProps {
  item: SelectedResource;
  removeResource: (uid: number) => void;
  disabled?: boolean;
  isOverlay?: boolean;
}

export const SortableResourceItem: React.FC<SortableResourceItemProps> = ({
  item,
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
          'group/card flex h-[76px] items-center gap-2.5 rounded-lg border border-transparent bg-muted/55 p-2.5 text-left',
          !isOverlay && 'hover:border-interaction-border',
          isOverlay && 'border-border/70 shadow-[0_10px_24px_rgba(15,23,42,0.1)]',
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
            className={cn(
              'h-7 w-7 text-destructive-500 opacity-0 transition-opacity hover:bg-destructive-50 hover:text-destructive-600 group-hover/card:opacity-100',
              isOverlay && 'opacity-0',
            )}
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
