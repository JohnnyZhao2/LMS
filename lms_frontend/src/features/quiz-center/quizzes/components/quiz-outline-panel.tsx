import React, { useMemo } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Clock3, FileText, Target } from 'lucide-react';

import { SegmentedControl } from '@/components/ui/segmented-control';
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
  duration?: number;
  passScore?: number;
  onQuizTypeChange: (quizType: QuizType) => void;
  onSelectItem: (key: string) => void;
  onReorderItems: (activeKey: string, overKey: string) => void;
  onDurationChange: (value?: number) => void;
  onPassScoreChange: (value?: number) => void;
}

export const QuizOutlinePanel: React.FC<QuizOutlinePanelProps> = ({
  items,
  activeKey,
  quizType,
  duration,
  passScore,
  onQuizTypeChange,
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

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onReorderItems(String(active.id), String(over.id));
  };

  return (
    <div className="flex w-64 shrink-0 flex-col border-r border-border bg-background xl:w-72">
      <div className="flex h-14 items-center justify-between gap-3 border-b border-border px-5">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
          <FileText className="h-4 w-4 text-primary-600" />
          <span>试卷结构</span>
        </div>
        <SegmentedControl
          value={quizType}
          onChange={(value) => onQuizTypeChange(value as QuizType)}
          options={[
            { label: '练习', value: 'PRACTICE' },
            { label: '考试', value: 'EXAM' },
          ]}
          activeColor="white"
          size="sm"
          className="w-auto shrink-0"
        />
      </div>
      {quizType === 'EXAM' && (
        <div className="space-y-3 border-b border-border bg-background px-5 py-4">
          <div className="flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-1.5 font-medium text-text-muted">
              <Clock3 className="h-3.5 w-3.5" />
              时间限制
            </div>
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
          </div>
          <div className="flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-1.5 font-medium text-text-muted">
              <Target className="h-3.5 w-3.5" />
              及格分数
            </div>
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
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto scrollbar-subtle">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-12 text-text-muted">
            <FileText className="mb-3 h-10 w-10 opacity-25" />
            <span className="text-xs">从右侧题库添加题目</span>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={({ active }) => onSelectItem(String(active.id))}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items.map((item) => item.key)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1 p-3">
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
          </DndContext>
        )}
      </div>
      <div className="border-t border-border bg-background px-3 py-2.5">
        <div className="bg-background px-2.5 py-2.5">
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
    </div>
  );
};
