import type { QueryClient } from '@tanstack/react-query';

import { invalidateMany } from '@/lib/cache-invalidation/shared';
import { queryKeys } from '@/lib/query-keys';

export const invalidateAfterSubmissionAnswerSaved = (
  queryClient: QueryClient,
  submissionId: number,
) => invalidateMany(queryClient, [
  queryKeys.submissions.detail(submissionId),
]);

export const invalidateAfterSubmissionSubmitted = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.tasks.studentRoot(),
  ]);
