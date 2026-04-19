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

export const buildQuestionSectionsInDisplayOrder = <T>(
  items: T[],
  getQuestionType: (item: T) => QuestionType,
): QuestionSection<T>[] => {
  const sections: QuestionSection<T>[] = [];

  items.forEach((item, originalIndex) => {
    const type = getQuestionType(item);
    const lastSection = sections[sections.length - 1];
    const entry = {
      item,
      originalIndex,
      number: originalIndex + 1,
    };

    if (lastSection && lastSection.type === type) {
      lastSection.entries.push(entry);
      return;
    }

    sections.push({
      type,
      label: QUESTION_TYPE_CONFIG[type].fullLabel,
      entries: [entry],
    });
  });

  return sections;
};
