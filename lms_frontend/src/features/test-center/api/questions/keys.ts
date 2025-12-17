/**
 * Question Query Keys
 * React Query keys for question data caching
 * @module features/test-center/api/questions/keys
 */

import type { QuestionListParams } from './types';

/**
 * Query keys for questions
 */
export const questionKeys = {
  all: ['questions'] as const,
  lists: () => [...questionKeys.all, 'list'] as const,
  list: (params: QuestionListParams) => [...questionKeys.lists(), params] as const,
  details: () => [...questionKeys.all, 'detail'] as const,
  detail: (id: number) => [...questionKeys.details(), id] as const,
};
