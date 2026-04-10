import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

import { QuestionDocumentReadMode } from '@/features/questions/components/question-document-read-mode';
import { richTextToPlainText } from '@/lib/rich-text';
import { cn } from '@/lib/utils';
import type { Answer } from '@/types/submission';

const hasValueProp = (data: unknown): data is { value?: unknown } =>
  typeof data === 'object' && data !== null && 'value' in data;

interface QuestionCardProps {
  answer: Answer;
  userAnswer?: unknown;
  onAnswerChange: (value: unknown) => void;
  disabled?: boolean;
  showResult?: boolean;
  questionNumber?: number;
}

const normalizeChoiceOptions = (questionOptions?: Answer['question_options']) => {
  if (!questionOptions) {
    return [];
  }

  if (Array.isArray(questionOptions)) {
    return questionOptions
      .filter((item): item is { key?: string; value?: string } => Boolean(item))
      .map((item, index) => ({
        key: item.key ?? String.fromCharCode(65 + index),
        value: item.value ?? '',
      }));
  }

  return Object.entries(questionOptions).map(([key, value]) => ({
    key,
    value: typeof value === 'string' ? value : String(value ?? ''),
  }));
};

const normalizeStringValue = (value: unknown): string => {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && value.length > 0) {
    return String(value[0] ?? '');
  }
  if (hasValueProp(value) && typeof value.value === 'string') {
    return value.value;
  }
  return '';
};

const normalizeMultipleValue = (value: unknown): string[] => {
  if (value == null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (hasValueProp(value) && Array.isArray(value.value)) {
    return value.value.map((item) => String(item));
  }
  if (typeof value === 'string' && value) {
    return [value];
  }
  return [];
};

export const QuestionCard: React.FC<QuestionCardProps> = ({
  answer,
  userAnswer,
  onAnswerChange,
  disabled = false,
  showResult = false,
  questionNumber,
}) => {
  const options = normalizeChoiceOptions(answer.question_options);
  const normalizedResponse =
    answer.question_type === 'MULTIPLE_CHOICE'
      ? normalizeMultipleValue(userAnswer)
      : normalizeStringValue(userAnswer);

  return (
    <div className="space-y-5">
      <QuestionDocumentReadMode
        mode="answer"
        score={answer.question_score ?? '0'}
        questionNumber={questionNumber}
        questionType={answer.question_type}
        content={answer.question_content}
        options={options}
        answer=""
        response={normalizedResponse as string | string[]}
        explanation=""
        showExplanation={false}
        disabled={disabled}
        onResponseChange={onAnswerChange}
      />

      {showResult ? (
        <div
          className={cn(
            'rounded-xl border p-4',
            answer.is_correct
              ? 'border-secondary-300 bg-secondary-50'
              : 'border-destructive-300 bg-destructive-50',
          )}
        >
          <div className="mb-2 flex items-center gap-2">
            {answer.is_correct ? (
              <CheckCircle className="h-4.5 w-4.5 text-secondary-500" />
            ) : (
              <XCircle className="h-4.5 w-4.5 text-destructive-500" />
            )}
            <span
              className={cn(
                'font-semibold',
                answer.is_correct ? 'text-secondary-600' : 'text-destructive-600',
              )}
            >
              {answer.is_correct ? '回答正确' : '回答错误'}
            </span>
            <span className="ml-auto text-text-muted">
              得分: {answer.obtained_score || 0}/{answer.question_score ?? '--'}
            </span>
          </div>
          {answer.explanation ? (
            <div className="whitespace-pre-wrap break-words text-text-muted">
              {'解析：'}
              {richTextToPlainText(answer.explanation)}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
