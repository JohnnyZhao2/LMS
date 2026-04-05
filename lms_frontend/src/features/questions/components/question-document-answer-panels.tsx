import React from 'react';

import { Textarea } from '@/components/ui/textarea';
import { ensureChoiceOptions } from '@/features/questions/constants';
import { cn } from '@/lib/utils';
import type { QuestionType } from '@/types/api';

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
      options={choiceOptions}
      value={answer}
      onChange={(value) => onAnswerChange?.(value)}
      disabled={readOnly}
    />
  );
};

interface QuestionDocumentResponsePanelProps {
  questionType: QuestionType;
  options: QuestionChoiceOption[];
  answer: string | string[];
  response?: string | string[];
  disabled?: boolean;
  interactive?: boolean;
  onResponseChange?: (value: string | string[]) => void;
}

export const QuestionDocumentResponsePanel: React.FC<QuestionDocumentResponsePanelProps> = ({
  questionType,
  options,
  answer,
  response,
  disabled = false,
  interactive = false,
  onResponseChange,
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
          interactive={interactive}
          disabled={disabled}
          onClick={() => handleResponseToggle(option.key)}
        />
      ))}
    </div>
  );
};
