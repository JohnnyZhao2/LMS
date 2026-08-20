import type { QuestionType } from '@/types/common';

export const QUESTION_TRUE_FALSE_ITEMS = [
  { key: 'TRUE', label: '正确' },
  { key: 'FALSE', label: '错误' },
] as const;

export const normalizeQuestionValueToArray = (
  value: string | string[] | undefined,
  questionType: QuestionType,
): string[] => {
  if (questionType === 'MULTIPLE_CHOICE') {
    return Array.isArray(value) ? value : typeof value === 'string' && value ? [value] : [];
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return value ? [value] : [];
};
