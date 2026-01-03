import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString } from '@/lib/api-utils';
import type { KnowledgeListItem, PaginatedResponse, QuizListItem } from '@/types/api';

interface UseResourceOptions {
  search?: string;
  enabled?: boolean;
}

/**
 * 获取任务可选的知识文档列表（仅已发布版本）
 * 
 * 注意：后端可能返回数组或分页响应，需要兼容处理
 */
export const useTaskKnowledgeOptions = (options: UseResourceOptions = {}) => {
  const { search = '', enabled = true } = options;

  return useQuery({
    queryKey: ['task-knowledge-options', search],
    queryFn: () => {
      const queryParams = {
        status: 'PUBLISHED',
        include_drafts: 'false',
        page_size: '100',
        ...(search && { search }),
      };
      const queryString = buildQueryString(queryParams);
      // 后端可能返回数组或分页响应，使用联合类型
      return apiClient.get<KnowledgeListItem[] | PaginatedResponse<KnowledgeListItem>>(`/knowledge${queryString}`);
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
      const queryParams = {
        page_size: '50',
        status: 'PUBLISHED',
        ...(search && { search }),
      };
      const queryString = buildQueryString(queryParams);
      return apiClient.get<PaginatedResponse<QuizListItem>>(`/quizzes${queryString}`);
    },
    enabled,
    staleTime: 60_000,
  });
};


