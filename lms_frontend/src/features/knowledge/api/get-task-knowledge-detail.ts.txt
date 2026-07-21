import { apiClient } from '@/lib/api-client';
import type { KnowledgeDetail } from '@/types/knowledge';

export const getTaskKnowledgeDetail = (taskKnowledgeId: number) =>
  apiClient.get<KnowledgeDetail>(`/knowledge/task/${taskKnowledgeId}/`);
