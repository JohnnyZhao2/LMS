import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString, buildPaginationParams } from '@/lib/api-utils';
import { queryKeys } from '@/lib/query-keys';
import type { PaginatedResponse } from '@/types/common';
import type { QuizDetail, QuizListItem } from '@/types/quiz';

interface UseQuizzesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  quizType?: 'EXAM' | 'PRACTICE';
}

/**
 * 获取试卷列表
 */
export const useQuizzes = (params: UseQuizzesParams = {}) => {
  const { page = 1, pageSize = 20, search, quizType } = params;

  return useQuery({
    queryKey: queryKeys.quizzes.list({
      page,
      pageSize,
      search,
      quizType,
    }),
    queryFn: () => {
      const queryParams = {
        ...buildPaginationParams(page, pageSize),
        ...(search && { search }),
        ...(quizType && { quiz_type: quizType }),
      };
      const queryString = buildQueryString(queryParams);
      return apiClient.get<PaginatedResponse<QuizListItem>>(`/quizzes/${queryString}`);
    },
    enabled: true,
  });
};

/**
 * 获取试卷详情
 */
export const useQuizDetail = (id: number) => {
  return useQuery({
    queryKey: queryKeys.quizzes.detail({ id }),
    queryFn: () => apiClient.get<QuizDetail>(`/quizzes/${id}/`),
    enabled: !!id,
  });
};
