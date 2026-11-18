import React from 'react';

import { Textarea } from '@/components/ui/textarea';
import { ensureChoiceOptions } from '@/config/questions';
import { cn } from '@/lib/utils';
import type { QuestionType } from '@/types/common';

import {
  QuestionChoiceRow,
} from './question-document-shared';
import type { QuestionChoiceOption } from './question-document-types';
import {
  QUESTION_TRUE_FALSE_ITEMS,
  normalizeQuestionValueToArray,
} from './question-document-utils';
import { AnswerInput, OptionsInput } from './question-form-inputs';

interface QuestionDocumentAnswerEditorProps {
  questionType: QuestionType;
  options: QuestionChoiceOption[];
  answer: string | string[];
  readOnly?: boolean;
  onOptionsChange?: (value: QuestionChoiceOption[]) => void;
  onAnswerChange?: (value: string | string[]) => void;
}

export const QuestionDocumentAnswerEditor: React.FC<QuestionDocumentAnswerEditorProps> = ({
  questionType,
  options,
  answer,
  readOnly = false,
  onOptionsChange,
  onAnswerChange,
}) => {
  const choiceOptions = ensureChoiceOptions(options);
  const isChoiceType = questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE';

  if (isChoiceType) {
    return (
      <OptionsInput
        questionType={questionType}
        value={choiceOptions}
        onChange={(value) => onOptionsChange?.(value)}
        answer={answer}
        onAnswerChange={(value) => onAnswerChange?.(value)}
        disabled={readOnly}
      />
    );
  }

  return (
    <AnswerInput
      questionType={questionType}
      value={answer}
      onChange={(value) => onAnswerChange?.(value)}
      disabled={readOnly}
    />
  );
};

const SHORT_ANSWER_FIELD_CLASSNAME = 'h-56 min-h-0 resize-none overflow-y-auto scrollbar-subtle rounded-[14px] border-border bg-background px-4 py-3 text-[15px] leading-7';

export const ShortAnswerTextarea: React.FC<{
  value: string;
  readOnly?: boolean;
  placeholder?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
}> = ({
  value,
  readOnly = false,
  placeholder,
  onChange,
  onBlur,
}) => (
  <Textarea
    readOnly={readOnly}
    value={value}
    onChange={onChange ? (event) => onChange(event.target.value) : undefined}
    onBlur={onBlur}
    rows={8}
    placeholder={placeholder}
    className={SHORT_ANSWER_FIELD_CLASSNAME}
  />
);

interface QuestionDocumentResponsePanelProps {
  questionType: QuestionType;
  options: QuestionChoiceOption[];
  answer: string | string[];
  response?: string | string[];
  disabled?: boolean;
  interactive?: boolean;
  onResponseChange?: (value: string | string[]) => void;
  onResponseBlur?: () => void;
}

export const QuestionDocumentResponsePanel: React.FC<QuestionDocumentResponsePanelProps> = ({
  questionType,
  options,
  answer,
  response,
  disabled = false,
  interactive = false,
  onResponseChange,
  onResponseBlur,
}) => {
  const activeValues = interactive
    ? normalizeQuestionValueToArray(response, questionType)
    : normalizeQuestionValueToArray(answer, questionType);

  const handleResponseToggle = (key: string) => {
    if (!interactive || disabled || !onResponseChange) {
      return;
    }

    if (questionType === 'MULTIPLE_CHOICE') {
      onResponseChange(
        activeValues.includes(key)
          ? activeValues.filter((item) => item !== key)
          : [...activeValues, key],
      );
      return;
    }

    onResponseChange(key);
  };

  if (questionType === 'SHORT_ANSWER') {
    const responseText = typeof response === 'string' ? response : '';
    const editing = interactive && !disabled;
    const value = editing
      ? responseText
      : (interactive ? responseText : String(answer || '')).replace(/\r\n/g, '\n').trim();

    return (
      <ShortAnswerTextarea
        value={value}
        readOnly={!editing}
        placeholder={editing ? '请填写答案' : (value ? undefined : (interactive ? '未作答' : '暂无参考答案'))}
        onChange={editing ? (next) => onResponseChange?.(next) : undefined}
        onBlur={editing ? onResponseBlur : undefined}
      />
    );
  }

  if (questionType === 'TRUE_FALSE') {
    return (
      <div className="space-y-3">
        {QUESTION_TRUE_FALSE_ITEMS.map((item) => {
          const selected = activeValues.includes(item.key);
          const Comp = interactive ? 'button' : 'div';
          const actionProps = interactive
            ? {
              type: 'button' as const,
              onClick: () => onResponseChange?.(item.key),
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
      {options.map((option) => (
        <QuestionChoiceRow
          key={option.key}
          optionKey={option.key}
          label={option.value}
          selected={activeValues.includes(option.key)}
          indicatorShape={questionType === 'MULTIPLE_CHOICE' ? 'square' : 'circle'}
          interactive={interactive}
          disabled={disabled}
          onClick={() => handleResponseToggle(option.key)}
        />
      ))}
    </div>
  );
};
