import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { richTextToPreviewText } from '@/lib/rich-text';
import { getQuestionTypeLabel, getQuestionTypeStyle } from '@/features/questions/constants';
import type { InlineQuestionItem } from '../types';

interface SortableOutlineItemProps {
  item: InlineQuestionItem;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  isOverlay?: boolean;
}

export const SortableOutlineItem: React.FC<SortableOutlineItemProps> = ({
  item,
  index,
  isActive,
  onSelect,
  isOverlay = false,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.key,
    disabled: isOverlay,
  });
  const style = getQuestionTypeStyle(item.questionType);
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
      style={style}
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
  style?: ReturnType<typeof getQuestionTypeStyle>;
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
  style = getQuestionTypeStyle(item.questionType),
}) => (
    <div
      ref={setNodeRef}
      style={cardStyle}
      onClick={onSelect}
      className={cn(
        'group relative flex cursor-pointer items-start gap-2 overflow-hidden rounded-xl border border-border bg-background px-3 py-3 transition-[border-color,background-color,color] duration-150',
        isActive ? 'border-foreground/15' : 'hover:border-foreground/10',
        isDraggingSource && 'opacity-0',
        isOverlay && 'scale-[0.99] border-foreground/12 shadow-[0_10px_24px_rgba(15,23,42,0.12)]',
      )}
    >
      <div
        className={cn(
          'absolute left-0 top-1/2 h-5 w-px -translate-y-1/2 rounded-r-full transition-opacity duration-150',
          style.accent,
          'opacity-0 group-hover:opacity-100',
        )}
      />
      <div className="mt-0.5 flex w-4 shrink-0 items-center justify-center text-[10px] font-mono text-text-muted">
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5">
          <Badge variant="outline" className={cn('h-4 border-transparent px-1.5 text-[9px] font-medium leading-none', style.bg, style.color)}>
            {getQuestionTypeLabel(item.questionType)}
          </Badge>
        </div>
        <p className={cn('line-clamp-2 text-[13px] leading-relaxed', isActive ? 'font-medium text-foreground' : 'text-foreground')}>
          {richTextToPreviewText(item.content || '') || '未填写题目'}
        </p>
      </div>
      <button
        type="button"
        aria-label={`拖动排序第${index + 1}题`}
        className={cn(
          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-muted hover:text-foreground',
          isDraggingSource || isOverlay ? 'cursor-grabbing' : 'cursor-grab active:cursor-grabbing',
        )}
        {...dragButtonProps}
      >
        <GripVertical className="h-4 w-4" />
      </button>
    </div>
  );
