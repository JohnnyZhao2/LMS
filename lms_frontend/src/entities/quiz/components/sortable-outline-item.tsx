import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

import { cn } from '@/lib/utils';
import { richTextToPreviewText } from '@/lib/rich-text';
import type { InlineQuestionItem } from '@/entities/quiz/types';

interface SortableOutlineItemProps {
  item: InlineQuestionItem;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  isOverlay?: boolean;
  dragDisabled?: boolean;
  displayMode?: 'card' | 'plain';
}

export const SortableOutlineItem: React.FC<SortableOutlineItemProps> = ({
  item,
  index,
  isActive,
  onSelect,
  isOverlay = false,
  dragDisabled = false,
  displayMode = 'card',
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.key,
    disabled: isOverlay || dragDisabled,
  });
  const cardStyle = {
    transform: isOverlay ? undefined : CSS.Transform.toString(transform),
    transition: isOverlay ? undefined : transition,
    zIndex: isDragging && !isOverlay ? 10 : undefined,
  };

  return (
    <OutlineItemCard
      item={item}
      index={index}
      isActive={isActive}
      onSelect={onSelect}
      setNodeRef={isOverlay ? undefined : setNodeRef}
      cardStyle={cardStyle}
      dragButtonProps={isOverlay ? undefined : { ...attributes, ...listeners }}
      isDraggingSource={isDragging && !isOverlay}
      isOverlay={isOverlay}
      dragDisabled={dragDisabled}
      displayMode={displayMode}
    />
  );
};

interface OutlineItemCardProps {
  item: InlineQuestionItem;
  index: number;
  isActive: boolean;
  onSelect?: () => void;
  setNodeRef?: (node: HTMLDivElement | null) => void;
  cardStyle?: React.CSSProperties;
  dragButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
  isDraggingSource?: boolean;
  isOverlay?: boolean;
  dragDisabled?: boolean;
  displayMode?: 'card' | 'plain';
}

const OutlineItemCard: React.FC<OutlineItemCardProps> = ({
  item,
  index,
  isActive,
  onSelect,
  setNodeRef,
  cardStyle,
  dragButtonProps,
  isDraggingSource = false,
  isOverlay = false,
  dragDisabled = false,
  displayMode = 'card',
}) => (
    <div
      ref={setNodeRef}
      style={cardStyle}
      onClick={onSelect}
      className={cn(
        'group relative cursor-pointer transition-[border-color,color,box-shadow,opacity] duration-150',
        displayMode === 'plain' ? 'py-0.5' : 'py-1.5',
        displayMode === 'plain'
          ? 'border border-transparent bg-background'
          : 'border border-border bg-background',
        displayMode === 'plain'
          ? 'hover:bg-transparent'
          : isActive
            ? 'border-foreground/15 hover:border-primary-300'
            : 'hover:border-primary-300',
        isDraggingSource && 'opacity-0',
        isOverlay && 'scale-[0.99] border-foreground/12 bg-background shadow-[0_10px_24px_rgba(15,23,42,0.12)]',
      )}
    >
      {displayMode === 'plain' ? (
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute -inset-y-0.5 rounded-lg transition-colors duration-150',
            isActive ? '-left-1.5 -right-1.5 bg-muted/65' : '-left-1.5 -right-1.5 group-hover:bg-muted/35',
          )}
        />
      ) : null}
      <div
        className={cn(
          'relative grid grid-cols-[1.25rem_minmax(0,1fr)_1.5rem] items-center gap-x-2 px-1.5',
          displayMode === 'plain' ? 'min-h-7' : 'min-h-8',
        )}
      >
        <div className="flex h-5 shrink-0 items-center justify-start text-[13px] leading-5 font-medium tabular-nums text-text-muted">
          {index + 1}
        </div>
        <div className="flex min-w-0 items-center">
          <div
            className={cn(
              'line-clamp-1 text-[13px] leading-5',
              isActive ? 'text-foreground' : 'text-foreground/82',
            )}
          >
            {richTextToPreviewText(item.content || '') || '未填写题目'}
          </div>
        </div>
        {dragDisabled ? null : (
          <button
            type="button"
            aria-label={`拖动排序第${index + 1}题`}
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-muted opacity-0 transition-[background-color,color,opacity] hover:bg-muted hover:text-foreground group-hover:opacity-100',
              isActive && 'opacity-100',
              isDraggingSource || isOverlay ? 'cursor-grabbing' : 'cursor-grab active:cursor-grabbing',
            )}
            {...dragButtonProps}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
