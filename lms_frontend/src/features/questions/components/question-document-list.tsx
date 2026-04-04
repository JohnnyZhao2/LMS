import React from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileText, GripVertical } from 'lucide-react';

import { ScrollContainer } from '@/components/ui/scroll-container';
import { cn } from '@/lib/utils';
import type { QuestionType, Tag } from '@/types/api';

import { QuestionAddMenu } from './question-add-menu';
import { QuestionEditCard, type QuestionEditCardValue } from './question-edit-card';

type QuestionListItem = QuestionEditCardValue & { key: string };

interface QuestionDocumentListProps {
  items: QuestionListItem[];
  activeKey: string | null;
  spaceTypes?: Tag[];
  onChangeItem: (key: string, patch: Partial<QuestionEditCardValue>) => void;
  onSelectItem: (key: string) => void;
  onReorderItems: (activeKey: string, overKey: string) => void;
  onSaveItem?: (key: string) => void;
  onDeleteItem?: (key: string) => void;
  itemSavingKey?: string | null;
  itemDeletingKey?: string | null;
  addMenuOpen?: boolean;
  onAddMenuOpenChange?: (open: boolean) => void;
  onAddQuestion?: (questionType: QuestionType) => void;
  emptyState?: React.ReactNode;
}

interface SortableQuestionListItemProps {
  item: QuestionListItem;
  index: number;
  isActive: boolean;
  spaceTypes?: Tag[];
  onChange: (patch: Partial<QuestionEditCardValue>) => void;
  onSave?: () => void;
  onDelete?: () => void;
  onFocus: () => void;
  onSetRef: (node: HTMLDivElement | null) => void;
  isSaving: boolean;
  isDeleting: boolean;
  isOverlay?: boolean;
}

const DefaultEmptyState = (
  <div className="flex h-full flex-col items-center justify-center gap-4 text-text-muted">
    <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-background">
      <FileText className="h-8 w-8 opacity-30" />
    </div>
    <div className="text-center">
      <p className="text-[13px] font-medium text-foreground/60">暂无题目</p>
    </div>
  </div>
);

const SortableQuestionListItem: React.FC<SortableQuestionListItemProps> = ({
  item,
  index,
  isActive,
  spaceTypes,
  onChange,
  onSave,
  onDelete,
  onFocus,
  onSetRef,
  isSaving,
  isDeleting,
  isOverlay = false,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.key,
    disabled: isOverlay,
  });
  const cardStyle = {
    transform: isOverlay ? undefined : CSS.Transform.toString(transform),
    transition: isOverlay ? undefined : transition,
    zIndex: isDragging && !isOverlay ? 10 : undefined,
  };

  const handleSetRef = (node: HTMLDivElement | null) => {
    if (isOverlay) {
      return;
    }
    setNodeRef(node);
    onSetRef(node);
  };

  return (
    <div
      ref={handleSetRef}
      style={cardStyle}
      className={cn(
        'group flex items-start gap-2.5 transition-all',
        isDragging && !isOverlay && 'opacity-0',
        isOverlay && 'pointer-events-none scale-[0.995]',
      )}
    >
      <button
        type="button"
        aria-label={`拖动排序第${index + 1}题`}
        className={cn(
          'flex h-7 w-7 shrink-0 self-start items-center justify-center rounded-md bg-muted/45 text-foreground/55 transition hover:bg-muted/75 hover:text-foreground',
          isDragging || isOverlay ? 'cursor-grabbing' : 'cursor-grab active:cursor-grabbing',
          isActive && !isOverlay && 'bg-muted/75 text-foreground',
        )}
        {...(isOverlay ? {} : attributes)}
        {...(isOverlay ? {} : listeners)}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <div
        onClick={onFocus}
        className={cn('min-w-0 flex-1 transition-all', isOverlay && 'shadow-[0_18px_40px_rgba(15,23,42,0.18)]')}
      >
        <QuestionEditCard
          item={item}
          index={index}
          spaceTypes={spaceTypes}
          onChange={onChange}
          onFocus={onFocus}
          onDelete={onDelete}
          onSave={onSave}
          isSaving={isSaving}
          isDeleting={isDeleting}
          showMetaToolbar
        />
      </div>
    </div>
  );
};

