import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ReorderSpaceTagsPayload } from '@/types/tag-api';
import { apiClient } from '@/lib/api-client';
import { invalidateAfterTagMutation } from '@/lib/cache-invalidation/tags';

export const reorderSpaceTags = (data: ReorderSpaceTagsPayload) =>
  apiClient.post('/tags/reorder/', data);

export const useReorderSpaceTags = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reorderSpaceTags,
    onSuccess: () => invalidateAfterTagMutation(queryClient),
  });
};
