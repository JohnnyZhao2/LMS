/**
 * Spot Check Query Keys
 * React Query keys for spot check data caching
 * @module features/spot-checks/api/keys
 */

import type { SpotCheckFilterParams } from './types';

/**
 * Query keys for spot checks
 */
export const spotCheckKeys = {
  all: ['spotChecks'] as const,
  lists: () => [...spotCheckKeys.all, 'list'] as const,
  list: (params?: SpotCheckFilterParams) => [...spotCheckKeys.lists(), params] as const,
  details: () => [...spotCheckKeys.all, 'detail'] as const,
  detail: (id: number | string) => [...spotCheckKeys.details(), id] as const,
};
