import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { KnowledgeListItem, PaginatedResponse, QuizListItem } from '@/types/api';

interface UseResourceOptions {
  search?: string;
  enabled?: boolean;
}

/**
 * 获取任务可选的知识文档列表（仅已发布版本）
 */
export const useTaskKnowledgeOptions = (options: UseResourceOptions = {}) => {
  const { search = '', enabled = true } = options;

  return useQuery({
    queryKey: ['task-knowledge-options', search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) {
        params.set('search', search);
      }
      params.set('status', 'PUBLISHED');
      params.set('include_drafts', 'false');
      const query = params.toString();
      const suffix = query ? `?${query}` : '';
      return apiClient.get<KnowledgeListItem[]>(`/knowledge/${suffix}`);
    },
    enabled,
    staleTime: 60_000,
  });
};

/**
 * 获取任务可选的试卷列表（仅已发布版本，默认最多50条）
 */
export const useTaskQuizOptions = (options: UseResourceOptions = {}) => {
  const { search = '', enabled = true } = options;

  return useQuery({
    queryKey: ['task-quiz-options', search],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('page_size', '50');
      params.set('status', 'PUBLISHED');
      if (search) {
        params.set('search', search);
      }
      const query = params.toString();
      const suffix = query ? `?${query}` : '';
      return apiClient.get<PaginatedResponse<QuizListItem>>(`/quizzes/${suffix}`);
    },
    enabled,
    staleTime: 60_000,
  });
};


