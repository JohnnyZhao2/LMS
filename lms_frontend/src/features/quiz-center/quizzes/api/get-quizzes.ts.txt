import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString, buildPaginationParams } from '@/lib/api-utils';
import { useCurrentRole } from '@/hooks/use-current-role';
import type { QuizDetail, QuizListItem, PaginatedResponse } from '@/types/api';

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
  const currentRole = useCurrentRole();
  const { page = 1, pageSize = 20, search, quizType } = params;

  return useQuery({
    queryKey: ['quizzes', currentRole ?? 'UNKNOWN', page, pageSize, search, quizType],
    queryFn: () => {
      const queryParams = {
        ...buildPaginationParams(page, pageSize),
        ...(search && { search }),
        ...(quizType && { quiz_type: quizType }),
      };
      const queryString = buildQueryString(queryParams);
      return apiClient.get<PaginatedResponse<QuizListItem>>(`/quizzes/${queryString}`);
    },
    enabled: currentRole !== null,
  });
};

/**
 * 获取试卷详情
 */
export const useQuizDetail = (id: number) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: ['quiz-detail', currentRole ?? 'UNKNOWN', id],
    queryFn: () => apiClient.get<QuizDetail>(`/quizzes/${id}/`),
    enabled: !!id && currentRole !== null,
  });
};

