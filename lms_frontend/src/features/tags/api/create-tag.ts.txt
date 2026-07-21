import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { TagMutationPayload } from '@/types/tag-api';
import { apiClient } from '@/lib/api-client';
import { invalidateAfterTagMutation } from '@/lib/cache-invalidation/tags';
import type { Tag } from '@/types/common';

export const createTag = (data: TagMutationPayload) => apiClient.post<Tag>('/tags/', data);

export const useCreateTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTag,
    onSuccess: () => invalidateAfterTagMutation(queryClient),
  });
};
