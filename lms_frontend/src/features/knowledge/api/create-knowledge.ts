/**
 * Create Knowledge API
 * Creates a new knowledge document
 * @module features/knowledge/api/create-knowledge
 * Requirements: 17.2, 17.3, 17.4, 17.5
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Knowledge } from '@/types/domain';
import type { KnowledgeCreateRequest } from './types';
import { knowledgeKeys } from './keys';

/**
 * Create a new knowledge document
 * Requirements: 17.2, 17.3, 17.4, 17.5
 * @param data - Knowledge creation data
 * @returns Created knowledge document
 */
export async function createKnowledge(data: KnowledgeCreateRequest): Promise<Knowledge> {
  return api.post<Knowledge>(API_ENDPOINTS.knowledge.list, data);
}

/**
 * Hook to create knowledge
 * Requirements: 17.2, 17.3, 17.4, 17.5
 */
export function useCreateKnowledge() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createKnowledge,
    onSuccess: () => {
      // Invalidate both admin and student knowledge lists
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.lists() });
    },
  });
}
