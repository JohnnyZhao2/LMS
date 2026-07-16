import type { QueryClient } from '@tanstack/react-query';

import { invalidateMany } from '@/lib/cache-invalidation/shared';
import { queryKeys } from '@/lib/query-keys';

export const invalidateAfterQuizMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.quizzes.all(),
    queryKeys.quizzes.detailRoot(),
    queryKeys.tasks.resourceOptionsRoot(),
  ]);
