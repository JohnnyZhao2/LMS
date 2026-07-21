import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterKnowledgeMutation } from '@/lib/cache-invalidation/knowledge';
import type { KnowledgeCreateRequest, KnowledgeDetail } from '@/types/knowledge';

export const createKnowledge = (data: KnowledgeCreateRequest) =>
  apiClient.post<KnowledgeDetail>('/knowledge/', data);

export const useCreateKnowledge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createKnowledge,
    onSuccess: () => invalidateAfterKnowledgeMutation(queryClient),
  });
};
