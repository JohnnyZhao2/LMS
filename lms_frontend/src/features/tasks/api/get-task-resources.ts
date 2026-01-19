import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString } from '@/lib/api-utils';
import type { KnowledgeListItem, PaginatedResponse, QuizListItem } from '@/types/api';

interface UseResourceOptions {
  search?: string;
  page?: number;
  page_size?: number;
  enabled?: boolean;
}

/**
 * 获取任务可选的知识文档列表（仅已发布版本）
 */
export const useTaskKnowledgeOptions = (options: UseResourceOptions = {}) => {
  const { search = '', page = 1, page_size = 10, enabled = true } = options;

  return useQuery({
    queryKey: ['task-knowledge-options', search, page, page_size],
    queryFn: () => {
      const queryParams = {
        is_current: 'true',
        page: String(page),
        page_size: String(page_size),
        ...(search && { search }),
      };
      const queryString = buildQueryString(queryParams);
      return apiClient.get<PaginatedResponse<KnowledgeListItem>>(`/knowledge${queryString}`);
    },
    enabled,
    staleTime: 60_000,
  });
};

/**
 * 获取任务可选的试卷列表
 */
export const useTaskQuizOptions = (options: UseResourceOptions = {}) => {
  const { search = '', page = 1, page_size = 10, enabled = true } = options;

  return useQuery({
    queryKey: ['task-quiz-options', search, page, page_size],
    queryFn: () => {
      const queryParams = {
        is_current: 'true',
        page: String(page),
        page_size: String(page_size),
        ...(search && { search }),
      };
      const queryString = buildQueryString(queryParams);
      return apiClient.get<PaginatedResponse<QuizListItem>>(`/quizzes${queryString}`);
    },
    enabled,
    staleTime: 60_000,
  });
};
