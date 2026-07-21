import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { TagMutationPayload } from '@/types/tag-api';
import { apiClient } from '@/lib/api-client';
import { invalidateAfterTagMutation } from '@/lib/cache-invalidation/tags';
import type { Tag } from '@/types/common';

export const updateTag = ({ id, data }: { id: number; data: Partial<TagMutationPayload> }) =>
  apiClient.patch<Tag>(`/tags/${id}/`, data);

export const useUpdateTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTag,
    onSuccess: () => invalidateAfterTagMutation(queryClient),
  });
};