export const QuestionDocumentList: React.FC<QuestionDocumentListProps> = ({
  items,
  activeKey,
  spaceTypes,
  onChangeItem,
  onSelectItem,
  onReorderItems,
  onSaveItem,
  onDeleteItem,
  itemSavingKey = null,
  itemDeletingKey = null,
  addMenuOpen = false,
  onAddMenuOpenChange,
  onAddQuestion,
  emptyState = DefaultEmptyState,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const dragCleanupFrameRef = React.useRef<number | null>(null);
  const [draggingItemKey, setDraggingItemKey] = React.useState<string | null>(null);
  const [draggingItemWidth, setDraggingItemWidth] = React.useState<number | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  React.useEffect(() => {
    if (!addMenuOpen || !onAddMenuOpenChange) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        onAddMenuOpenChange(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [addMenuOpen, onAddMenuOpenChange]);

  React.useEffect(() => () => {
    if (dragCleanupFrameRef.current !== null) {
      cancelAnimationFrame(dragCleanupFrameRef.current);
    }
  }, []);

  React.useEffect(() => {
    if (!activeKey) return;

    const node = itemRefs.current[activeKey];
    if (!node) return;

    node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeKey]);

  const draggingItem = React.useMemo(
    () => items.find((item) => item.key === draggingItemKey) ?? null,
    [draggingItemKey, items],
  );

  const clearDragState = React.useCallback(() => {
    if (dragCleanupFrameRef.current !== null) {
      cancelAnimationFrame(dragCleanupFrameRef.current);
      dragCleanupFrameRef.current = null;
    }
    setDraggingItemKey(null);
    setDraggingItemWidth(null);
  }, []);

  const handleDragEnd = React.useCallback(({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      clearDragState();
      return;
    }

    onReorderItems(String(active.id), String(over.id));
    dragCleanupFrameRef.current = requestAnimationFrame(() => {
      clearDragState();
    });
  }, [clearDragState, onReorderItems]);

  return (
    <div ref={containerRef} className="relative flex h-full min-w-0 flex-1 flex-col bg-background">
      <ScrollContainer className="flex-1 overflow-y-auto px-8 py-8">
        {items.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={({ active }) => {
              setDraggingItemKey(String(active.id));
              setDraggingItemWidth(active.rect.current.initial?.width ?? null);
              onSelectItem(String(active.id));
            }}
            onDragCancel={clearDragState}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items.map((item) => item.key)} strategy={verticalListSortingStrategy}>
              <div className="mx-auto flex max-w-[780px] flex-col gap-6 pb-28">
                {items.map((item, index) => (
                  <SortableQuestionListItem
                    key={item.key}
                    item={item}
                    index={index}
                    isActive={item.key === activeKey}
                    spaceTypes={spaceTypes}
                    onChange={(patch) => onChangeItem(item.key, patch)}
                    onSave={onSaveItem ? () => onSaveItem(item.key) : undefined}
                    onDelete={onDeleteItem ? () => onDeleteItem(item.key) : undefined}
                    onFocus={() => onSelectItem(item.key)}
                    onSetRef={(node) => {
                      itemRefs.current[item.key] = node;
                    }}
                    isSaving={itemSavingKey === item.key}
                    isDeleting={itemDeletingKey === item.key}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {draggingItem ? (
                <div
                  className="pointer-events-none"
                  style={draggingItemWidth ? { width: draggingItemWidth } : undefined}
                >
                  <SortableQuestionListItem
                    item={draggingItem}
                    index={items.findIndex((item) => item.key === draggingItem.key)}
                    isActive={draggingItem.key === activeKey}
                    spaceTypes={spaceTypes}
                    onChange={() => undefined}
                    onSave={undefined}
                    onDelete={undefined}
                    onFocus={() => undefined}
                    onSetRef={() => undefined}
                    isSaving={false}
                    isDeleting={false}
                    isOverlay
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          emptyState
        )}
      </ScrollContainer>

      {onAddQuestion && onAddMenuOpenChange ? (
        <QuestionAddMenu
          open={addMenuOpen}
          onOpenChange={onAddMenuOpenChange}
          onAdd={onAddQuestion}
        />
      ) : null}
    </div>
  );
};
