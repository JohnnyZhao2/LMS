import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { KnowledgeCategory } from '@/types/api';

/**
 * 获取一级分类列表
 */
export const usePrimaryCategories = () => {
  return useQuery({
    queryKey: ['knowledge-categories', 'primary'],
    queryFn: () => apiClient.get<KnowledgeCategory[]>('/analytics/knowledge-center/categories/'),
  });
};

/**
 * 获取二级分类列表
 */
export const useSecondaryCategories = (primaryId: number) => {
  return useQuery({
    queryKey: ['knowledge-categories', 'secondary', primaryId],
    queryFn: () => apiClient.get<KnowledgeCategory[]>(`/analytics/knowledge-center/categories/${primaryId}/children/`),
    enabled: !!primaryId,
  });
};

