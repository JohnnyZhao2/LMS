/**
 * 题目表单输入组件 — 选项输入 + 答案输入
 */
import * as React from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { QuestionType } from '@/types/api';
import { SortableOptionItem } from './sortable-option-item';

/* ─────────────────────────────────────────────
   选项输入组件
   ───────────────────────────────────────────── */
interface OptionsInputProps {
  questionType: QuestionType;
  value: Array<{ key: string; value: string }>;
  onChange: (value: Array<{ key: string; value: string }>) => void;
  answer: string | string[];
  onAnswerChange: (answer: string | string[]) => void;
  disabled?: boolean;
}

const buildOptionKey = (index: number) => String.fromCharCode(65 + index);
let optionIdCounter = 0;
const nextOptionId = () => `option_${++optionIdCounter}`;

const reindexOptionsAndAnswer = (
  options: Array<{ key: string; value: string }>,
  answer: string | string[],
  questionType: QuestionType,
) => {
  const keyMap = new Map(options.map((option, index) => [option.key, buildOptionKey(index)]));
  const nextOptions = options.map((option, index) => ({
    ...option,
    key: buildOptionKey(index),
  }));

  if (questionType === 'MULTIPLE_CHOICE') {
    const selected = Array.isArray(answer) ? answer : [];
    const nextAnswer = selected
      .map((item) => keyMap.get(item))
      .filter((item): item is string => Boolean(item))
      .sort();
    return { nextOptions, nextAnswer };
  }

  const current = typeof answer === 'string' ? answer : '';
  return {
    nextOptions,
    nextAnswer: current ? (keyMap.get(current) ?? '') : '',
  };
};

export const OptionsInput: React.FC<OptionsInputProps> = ({
  questionType,
  value = [],
  onChange,
  answer,
  onAnswerChange,
  disabled = false,
}) => {
  const [optionIds, setOptionIds] = React.useState<string[]>(() => value.map(() => nextOptionId()));

  React.useEffect(() => {
    setOptionIds((current) => {
      if (current.length === value.length) {
        return current;
      }
      if (current.length < value.length) {
        return [
          ...current,
          ...Array.from({ length: value.length - current.length }, () => nextOptionId()),
        ];
      }
      return current.slice(0, value.length);
    });
  }, [value.length]);

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

  const handleAdd = () => {
    if (disabled) return;
    const nextKey = buildOptionKey(value.length);
    onChange([...value, { key: nextKey, value: '' }]);
    setOptionIds((current) => [...current, nextOptionId()]);
  };

  const handleChange = (index: number, val: string) => {
    if (disabled) return;
    const next = [...value];
    next[index] = { ...next[index], value: val };
    onChange(next);
  };

  const handleRemove = (index: number) => {
    if (disabled) return;
    const remaining = value.filter((_, i) => i !== index);
    const { nextOptions, nextAnswer } = reindexOptionsAndAnswer(remaining, answer, questionType);
    setOptionIds((current) => current.filter((_, i) => i !== index));
    onChange(nextOptions);
    onAnswerChange(nextAnswer);
  };

  const handleToggleAnswer = (key: string) => {
    if (disabled) return;
    if (questionType === 'SINGLE_CHOICE') {
      onAnswerChange(key);
    } else {
      const selected = Array.isArray(answer) ? answer : [];
      onAnswerChange(
        selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key],
      );
    }
  };

  const isSelected = (key: string) =>
    Array.isArray(answer) ? answer.includes(key) : answer === key;

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (disabled || !over || active.id === over.id) return;

    const oldIndex = optionIds.findIndex((id) => id === active.id);
    const newIndex = optionIds.findIndex((id) => id === over.id);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

    const reordered = arrayMove(value, oldIndex, newIndex);
    const { nextOptions, nextAnswer } = reindexOptionsAndAnswer(reordered, answer, questionType);
    setOptionIds((current) => arrayMove(current, oldIndex, newIndex));
    onChange(nextOptions);
    onAnswerChange(nextAnswer);
  };

  return (
    <div className="space-y-1.5">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={optionIds} strategy={verticalListSortingStrategy}>
          {value.map((opt, index) => (
            <SortableOptionItem
              key={optionIds[index]}
              id={optionIds[index]}
              optionKey={opt.key}
              optionValue={opt.value}
              selected={isSelected(opt.key)}
              disabled={disabled}
              canRemove={value.length > 2}
              onToggleAnswer={() => handleToggleAnswer(opt.key)}
              onChange={(nextValue) => handleChange(index, nextValue)}
              onRemove={() => handleRemove(index)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {!disabled && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleAdd}
          className={cn(
            'h-8 w-fit px-1 text-[12px] font-medium text-primary-600 hover:bg-transparent hover:text-primary-700',
          )}
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   答案输入组件（判断题 / 简答题）
   ───────────────────────────────────────────── */
interface AnswerInputProps {
  questionType: QuestionType;
  options: Array<{ key: string; value: string }>;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  disabled?: boolean;
}

export const AnswerInput: React.FC<AnswerInputProps> = ({
  questionType,
  value,
  onChange,
  disabled = false,
}) => {
  if (questionType === 'TRUE_FALSE') {
    const current = value as string;
    return (
      <div className="flex gap-2">
        {[
          { val: 'TRUE', label: '✓ 正确' },
          { val: 'FALSE', label: '✗ 错误' },
        ].map(({ val, label }) => (
          <button
            key={val}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(val)}
            className={cn(
              'flex-1 h-9 rounded-lg border text-[13px] font-medium transition-all duration-150',
              disabled ? 'cursor-default' : 'cursor-pointer',
              current === val
                ? val === 'TRUE'
                  ? 'border-primary-200 bg-primary-50 text-primary-700'
                  : 'border-destructive/30 bg-destructive/5 text-destructive/80'
                : 'border-border bg-background text-text-muted hover:border-border/80 hover:bg-muted/20',
            )}
          >
            {label}
          </button>
        ))}
      </div>
    );
  }

  if (questionType === 'SHORT_ANSWER') {
    return (
      <Textarea
        value={value as string}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
          if (!disabled) onChange(e.target.value);
        }}
        placeholder="输入参考答案..."
        readOnly={disabled}
        rows={3}
        className="resize-none text-[13px]"
      />
    );
  }

  return null;
};
