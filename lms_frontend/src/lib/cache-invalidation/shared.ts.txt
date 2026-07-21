import type { QueryClient, QueryKey } from '@tanstack/react-query';

export const invalidateMany = (
  queryClient: QueryClient,
  keys: readonly QueryKey[],
) => Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
