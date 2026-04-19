import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Pencil, Trash2 } from 'lucide-react';

import { SelectionIndicator } from '@/components/common/selection-indicator';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Tag } from '@/types/common';

interface SortableSpaceTagItemProps {
  tag: Tag;
  accentColor: string;
  isSelected: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  dragDisabled?: boolean;
  isOverlay?: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const SortableSpaceTagItem: React.FC<SortableSpaceTagItemProps> = ({
  tag,
  accentColor,
  isSelected,
  canUpdate,
  canDelete,
  dragDisabled = false,
  isOverlay = false,
  onClick,
  onEdit,
  onDelete,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(tag.id),
    disabled: dragDisabled || isOverlay,
  });

  const interactiveProps = isOverlay ? {} : { ...attributes, ...listeners };

  return (
    <article
      ref={setNodeRef}
      onClick={onClick}
      style={{
        transform: isOverlay ? undefined : CSS.Transform.toString(transform),
        transition: isOverlay ? undefined : transition,
        boxShadow: `0 12px 30px color-mix(in srgb, ${accentColor} 20%, transparent)`,
      }}
      className={cn(
        'group relative inline-flex min-w-0 max-w-full items-center gap-2.5 rounded-full border border-transparent bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,246,237,0.98))] py-2 pl-3 pr-2 text-left transition-all duration-200 will-change-transform',
        dragDisabled ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing',
        isSelected && 'ring-2 ring-primary/35',
        isDragging && !isOverlay && 'z-10 opacity-0',
        isOverlay && 'pointer-events-none scale-[0.995] shadow-[0_18px_40px_rgba(15,23,42,0.18)]',
      )}
      {...interactiveProps}
    >
      <SelectionIndicator
        color={accentColor}
        selected={isSelected}
        className="transition-all"
      />

      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <h3 className="max-w-[14rem] truncate pr-1 text-[13px] font-semibold text-foreground">
          {tag.name}
        </h3>
        {tag.color && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-2 py-1 text-[10px] font-semibold leading-none text-text-muted">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: tag.color }}
            />
            {tag.color}
          </span>
        )}
      </div>

      <div className="ml-1 flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
        {canUpdate && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 rounded-full p-0 text-text-muted hover:bg-black/5 hover:text-foreground"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 rounded-full p-0 text-text-muted hover:bg-destructive/10 hover:text-destructive"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </article>
  );
};
