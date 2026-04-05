import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Clock3, FileText, Target } from 'lucide-react';

import { ScrollContainer } from '@/components/ui/scroll-container';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { QuestionType, QuizType } from '@/types/api';
import type { InlineQuestionItem } from '../types';
import { CompactNumberInput } from './compact-number-input';
import { SortableOutlineItem } from './sortable-outline-item';

interface QuizOutlinePanelProps {
  items: InlineQuestionItem[];
  activeKey: string | null;
  quizType: QuizType;
  title?: string;
  duration?: number;
  passScore?: number;
  readOnly?: boolean;
  onSelectItem: (key: string) => void;
  onReorderItems: (activeKey: string, overKey: string) => void;
  onDurationChange: (value?: number) => void;
  onPassScoreChange: (value?: number) => void;
}

export const QuizOutlinePanel: React.FC<QuizOutlinePanelProps> = ({
  items,
  activeKey,
  quizType,
  title = '试卷结构',
  duration,
  passScore,
  readOnly = false,
  onSelectItem,
  onReorderItems,
  onDurationChange,
  onPassScoreChange,
}) => {
  const [draggingItemKey, setDraggingItemKey] = useState<string | null>(null);
  const [draggingItemWidth, setDraggingItemWidth] = useState<number | null>(null);
  const dragCleanupFrameRef = useRef<number | null>(null);

  const clearDragState = () => {
    if (dragCleanupFrameRef.current !== null) {
      cancelAnimationFrame(dragCleanupFrameRef.current);
      dragCleanupFrameRef.current = null;
    }
    setDraggingItemKey(null);
    setDraggingItemWidth(null);
  };

  useEffect(() => {
    return () => {
      if (dragCleanupFrameRef.current !== null) {
        cancelAnimationFrame(dragCleanupFrameRef.current);
      }
    };
  }, []);

  const parseIntegerValue = (value: string) => {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  };

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
  const stats = useMemo(() => {
    let totalScore = 0;
    let single = 0, multi = 0, tf = 0, short = 0;
    items.forEach((item) => {
      const s = Number(item.score);
      totalScore += Number.isFinite(s) ? s : 0;
      if (item.questionType === 'SINGLE_CHOICE') single++;
      if (item.questionType === 'MULTIPLE_CHOICE') multi++;
      if (item.questionType === 'TRUE_FALSE') tf++;
      if (item.questionType === 'SHORT_ANSWER') short++;
    });
    return { totalScore, single, multi, tf, short };
  }, [items]);
  const totalScoreText = Number.isInteger(stats.totalScore)
    ? String(stats.totalScore)
    : stats.totalScore.toFixed(1).replace(/\.0$/, '');

  const distribution = useMemo(() => {
    const totalItems = items.length;
    const typeStats: Array<{
      type: QuestionType;
      label: string;
      count: number;
      dotClassName: string;
      barClassName: string;
    }> = [
      {
        type: 'SINGLE_CHOICE',
        label: '单选题',
        count: stats.single,
        dotClassName: 'bg-primary-400',
        barClassName: 'bg-primary-400',
      },
      {
        type: 'MULTIPLE_CHOICE',
        label: '多选题',
        count: stats.multi,
        dotClassName: 'bg-secondary-400',
        barClassName: 'bg-secondary-400',
      },
      {
        type: 'TRUE_FALSE',
        label: '判断题',
        count: stats.tf,
        dotClassName: 'bg-warning-400',
        barClassName: 'bg-warning-400',
      },
      {
        type: 'SHORT_ANSWER',
        label: '简答题',
        count: stats.short,
        dotClassName: 'bg-slate-400',
        barClassName: 'bg-slate-400',
      },
    ];

    return typeStats
      .filter((item) => item.count > 0)
      .map((item) => ({
        ...item,
        percent: totalItems > 0 ? (item.count / totalItems) * 100 : 0,
        percentText: totalItems > 0 ? `${((item.count / totalItems) * 100).toFixed(1).replace(/\.0$/, '')}%` : '0%',
      }));
  }, [items.length, stats.multi, stats.short, stats.single, stats.tf]);

  const draggingItem = useMemo(
    () => items.find((item) => item.key === draggingItemKey) ?? null,
    [draggingItemKey, items],
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      clearDragState();
      return;
    }

    onReorderItems(String(active.id), String(over.id));

    dragCleanupFrameRef.current = requestAnimationFrame(() => {
      clearDragState();
    });
  };

  return (
    <div className="flex h-full w-full min-w-0 flex-col bg-background">
      <div className="flex h-12 items-center justify-between gap-3 border-b border-border px-5">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
          <FileText className="h-4 w-4 text-primary-600" />
          <span>{title}</span>
        </div>
      </div>
      {quizType === 'EXAM' && (
        <div className="space-y-3 border-b border-border bg-background px-5 py-4">
          <div className="flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-1.5 font-medium text-text-muted">
              <Clock3 className="h-3.5 w-3.5" />
              时间限制
            </div>
            {readOnly ? (
              <div className="inline-flex h-8 min-w-[88px] items-center justify-center rounded-lg bg-muted px-3 text-[12px] font-semibold text-foreground">
                {duration || 0} 分
              </div>
            ) : (
              <CompactNumberInput
                value={duration ? String(duration) : ''}
                onChange={(value) => onDurationChange(parseIntegerValue(value))}
                min={1}
                step={1}
                unit="分"
                dividerBeforeUnit
                inputWidthClassName="w-10"
                inputClassName="text-[12px] font-semibold"
                className="w-[88px] justify-center gap-1.5 bg-muted px-2"
              />
            )}
          </div>
          <div className="flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-1.5 font-medium text-text-muted">
              <Target className="h-3.5 w-3.5" />
              及格分数
            </div>
            {readOnly ? (
              <div className="inline-flex h-8 min-w-[88px] items-center justify-center rounded-lg bg-muted px-3 text-[12px] font-semibold text-foreground">
                {passScore || 0} 分
              </div>
            ) : (
              <CompactNumberInput
                value={passScore ? String(passScore) : ''}
                onChange={(value) => onPassScoreChange(parseIntegerValue(value))}
                min={1}
                step={1}
                unit="分"
                dividerBeforeUnit
                inputWidthClassName="w-10"
                inputClassName="text-[12px] font-semibold"
                className="w-[88px] justify-center gap-1.5 bg-muted px-2"
              />
            )}
          </div>
        </div>
      )}
      <ScrollContainer className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="h-full" />
        ) : readOnly ? (
          <div className="space-y-2.5 px-5 py-4">
            {items.map((item, idx) => (
              <SortableOutlineItem
                key={item.key}
                item={item}
                index={idx}
                isActive={item.key === activeKey}
                onSelect={() => onSelectItem(item.key)}
                dragDisabled
              />
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={({ active }) => {
              setDraggingItemKey(String(active.id));
              setDraggingItemWidth(active.rect.current.initial?.width ?? null);
              onSelectItem(String(active.id));
            }}
            onDragCancel={() => {
              clearDragState();
            }}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items.map((item) => item.key)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2.5 px-5 py-4">
                {items.map((item, idx) => (
                  <SortableOutlineItem
                    key={item.key}
                    item={item}
                    index={idx}
                    isActive={item.key === activeKey}
                    onSelect={() => onSelectItem(item.key)}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {draggingItem ? (
                <div style={draggingItemWidth ? { width: draggingItemWidth } : undefined}>
                  <SortableOutlineItem
                    item={draggingItem}
                    index={items.findIndex((item) => item.key === draggingItem.key)}
                    isActive={draggingItem.key === activeKey}
                    onSelect={() => undefined}
                    isOverlay
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </ScrollContainer>
      <div className="border-t border-border bg-background px-5 py-4">
        <div className="mb-3.5 flex items-end justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-[15px] font-bold tabular-nums leading-none text-foreground">{totalScoreText}</span>
            <span className="text-[11px] font-semibold tracking-wide text-text-muted/50">分</span>
          </div>
          <span className="text-[11px] font-semibold tracking-wide text-text-muted/50">{items.length} 题</span>
        </div>

        <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-muted">
          {distribution.length > 0 ? (
            <div className="flex h-full w-full">
              {distribution.map((item, index) => (
                <React.Fragment key={item.type}>
                  {index > 0 && <div className="w-px bg-background" />}
                  <Tooltip
                    title={`${item.label} ${item.percentText}`}
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

        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          {distribution.length > 0 ? (
            distribution.map((item) => (
              <div key={item.type} className="flex items-center justify-between">
                <div className="flex min-w-0 items-center gap-1">
                  <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', item.dotClassName)} />
                  <span className="truncate text-[10px] font-medium text-text-muted">{item.label}</span>
                </div>
                <span className="shrink-0 text-[11px] font-semibold tabular-nums text-text-muted">
                  {item.count}
                </span>
              </div>
            ))
          ) : null}
        </div>
      </div>
    </div>
  );
};
