/**
 * Grading Query Keys
 * React Query keys for grading data caching
 * @module features/grading/api/keys
 */

import type { GradingFilterParams } from './types';

/**
 * Query keys for grading
 */
export const gradingKeys = {
  all: ['grading'] as const,
  pending: (params?: GradingFilterParams) => [...gradingKeys.all, 'pending', params] as const,
  detail: (id: number | string) => [...gradingKeys.all, 'detail', id] as const,
};
