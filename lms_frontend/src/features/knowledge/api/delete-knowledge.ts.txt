import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterKnowledgeMutation } from '@/lib/cache-invalidation/knowledge';

export const deleteKnowledge = (id: number) => apiClient.delete(`/knowledge/${id}/`);

export const useDeleteKnowledge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteKnowledge,
    onSuccess: () => invalidateAfterKnowledgeMutation(queryClient),
  });
};
