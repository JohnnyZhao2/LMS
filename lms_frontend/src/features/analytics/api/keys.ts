/**
 * Personal Query Keys
 * React Query keys for personal center data caching
 * @module features/analytics/api/keys
 */

import type { ScoreHistoryParams, WrongAnswersParams } from './types';

/**
 * Query keys for personal center
 */
export const personalKeys = {
  all: ['personal'] as const,
  profile: () => [...personalKeys.all, 'profile'] as const,
  scores: (params?: ScoreHistoryParams) => [...personalKeys.all, 'scores', params] as const,
  wrongAnswers: (params?: WrongAnswersParams) => [...personalKeys.all, 'wrongAnswers', params] as const,
};
