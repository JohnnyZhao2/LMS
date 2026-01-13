import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString, buildPaginationParams } from '@/lib/api-utils';
import type { QuizDetail, QuizListItem, PaginatedResponse } from '@/types/api';

interface UseQuizzesParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

/**
 * 获取试卷列表
 */
export const useQuizzes = (params: UseQuizzesParams = {}) => {
  const { page = 1, pageSize = 20, search } = params;

  return useQuery({
    queryKey: ['quizzes', page, pageSize, search],
    queryFn: () => {
      const queryParams = {
        ...buildPaginationParams(page, pageSize),
        ...(search && { search }),
      };
      const queryString = buildQueryString(queryParams);
      return apiClient.get<PaginatedResponse<QuizListItem>>(`/quizzes/${queryString}`);
    },
  });
};

/**
 * 获取试卷详情
 */
export const useQuizDetail = (id: number) => {
  return useQuery({
    queryKey: ['quiz-detail', id],
    queryFn: () => apiClient.get<QuizDetail>(`/quizzes/${id}/`),
    enabled: !!id,
  });
};


