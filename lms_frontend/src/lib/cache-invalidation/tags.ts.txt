import type { QueryClient } from '@tanstack/react-query';

import { invalidateMany } from '@/lib/cache-invalidation/shared';
import { queryKeys } from '@/lib/query-keys';

export const invalidateAfterTagMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.tags.all(),
    queryKeys.questions.all(),
    queryKeys.questions.detailRoot(),
    queryKeys.knowledge.listRoot(),
    queryKeys.knowledge.detailRoot(),
    queryKeys.tasks.resourceOptionsRoot(),
  ]);
