import type { QueryClient } from '@tanstack/react-query';

import { invalidateMany } from '@/lib/cache-invalidation/shared';
import { queryKeys } from '@/lib/query-keys';

export const invalidateAfterGradingMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.grading.answersRoot(),
    queryKeys.grading.questionsRoot(),
    queryKeys.grading.pendingRoot(),
    queryKeys.grading.taskAnalyticsRoot(),
    queryKeys.grading.studentExecutionsRoot(),
  ]);
