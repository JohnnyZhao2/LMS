import type { QueryClient } from '@tanstack/react-query';

import { invalidateMany } from '@/lib/cache-invalidation/shared';
import { queryKeys } from '@/lib/query-keys';

export const invalidateAfterTaskMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.tasks.all(),
    queryKeys.tasks.detailRoot(),
    queryKeys.tasks.studentRoot(),
    queryKeys.tasks.studentLearningDetailRoot(),
  ]);

export const invalidateAfterTaskProgressMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.tasks.studentRoot(),
    queryKeys.tasks.detailRoot(),
    queryKeys.tasks.studentLearningDetailRoot(),
  ]);
