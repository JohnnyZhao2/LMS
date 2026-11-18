import React, { useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { ScrollContainer } from '@/components/ui/scroll-container';
import { Tooltip } from '@/components/ui/tooltip';
import { QuestionTypeBadge } from '@/components/questions/question-type-badge';
import { QUESTION_TYPE_CONFIG } from '@/config/questions';
import { buildQuestionSections } from '@/lib/question-sections';
import { useSortableListDnd } from '@/hooks/use-sortable-list-dnd';
import { formatScore } from '@/lib/score';
import { cn } from '@/lib/utils';
import type { EditableQuestionItem } from '@/lib/question-editor';
import { SortableOutlineItem } from './sortable-outline-item';

interface QuizOutlinePanelProps {
  items: EditableQuestionItem[];
  activeKey: string | null;
  itemDisplayMode?: 'card' | 'plain';
  title?: string;
  showScoreSummary?: boolean;
  readOnly?: boolean;
  onSelectItem: (key: string) => void;
  onReorderItems?: (activeKey: string, overKey: string) => void;
}

export const QuizOutlinePanel: React.FC<QuizOutlinePanelProps> = ({
  items,
  activeKey,
  itemDisplayMode = 'card',
  title = '试卷结构',
  showScoreSummary = true,
  readOnly = false,
  onSelectItem,
  onReorderItems,
}) => {
  const groupedSections = useMemo(
    () => buildQuestionSections(items, (item) => item.questionType),
    [items],
  );
  const groupedItems = useMemo(
    () => groupedSections.flatMap((section) => section.entries.map(({ item }) => item)),
    [groupedSections],
  );
  const itemTypeMap = useMemo(
    () => new Map(items.map((item) => [item.key, item.questionType])),
    [items],
  );
  const handleGroupedReorder = (activeKey: string, overKey: string) => {
    if (itemTypeMap.get(activeKey) !== itemTypeMap.get(overKey)) {
      return;
    }
    onReorderItems?.(activeKey, overKey);
  };

  const {
    sensors,
    draggingItem,
    draggingItemWidth,
    clearDragState,
    handleDragStart,
    handleDragEnd,
  } = useSortableListDnd({
    items: groupedItems,
    onSelectItem,
    onReorderItems: handleGroupedReorder,
  });
  const totalScore = useMemo(
    () => items.reduce((sum, item) => {
      const score = Number(item.score);
      return sum + (Number.isFinite(score) ? score : 0);
    }, 0),
    [items],
  );

  const distribution = useMemo(() => groupedSections.map((section) => {
    const percent = items.length > 0 ? (section.entries.length / items.length) * 100 : 0;
    return {
      type: section.type,
      label: section.label,
      count: section.entries.length,
      barClassName: QUESTION_TYPE_CONFIG[section.type].accent,
      percent,
      percentText: `${percent.toFixed(1).replace(/\.0$/, '')}%`,
    };
  }), [groupedSections, items.length]);

  return (
    <div className="flex h-full w-full min-w-0 flex-col bg-background">
      <div className="flex h-12 items-center justify-between gap-3 border-b border-border px-5">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold tracking-[0.01em] text-foreground">{title}</div>
        </div>
      </div>
      <ScrollContainer className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="h-full" />
        ) : readOnly ? (
          <div className="space-y-5 px-4 py-4">
            {groupedSections.map((section) => (
              <div key={section.type} className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <QuestionTypeBadge type={section.type} size="sm" variant="plain" />
                  </div>
                </div>
                {section.entries.map(({ item, number }) => (
                  <SortableOutlineItem
                    key={item.key}
                    item={item}
                    index={number - 1}
                    isActive={item.key === activeKey}
                    onSelect={() => onSelectItem(item.key)}
                    dragDisabled
                    displayMode={itemDisplayMode}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragCancel={clearDragState}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={groupedItems.map((item) => item.key)} strategy={verticalListSortingStrategy}>
              <div className="space-y-5 px-4 py-4">
                {groupedSections.map((section) => (
                  <div key={section.type} className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <QuestionTypeBadge type={section.type} size="sm" variant="plain" />
                      </div>
                    </div>
                    {section.entries.map(({ item, number }) => (
                      <SortableOutlineItem
                        key={item.key}
                        item={item}
                        index={number - 1}
                        isActive={item.key === activeKey}
                        onSelect={() => onSelectItem(item.key)}
                        displayMode={itemDisplayMode}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {draggingItem ? (
                <div style={draggingItemWidth ? { width: draggingItemWidth } : undefined}>
                  <SortableOutlineItem
                    item={draggingItem}
                    index={groupedItems.findIndex((item) => item.key === draggingItem.key)}
                    isActive={draggingItem.key === activeKey}
                    onSelect={() => undefined}
                    isOverlay
                    displayMode={itemDisplayMode}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </ScrollContainer>
      <div className="border-t border-border bg-background px-5 py-4">
        {showScoreSummary ? (
          <div className="mb-3.5 flex items-end justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-[15px] font-bold tabular-nums leading-none text-foreground">{formatScore(totalScore)}</span>
              <span className="text-[11px] font-semibold tracking-wide text-text-muted/50">分</span>
            </div>
            <span className="text-[11px] font-semibold tracking-wide text-text-muted/50">{items.length} 题</span>
          </div>
        ) : (
          <div className="mb-3.5 flex items-center justify-end">
            <span className="text-[11px] font-semibold tracking-wide text-text-muted/50">{items.length} 题</span>
          </div>
        )}

        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          {distribution.length > 0 ? (
            <div className="flex h-full w-full">
              {distribution.map((item, index) => (
                <React.Fragment key={item.type}>
                  {index > 0 && <div className="w-px bg-background" />}
                  <Tooltip
                    title={`${item.label} ${item.count}题 · ${item.percentText}`}
                  >
                    <div
                      className={cn('h-full transition-[width] duration-200', item.barClassName)}
                      style={{ width: `${item.percent}%` }}
                    />
                  </Tooltip>
                </React.Fragment>
              ))}
            </div>
          ) : (
            <div className="h-full w-full bg-muted" />
          )}
        </div>
      </div>
    </div>
  );
};
