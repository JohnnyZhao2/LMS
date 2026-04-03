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
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, FileText, GripVertical, Plus, Trash2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  QUESTION_TYPE_PICKER_OPTIONS,
  getQuestionTypePresentation,
} from '@/features/questions/constants';
import { AnswerInput, OptionsInput } from '@/features/questions/components/question-form-inputs';
import type { QuestionType } from '@/types/api';
import type { InlineQuestionItem } from '../types';
import { CompactNumberInput } from './compact-number-input';

const DEFAULT_CHOICE_OPTIONS = [
  { key: 'A', value: '' },
  { key: 'B', value: '' },
  { key: 'C', value: '' },
  { key: 'D', value: '' },
];

const ensureChoiceOptions = (options: Array<{ key: string; value: string }>) => {
  if (options.length >= 4) {
    return options;
  }
  return [
    ...options,
    ...DEFAULT_CHOICE_OPTIONS.slice(options.length).map((option) => ({ ...option })),
  ];
};

const QuestionTypeCompactContent: React.FC<{
  type: QuestionType;
  withDivider?: boolean;
}> = ({ type, withDivider = true }) => {
  const { icon: Icon, label, color, bg } = getQuestionTypePresentation(type);

  return (
    <span className="inline-flex items-center justify-center gap-2">
      <span className={cn('inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px]', bg, color)}>
        <Icon className="h-2.5 w-2.5" strokeWidth={2.3} />
      </span>
      {withDivider && <div className="h-3.5 w-px shrink-0 bg-foreground/20" />}
      <span className="text-[11.5px] font-semibold tracking-[-0.01em] text-foreground/88">
        {label}
      </span>
    </span>
  );
};

const QuestionTypeSelectItemContent: React.FC<{
  type: QuestionType;
}> = ({ type }) => {
  const { icon: Icon, label, color, bg } = getQuestionTypePresentation(type);

  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className={cn('inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[7px]', bg, color)}>
        <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
      </span>
      <span className="h-3.5 w-px shrink-0 bg-border/80" aria-hidden="true" />
      <span className="truncate text-[12.5px] font-semibold tracking-[-0.01em] text-foreground/88">
        {label}
      </span>
    </span>
  );
};

const QuestionTypeSelectTriggerValue: React.FC<{
  type: QuestionType;
}> = ({ type }) => (
  <>
    <span className="flex min-w-0 flex-1 items-center justify-center">
      <QuestionTypeCompactContent type={type} />
    </span>
    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted/62">
      <ChevronDown className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />
    </span>
  </>
);

interface QuizDocumentEditorProps {
  items: InlineQuestionItem[];
  activeKey: string | null;
  onUpdateItem: (key: string, patch: Partial<InlineQuestionItem>) => void;
  onRemoveItem: (key: string) => void;
  onReorderItems: (activeKey: string, overKey: string) => void;
  onAddBlank: (questionType?: QuestionType) => void;
  onFocusItem: (key: string) => void;
}

/**
 * 试卷文档流内联编辑：题目内容、分值、选项与解析。不展示 space 编辑，space 归属在题库中心维护。
 */
