/**
 * Quiz Query Keys
 * React Query keys for quiz data caching
 * @module features/test-center/api/quizzes/keys
 */

import type { QuizListParams } from './types';

/**
 * Query keys for quizzes
 */
export const quizKeys = {
  all: ['quizzes'] as const,
  lists: () => [...quizKeys.all, 'list'] as const,
  list: (params: QuizListParams) => [...quizKeys.lists(), params] as const,
  details: () => [...quizKeys.all, 'detail'] as const,
  detail: (id: number) => [...quizKeys.details(), id] as const,
};
