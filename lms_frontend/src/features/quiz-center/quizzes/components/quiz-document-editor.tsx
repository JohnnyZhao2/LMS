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
import { FileText, GripVertical, Plus, Trash2, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getQuestionTypeLabel, getQuestionTypeStyle } from '@/features/questions/constants';
import { AnswerInput, OptionsInput } from '@/features/questions/components/question-form-inputs';
import type { QuestionType } from '@/types/api';
import type { InlineQuestionItem } from '../types';
import { CompactNumberInput } from './compact-number-input';

const QUESTION_TYPES: Array<{ value: QuestionType; label: string }> = [
  { value: 'SINGLE_CHOICE', label: '单选' },
  { value: 'MULTIPLE_CHOICE', label: '多选' },
  { value: 'TRUE_FALSE', label: '判断' },
  { value: 'SHORT_ANSWER', label: '简答' },
];

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
            <div className="space-y-1 text-center">
              <p className="text-[13px] font-medium text-foreground/60">暂无题目</p>
              <p className="text-[12px] text-text-muted">从右侧题库添加，或创建空白题目</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowAddMenu(true)} className="mt-1 gap-1.5 rounded-xl border-border bg-background px-4 text-[12px] font-medium">
              <Plus className="h-3.5 w-3.5" />
              新建题目
            </Button>
          </div>
        )}
      </div>

      {showAddMenu && (
        <div className="pointer-events-none absolute inset-x-0 bottom-8 z-20 flex flex-col items-center">
          <div className="pointer-events-auto mb-3 w-[184px] rounded-xl border border-border bg-background px-4 pt-4 pb-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
            <div className="mb-2 text-center text-[11px] font-semibold text-text-muted">选择题型</div>
            <div className="space-y-0.5">
              {[
                { value: 'SINGLE_CHOICE' as QuestionType, label: '单选题' },
                { value: 'MULTIPLE_CHOICE' as QuestionType, label: '多选题' },
                { value: 'TRUE_FALSE' as QuestionType, label: '判断题' },
                { value: 'SHORT_ANSWER' as QuestionType, label: '简答题' },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleCreateQuestion(type.value)}
                  className="flex h-11 w-full items-center justify-center rounded-xl px-3 text-[13px] font-semibold text-foreground transition-all hover:bg-muted"
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={() => setShowAddMenu(false)} className="pointer-events-auto h-11 rounded-xl bg-foreground px-6 text-[13px] font-semibold text-background shadow-[0_10px_22px_rgba(15,23,42,0.14)] hover:bg-foreground/92">
            <X className="mr-2 h-4 w-4" />
            取消添加
          </Button>
        </div>
      )}

      {!showAddMenu && items.length > 0 && (
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
  const style = getQuestionTypeStyle(item.questionType);
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
      onClick={onFocus}
      className={cn(
        'overflow-hidden rounded-xl border bg-background shadow-sm transition-all',
        isDragging && !isOverlay && 'opacity-0',
        isOverlay && 'pointer-events-none scale-[0.995] shadow-[0_18px_40px_rgba(15,23,42,0.18)]',
        isActive
          ? 'border-primary/40 ring-1 ring-primary/10 shadow-[0_10px_24px_rgba(59,130,246,0.08)]'
          : 'border-border hover:border-primary/20 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]',
      )}
    >
      <div className="flex items-center justify-between border-b border-border bg-transparent px-8 py-3.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={`拖动排序第${index + 1}题`}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-xl text-text-muted transition hover:bg-muted hover:text-foreground',
              isDragging || isOverlay ? 'cursor-grabbing' : 'cursor-grab active:cursor-grabbing',
            )}
            {...(isOverlay ? {} : attributes)}
            {...(isOverlay ? {} : listeners)}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          {item.questionId ? (
            <Badge variant="outline" className={cn('h-6 rounded-md border-transparent px-2.5 text-[10px] font-semibold', style.bg, style.color)}>
              {getQuestionTypeLabel(item.questionType)}
            </Badge>
          ) : (
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
                className="h-7 w-[78px] shrink-0 gap-1 rounded-md border-none bg-muted px-2.5 text-[11px] font-medium shadow-none [&>span]:text-left [&>svg]:border-l [&>svg]:border-foreground/20 [&>svg]:pl-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="w-[88px] min-w-[88px] rounded-xl border-border p-1">
                {QUESTION_TYPES.map(({ value, label }) => (
                  <SelectItem key={value} value={value} className="rounded-lg py-2 pl-3.5 pr-7 text-[12px] font-medium">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <span className="text-[11px] font-medium text-text-muted">第 {index + 1} 题</span>
        </div>

        <div className="flex items-center gap-2">
          <CompactNumberInput
            prefixLabel="分值"
            mode="decimal"
            value={item.score}
            onChange={(value) => onUpdate({ score: value })}
            min={0}
            max={100}
            step={0.5}
            inputWidthClassName="w-10"
            inputClassName="text-[11px] leading-none"
            className="h-7 gap-1.5 px-2 py-0"
          />
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:bg-destructive-50 hover:text-destructive-500" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-7 py-4">
          <div className="rounded-lg bg-muted/32 px-4 py-2.5">
            <textarea
              placeholder="输入题目描述..."
              value={item.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              rows={2}
              className="block min-h-[52px] w-full resize-none border-0 bg-transparent p-0 text-[15px] font-semibold leading-relaxed text-foreground outline-none placeholder:text-text-muted/35"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              {isChoiceType ? '选项' : '参考答案'}
            </Label>
            {isChoiceType ? (
              <OptionsInput
                questionType={item.questionType}
                value={item.options}
                onChange={(opts) => onUpdate({ options: opts })}
                answer={item.answer}
                onAnswerChange={(ans) => onUpdate({ answer: ans })}
              />
            ) : (
              <AnswerInput
                questionType={item.questionType}
                options={item.options}
                value={item.answer}
                onChange={(ans) => onUpdate({ answer: ans })}
              />
            )}
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              答案解析 <span className="normal-case font-normal text-text-muted/50">选填</span>
            </div>
            <Textarea
              placeholder="提供给学员的解析说明..."
              value={item.explanation}
              onChange={(e) => onUpdate({ explanation: e.target.value })}
              className="min-h-[56px] resize-none border-0 bg-transparent p-0 text-[13px] leading-relaxed shadow-none placeholder:text-text-muted/35 focus-visible:ring-0"
            />
          </div>
      </div>
    </div>
  );
};
