import type { QueryClient } from '@tanstack/react-query';

import { invalidateMany } from '@/lib/cache-invalidation/shared';
import { queryKeys } from '@/lib/query-keys';

export const invalidateAfterQuestionMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.questions.all(),
    queryKeys.questions.detailRoot(),
  ]);
