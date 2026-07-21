import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { MergeTagPayload } from '@/types/tag-api';
import { apiClient } from '@/lib/api-client';
import { invalidateAfterTagMutation } from '@/lib/cache-invalidation/tags';
import type { Tag } from '@/types/common';

export const mergeTags = (data: MergeTagPayload) => apiClient.post<Tag>('/tags/merge/', data);

export const useMergeTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mergeTags,
    onSuccess: () => invalidateAfterTagMutation(queryClient),
  });
};
