import type { QueryClient } from '@tanstack/react-query';

import { invalidateMany } from '@/lib/cache-invalidation/shared';
import { queryKeys } from '@/lib/query-keys';

export const invalidateAfterActivityLogDeletion = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.activityLogs.all(),
  ]);

export const invalidateAfterActivityLogPolicyMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.activityLogs.policies(),
  ]);
