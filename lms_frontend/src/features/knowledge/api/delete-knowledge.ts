/**
 * Delete Knowledge API
 * Deletes a knowledge document
 * @module features/knowledge/api/delete-knowledge
 * Requirements: 17.7
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import { knowledgeKeys } from './keys';

/**
 * Delete a knowledge document
 * Requirements: 17.7
 * @param id - Knowledge document ID
 */
export async function deleteKnowledge(id: number | string): Promise<void> {
  return api.delete(API_ENDPOINTS.knowledge.detail(id));
}

/**
 * Hook to delete knowledge
 * Requirements: 17.7
 */
export function useDeleteKnowledge() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteKnowledge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.lists() });
    },
  });
}
