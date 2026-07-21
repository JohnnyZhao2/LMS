import type { QueryClient } from '@tanstack/react-query';

import { invalidateMany } from '@/lib/cache-invalidation/shared';
import { queryKeys } from '@/lib/query-keys';

export const invalidateAfterKnowledgeMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.knowledge.listRoot(),
    queryKeys.knowledge.detailRoot(),
    queryKeys.tasks.resourceOptionsRoot(),
  ]);

export const invalidateAfterKnowledgeViewMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.knowledge.listRoot(),
  ]);
