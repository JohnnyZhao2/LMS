import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * 并行失效多组 query key。
 */
export const invalidateMany = (
  queryClient: QueryClient,
  keys: readonly QueryKey[],
) => Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
