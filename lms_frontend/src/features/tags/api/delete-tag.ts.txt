import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterTagMutation } from '@/lib/cache-invalidation/tags';

export const deleteTag = (id: number) => apiClient.delete(`/tags/${id}/`);

export const useDeleteTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTag,
    onSuccess: () => invalidateAfterTagMutation(queryClient),
  });
};
