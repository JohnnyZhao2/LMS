import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterKnowledgeMutation } from '@/lib/cache-invalidation/knowledge';
import { queryKeys } from '@/lib/query-keys';
import type { KnowledgeDetail, KnowledgeUpdateRequest } from '@/types/knowledge';

export const updateKnowledge = ({ id, data }: { id: number; data: KnowledgeUpdateRequest }) =>
  apiClient.patch<KnowledgeDetail>(`/knowledge/${id}/`, data);

export const useUpdateKnowledge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateKnowledge,
    onSuccess: (updatedKnowledge) => {
      queryClient.setQueriesData<KnowledgeDetail>(
        { queryKey: queryKeys.knowledge.detailRoot() },
        (cachedKnowledge) => {
          if (!cachedKnowledge || cachedKnowledge.id !== updatedKnowledge.id) {
            return cachedKnowledge;
          }
          return { ...cachedKnowledge, ...updatedKnowledge };
        },
      );
      return invalidateAfterKnowledgeMutation(queryClient);
    },
  });
};
