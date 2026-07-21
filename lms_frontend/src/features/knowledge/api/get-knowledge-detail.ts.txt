import { apiClient } from '@/lib/api-client';
import type { KnowledgeDetail } from '@/types/knowledge';

export const getKnowledgeDetail = (knowledgeId: number) =>
  apiClient.get<KnowledgeDetail>(`/knowledge/${knowledgeId}/`);