export const QuizDocumentEditor: React.FC<QuizDocumentEditorProps> = ({
  items,
  activeKey,
  onUpdateItem,
  onRemoveItem,
  onReorderItems,
  onAddBlank,
  onFocusItem,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dragCleanupFrameRef = useRef<number | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [draggingItemKey, setDraggingItemKey] = useState<string | null>(null);
  const [draggingItemWidth, setDraggingItemWidth] = useState<number | null>(null);
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

  useEffect(() => {
    if (!showAddMenu) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setShowAddMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAddMenu]);

  useEffect(() => {
    return () => {
      if (dragCleanupFrameRef.current !== null) {
        cancelAnimationFrame(dragCleanupFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!activeKey) return;

    const node = itemRefs.current[activeKey];
    if (!node) return;

    node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeKey]);

  const handleCreateQuestion = (questionType: QuestionType) => {
    onAddBlank(questionType);
    setShowAddMenu(false);
  };

  const draggingItem = useMemo(
    () => items.find((item) => item.key === draggingItemKey) ?? null,
    [draggingItemKey, items],
  );

  const clearDragState = () => {
    if (dragCleanupFrameRef.current !== null) {
      cancelAnimationFrame(dragCleanupFrameRef.current);
      dragCleanupFrameRef.current = null;
    }
    setDraggingItemKey(null);
    setDraggingItemWidth(null);
  };

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
    <div ref={containerRef} className="relative flex h-full min-w-0 flex-1 flex-col bg-background">
      <div className="flex-1 overflow-y-auto scrollbar-subtle px-10 py-10">
        {items.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={({ active }) => {
              setDraggingItemKey(String(active.id));
              setDraggingItemWidth(active.rect.current.initial?.width ?? null);
              onFocusItem(String(active.id));
            }}
            onDragCancel={() => {
              clearDragState();
            }}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items.map((item) => item.key)} strategy={verticalListSortingStrategy}>
              <div className="mx-auto flex max-w-[820px] flex-col gap-6 pb-28">
                {items.map((item, index) => (
                  <InlineQuestionCard
                    key={item.key}
                    item={item}
                    index={index}
                    isActive={item.key === activeKey}
                    onUpdate={(patch) => onUpdateItem(item.key, patch)}
                    onRemove={() => onRemoveItem(item.key)}
                    onFocus={() => onFocusItem(item.key)}
                    onSetRef={(node) => {
                      itemRefs.current[item.key] = node;
                    }}
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
                  <InlineQuestionCard
                    item={draggingItem}
                    index={items.findIndex((item) => item.key === draggingItem.key)}
                    isActive={draggingItem.key === activeKey}
                    onUpdate={() => undefined}
                    onRemove={() => undefined}
                    onFocus={() => undefined}
                    onSetRef={() => undefined}
                    isOverlay
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-text-muted">
            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-background">
              <FileText className="h-8 w-8 opacity-30" />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-medium text-foreground/60">暂无题目</p>
            </div>
          </div>
        )}
      </div>

      {showAddMenu && (
        <div className="pointer-events-none absolute inset-x-0 bottom-8 z-20 flex flex-col items-center">
          <div className="pointer-events-auto mb-3 flex flex-wrap items-center justify-center gap-2.5 px-6">
            {QUESTION_TYPE_PICKER_OPTIONS.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => handleCreateQuestion(type.value)}
                className="flex h-11 min-w-[96px] items-center justify-center rounded-[14px] border border-border/70 bg-background/96 px-4 shadow-[0_12px_28px_rgba(15,23,42,0.12)] backdrop-blur-[6px] transition-[border-color,background-color,transform,box-shadow] duration-200 hover:-translate-y-px hover:border-primary-200 hover:bg-primary-50/72 hover:shadow-[0_14px_32px_rgba(37,99,235,0.14)]"
              >
                <QuestionTypeCompactContent type={type.value} withDivider={false} />
              </button>
            ))}
          </div>
          <Button onClick={() => setShowAddMenu(false)} className="pointer-events-auto h-10 rounded-[14px] bg-foreground px-5 text-[12.5px] font-semibold text-background shadow-[0_10px_22px_rgba(15,23,42,0.14)] hover:bg-foreground/92">
            <X className="mr-2 h-4 w-4" />
            取消添加
          </Button>
        </div>
      )}

      {!showAddMenu && (
        <div className="pointer-events-none absolute inset-x-0 bottom-8 z-20 flex justify-center">
          <Button onClick={() => setShowAddMenu(true)} className="pointer-events-auto h-[42px] rounded-xl border border-border bg-background px-5 text-[12px] font-semibold text-foreground shadow-[0_8px_24px_rgba(15,23,42,0.12)] hover:bg-muted">
            <Plus className="mr-1.5 h-4 w-4" />
            添加新题
          </Button>
        </div>
      )}
    </div>
  );
};

interface InlineQuestionCardProps {
  item: InlineQuestionItem;
  index: number;
  isActive: boolean;
  onUpdate: (patch: Partial<InlineQuestionItem>) => void;
  onRemove: () => void;
  onFocus: () => void;
  onSetRef: (node: HTMLDivElement | null) => void;
  isOverlay?: boolean;
}

