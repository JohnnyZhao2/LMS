import type { QuestionType } from '@/types/common';

import { QUESTION_TYPE_CONFIG } from './constants';

export const QUESTION_SECTION_ORDER: QuestionType[] = [
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'SHORT_ANSWER',
];

export interface QuestionSectionEntry<T> {
  item: T;
  number: number;
  originalIndex: number;
}

export interface QuestionSection<T> {
  type: QuestionType;
  label: string;
  entries: QuestionSectionEntry<T>[];
}

export const buildQuestionSections = <T>(
  items: T[],
  getQuestionType: (item: T) => QuestionType,
): QuestionSection<T>[] => {
  let runningNumber = 1;

  return QUESTION_SECTION_ORDER
    .map((type) => {
      const entries = items
        .map((item, originalIndex) => ({ item, originalIndex }))
        .filter(({ item }) => getQuestionType(item) === type)
        .map(({ item, originalIndex }) => ({
          item,
          originalIndex,
          number: runningNumber++,
        }));

      return entries.length > 0
        ? {
          type,
          label: QUESTION_TYPE_CONFIG[type].fullLabel,
          entries,
        }
        : null;
    })
    .filter((section): section is QuestionSection<T> => section !== null);
};
