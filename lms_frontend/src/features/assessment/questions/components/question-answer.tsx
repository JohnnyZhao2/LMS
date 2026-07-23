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
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ensureChoiceOptions } from '@/features/assessment/questions/config';
import {
  QuestionChoiceRow,
} from '@/features/assessment/questions/components/question-document-shared';
import { SortableOptionItem } from '@/features/assessment/questions/components/sortable-option-item';
import type { QuestionChoiceOption } from '@/features/assessment/questions/types';
import {
  QUESTION_TRUE_FALSE_ITEMS,
  normalizeQuestionValueToArray,
} from '@/features/assessment/questions/editor-utils';
import { cn } from '@/lib/utils';
import type { QuestionType } from '@/types/common';

export type QuestionAnswerMode = 'edit' | 'read' | 'response';

interface QuestionAnswerProps {
  mode: QuestionAnswerMode;
  questionType: QuestionType;
  options?: QuestionChoiceOption[];
  answer?: string | string[];
  response?: string | string[];
  disabled?: boolean;
  optionLabelRenderer?: (option: QuestionChoiceOption, index: number) => React.ReactNode;
  onOptionsChange?: (value: QuestionChoiceOption[]) => void;
  onAnswerChange?: (value: string | string[]) => void;
  onResponseChange?: (value: string | string[]) => void;
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

const isChoiceType = (questionType: QuestionType) =>
  questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE';

/**
 * 编辑态选择题：可拖拽排序、增删选项，并标记正确答案。
 */
const ChoiceOptionsEditor: React.FC<{
  questionType: QuestionType;
  value: Array<{ key: string; value: string }>;
  answer: string | string[];
  disabled?: boolean;
  onChange: (value: Array<{ key: string; value: string }>) => void;
  onAnswerChange: (answer: string | string[]) => void;
}> = ({
  questionType,
  value,
  answer,
  disabled = false,
  onChange,
  onAnswerChange,
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
      return;
    }
    const selected = Array.isArray(answer) ? answer : [];
    onAnswerChange(
      selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key],
    );
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
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={optionIds} strategy={verticalListSortingStrategy}>
          {value.map((opt, index) => (
            <SortableOptionItem
              key={optionIds[index]}
              id={optionIds[index]}
              questionType={questionType}
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

      {!disabled ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleAdd}
          className="mt-1 flex h-5 w-[14px] items-center justify-center p-0 text-[12px] font-medium text-primary-600 hover:bg-transparent hover:text-primary-700"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
};

/**
 * 统一答案区：编辑正确答案 / 只读预览 / 用户作答。
 */
export const QuestionAnswer: React.FC<QuestionAnswerProps> = ({
  mode,
  questionType,
  options = [],
  answer = '',
  response,
  disabled = false,
  optionLabelRenderer,
  onOptionsChange,
  onAnswerChange,
  onResponseChange,
}) => {
  const interactive = mode === 'response';
  const selectedValues = interactive
    ? normalizeQuestionValueToArray(response, questionType)
    : normalizeQuestionValueToArray(answer, questionType);

  const handleResponseSelect = (key: string) => {
    if (!interactive || disabled || !onResponseChange) return;

    if (questionType === 'MULTIPLE_CHOICE') {
      onResponseChange(
        selectedValues.includes(key)
          ? selectedValues.filter((item) => item !== key)
          : [...selectedValues, key],
      );
      return;
    }

    onResponseChange(key);
  };

  if (mode === 'edit') {
    if (isChoiceType(questionType)) {
      return (
        <ChoiceOptionsEditor
          questionType={questionType}
          value={ensureChoiceOptions(options)}
          answer={answer}
          disabled={disabled}
          onChange={(value) => onOptionsChange?.(value)}
          onAnswerChange={(value) => onAnswerChange?.(value)}
        />
      );
    }

    if (questionType === 'TRUE_FALSE') {
      const current = typeof answer === 'string' ? answer : '';
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
              onClick={() => !disabled && onAnswerChange?.(val)}
              className={cn(
                'h-9 flex-1 rounded-lg border text-[13px] font-medium transition-all duration-150',
                disabled ? 'cursor-default' : 'cursor-pointer',
                current === val
                  ? val === 'TRUE'
                    ? 'border-primary-200 bg-primary-50 text-primary-700'
                    : 'border-destructive/30 bg-destructive/5 text-destructive/80'
                  : 'border-border bg-background text-text-muted hover:border-primary-200 hover:bg-primary-50/40',
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
          value={typeof answer === 'string' ? answer : ''}
          onChange={(event) => {
            if (!disabled) onAnswerChange?.(event.target.value);
          }}
          readOnly={disabled}
          rows={3}
          className="resize-none text-[13px]"
        />
      );
    }

    return null;
  }

  if (questionType === 'SHORT_ANSWER') {
    if (interactive) {
      return (
        <Textarea
          value={typeof response === 'string' ? response : ''}
          onChange={(event) => onResponseChange?.(event.target.value)}
          rows={8}
          placeholder="请填写答案"
          disabled={disabled}
          className="min-h-[190px] resize-none rounded-[14px] border-border bg-background px-4 py-3 text-[14px] leading-6"
        />
      );
    }

    return (
      <div className="min-h-[190px] rounded-[14px] border border-border bg-background px-4 py-3 text-[14px] leading-6 text-foreground">
        {String(answer || '').trim() || '暂无参考答案'}
      </div>
    );
  }

  if (questionType === 'TRUE_FALSE') {
    return (
      <div className="space-y-3">
        {QUESTION_TRUE_FALSE_ITEMS.map((item) => {
          const selected = selectedValues.includes(item.key);
          const Comp = interactive ? 'button' : 'div';
          const actionProps = interactive
            ? {
              type: 'button' as const,
              onClick: () => handleResponseSelect(item.key),
            }
            : {};

          return (
            <Comp
              key={item.key}
              {...actionProps}
              className={cn(
                'flex min-h-[42px] w-full items-center rounded-xl border px-4 py-2.5 text-[14px] font-medium transition-colors',
                selected
                  ? 'border-primary-300 bg-primary-50 text-primary-700'
                  : 'border-border bg-background text-foreground',
                interactive && !disabled && 'cursor-pointer hover:border-primary-200 hover:bg-primary-50/35',
                disabled && 'cursor-default opacity-75',
              )}
            >
              {item.label}
            </Comp>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {options.map((option, index) => (
        <QuestionChoiceRow
          key={option.key}
          optionKey={option.key}
          label={optionLabelRenderer ? optionLabelRenderer(option, index) : option.value}
          selected={selectedValues.includes(option.key)}
          indicatorShape={questionType === 'MULTIPLE_CHOICE' ? 'square' : 'circle'}
          interactive={interactive}
          disabled={disabled}
          onClick={() => handleResponseSelect(option.key)}
        />
      ))}
    </div>
  );
};