const InlineQuestionCard: React.FC<InlineQuestionCardProps> = ({
  item,
  index,
  isActive,
  onUpdate,
  onRemove,
  onFocus,
  onSetRef,
  isOverlay = false,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.key,
    disabled: isOverlay,
  });
  const isChoiceType = item.questionType === 'SINGLE_CHOICE' || item.questionType === 'MULTIPLE_CHOICE';
  const currentType = getQuestionTypePresentation(item.questionType);
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
        'group flex items-start gap-3 transition-all',
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
        className={cn(
          'min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-background transition-all',
          isOverlay && 'shadow-[0_18px_40px_rgba(15,23,42,0.18)]',
          isActive
            ? 'border-border/80 shadow-sm'
            : 'hover:border-border/80 hover:shadow-sm',
        )}
      >
        <div className="flex items-center gap-3 border-b border-border bg-transparent px-8 py-3">
          <div className="flex flex-1 items-center gap-3">
            <span className="text-[11px] font-medium text-text-muted">第 {index + 1} 题</span>
            {item.questionId ? (
              <div className="flex h-7 items-center justify-center rounded-md bg-muted px-3 py-1">
                <QuestionTypeCompactContent type={item.questionType} />
              </div>
            ) : (
              <div className="flex h-7 items-center">
                <Select
                  value={item.questionType}
                  onValueChange={(value) => onUpdate({
                    questionType: value as QuestionType,
                    options: value === 'MULTIPLE_CHOICE'
                      ? ensureChoiceOptions(item.options)
                      : item.options,
                  })}
                >
                  <SelectTrigger
                    className="relative h-7 min-w-[92px] shrink-0 justify-center gap-0 rounded-md border-none bg-muted pl-2.5 pr-7 text-[11.5px] font-semibold tracking-[-0.01em] shadow-none ring-0 focus-visible:ring-0 data-[state=open]:ring-0 [&>svg]:hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <QuestionTypeSelectTriggerValue type={currentType.value} />
                  </SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPE_PICKER_OPTIONS.map(({ value }) => (
                      <SelectItem key={value} value={value}>
                        <QuestionTypeSelectItemContent type={value} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <CompactNumberInput
              prefixLabel="分值"
              mode="integer"
              value={item.score}
              onChange={(value) => onUpdate({ score: value })}
              min={0}
              max={100}
              step={1}
              inputWidthClassName="w-8"
              inputClassName="text-[11px] leading-none"
              className="h-7 gap-1.5 px-2.5 py-1"
            />
          </div>

          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive-50 hover:text-destructive-500" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2.5 px-7 pt-3 pb-2.5">
            <div className="rounded-lg bg-muted/32 px-4 py-0.5">
              <Textarea
                autoResize
                placeholder="输入题目描述..."
                value={item.content}
                onChange={(e) => onUpdate({ content: e.target.value })}
                rows={2}
                className="min-h-[48px] border-0 bg-transparent px-0 py-0 text-[15px] font-semibold leading-6 text-foreground shadow-none placeholder:text-text-muted/35 focus:border-transparent focus:bg-transparent focus:ring-0"
              />
            </div>

            <div className="space-y-1.5">
              {isChoiceType ? (
                <OptionsInput
                  questionType={item.questionType}
                  value={item.options}
                  onChange={(opts) => onUpdate({ options: opts })}
                  answer={item.answer}
                  onAnswerChange={(ans) => onUpdate({ answer: ans })}
                />
              ) : (
                <>
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                    参考答案
                  </Label>
                  <AnswerInput
                    questionType={item.questionType}
                    options={item.options}
                    value={item.answer}
                    onChange={(ans) => onUpdate({ answer: ans })}
                  />
                </>
              )}
            </div>

            <div className="space-y-1 border-t border-border pt-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                  答案解析
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={item.showExplanation}
                  aria-label={`切换第${index + 1}题答案解析`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.showExplanation) {
                      onUpdate({ showExplanation: false, explanation: '' });
                      return;
                    }
                    onUpdate({ showExplanation: true });
                  }}
                  className={cn(
                    'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors',
                    item.showExplanation ? 'bg-primary/70' : 'bg-muted',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-background shadow-[0_1px_3px_rgba(15,23,42,0.18)] transition-transform',
                      item.showExplanation && 'translate-x-4',
                    )}
                  />
                </button>
              </div>
              {item.showExplanation ? (
                <Textarea
                  autoResize
                  placeholder="提供给学员的解析说明..."
                  value={item.explanation}
                  onChange={(e) => onUpdate({ explanation: e.target.value })}
                  rows={1}
                  className="min-h-[24px] border-0 bg-transparent px-0 py-0 text-[13px] leading-6 text-foreground shadow-none placeholder:text-text-muted/35 focus:border-transparent focus:bg-transparent focus:ring-0"
                />
              ) : null}
            </div>
        </div>
      </div>
    </div>
  );
};
