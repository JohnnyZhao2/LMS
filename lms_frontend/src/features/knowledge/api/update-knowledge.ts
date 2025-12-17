/**
 * Update Knowledge API
 * Updates an existing knowledge document
 * @module features/knowledge/api/update-knowledge
 * Requirements: 17.6
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Knowledge } from '@/types/domain';
import type { KnowledgeUpdateRequest } from './types';
import { knowledgeKeys } from './keys';

/**
 * Update an existing knowledge document
 * Requirements: 17.6
 * @param id - Knowledge document ID
 * @param data - Knowledge update data
 * @returns Updated knowledge document
 */
export async function updateKnowledge(
  id: number | string, 
  data: KnowledgeUpdateRequest
): Promise<Knowledge> {
  return api.patch<Knowledge>(API_ENDPOINTS.knowledge.detail(id), data);
}

/**
 * Hook to update knowledge
 * Requirements: 17.6
 */
export function useUpdateKnowledge() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: KnowledgeUpdateRequest }) => 
      updateKnowledge(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.detail(variables.id) });
    },
  });
}
