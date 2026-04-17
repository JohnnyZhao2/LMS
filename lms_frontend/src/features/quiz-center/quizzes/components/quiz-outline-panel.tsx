import React, { useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Clock3, Target } from 'lucide-react';

import { ScrollContainer } from '@/components/ui/scroll-container';
import { Tooltip } from '@/components/ui/tooltip';
import { QuestionTypeBadge } from '@/features/questions/components/question-type-badge';
import { buildQuestionSections } from '@/features/questions/question-sections';
import { useSortableListDnd } from '@/hooks/use-sortable-list-dnd';
import { formatScore } from '@/lib/score';
import { cn } from '@/lib/utils';
import type { QuestionType } from '@/types/common';
import type { QuizType } from '@/types/quiz';
import type { InlineQuestionItem } from '../types';
import { CompactNumberInput } from './compact-number-input';
import { SortableOutlineItem } from './sortable-outline-item';

const EXAM_META_GROUP_WIDTH_CLASSNAME = 'w-[116px]';

interface QuizOutlinePanelProps {
  items: InlineQuestionItem[];
  activeKey: string | null;
  quizType: QuizType;
  itemDisplayMode?: 'card' | 'plain';
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
  itemDisplayMode = 'card',
  title = '试卷结构',
  duration,
  passScore,
  readOnly = false,
  onSelectItem,
  onReorderItems,
  onDurationChange,
  onPassScoreChange,
}) => {
  const parseIntegerValue = (value: string) => {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  };
  const parseDecimalValue = (value: string) => {
    if (!value) return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
    return Math.round(parsed * 10) / 10;
  };
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
    onReorderItems(activeKey, overKey);
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

  return (
    <div className="flex h-full w-full min-w-0 flex-col bg-background">
      <div className="flex h-12 items-center justify-between gap-3 border-b border-border px-5">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold tracking-[0.01em] text-foreground">{title}</div>
        </div>
      </div>
      {quizType === 'EXAM' && (
        <div className="flex justify-center gap-8 border-b border-border bg-background px-5 py-3.5">
          <div className={cn('flex shrink-0 flex-col items-start gap-1.5', EXAM_META_GROUP_WIDTH_CLASSNAME)}>
            <div className="flex w-full items-center justify-start gap-1.5 text-[12px] font-medium text-text-muted">
              <Clock3 className="h-3.5 w-3.5" />
              参考时间
            </div>
            {readOnly ? (
              <div className="inline-flex h-8 w-full items-center justify-center rounded-lg bg-muted px-3 text-[12px] font-semibold text-foreground">
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
                className="h-8 w-full rounded-lg px-2"
              />
            )}
          </div>
          <div className={cn('flex shrink-0 flex-col items-start gap-1.5', EXAM_META_GROUP_WIDTH_CLASSNAME)}>
            <div className="flex w-full items-center justify-start gap-1.5 text-[12px] font-medium text-text-muted">
              <Target className="h-3.5 w-3.5" />
              及格分数
            </div>
            {readOnly ? (
              <div className="inline-flex h-8 w-full items-center justify-center rounded-lg bg-muted px-3 text-[12px] font-semibold text-foreground">
                {formatScore(passScore) || '0'} 分
              </div>
            ) : (
              <CompactNumberInput
                value={passScore ? formatScore(passScore) : ''}
                onChange={(value) => onPassScoreChange(parseDecimalValue(value))}
                min={1}
                mode="decimal"
                step={0.1}
                unit="分"
                dividerBeforeUnit
                inputWidthClassName="w-12"
                inputClassName="text-[12px] font-semibold"
                className="h-8 w-full rounded-lg px-2"
              />
            )}
          </div>
        </div>
      )}
      <ScrollContainer className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="h-full" />
        ) : readOnly ? (
          <div className="space-y-5 px-4 py-4">
            {groupedSections.map((section) => (
              <div key={section.type} className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <SectionHeader sectionType={section.type} />
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
                        <SectionHeader sectionType={section.type} />
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
        <div className="mb-3.5 flex items-end justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-[15px] font-bold tabular-nums leading-none text-foreground">{totalScoreText}</span>
            <span className="text-[11px] font-semibold tracking-wide text-text-muted/50">分</span>
          </div>
          <span className="text-[11px] font-semibold tracking-wide text-text-muted/50">{items.length} 题</span>
        </div>

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

const SectionHeader: React.FC<{ sectionType: QuestionType }> = ({ sectionType }) => {
  return <QuestionTypeBadge type={sectionType} size="sm" variant="plain" />;
};
