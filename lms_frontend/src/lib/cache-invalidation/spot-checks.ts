import type { QueryClient } from '@tanstack/react-query';

import { invalidateMany } from '@/lib/cache-invalidation/shared';
import { queryKeys } from '@/lib/query-keys';

export const invalidateAfterSpotCheckMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.spotChecks.all(),
    queryKeys.spotChecks.detailRoot(),
    ['spot-checks-mine'],
    ['spot-checks-batch-peers'],
  ]);
