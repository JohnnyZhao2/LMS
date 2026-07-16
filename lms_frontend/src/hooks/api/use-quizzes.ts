import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString, buildPaginationParams } from '@/lib/api-utils';
import { queryKeys } from '@/lib/query-keys';
import { useCurrentRole } from '@/hooks/use-current-role';
import type { PaginatedResponse } from '@/types/common';
import type { QuizListItem } from '@/types/quiz';

export interface UseQuizzesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  quizType?: 'EXAM' | 'PRACTICE';
}

export const getQuizzes = ({
  page = 1,
  pageSize = 20,
  search,
  quizType,
}: UseQuizzesParams = {}) => {
  const queryParams = {
    ...buildPaginationParams(page, pageSize),
    ...(search && { search }),
    ...(quizType && { quiz_type: quizType }),
  };
  return apiClient.get<PaginatedResponse<QuizListItem>>(`/quizzes/${buildQueryString(queryParams)}`);
};

/**
 * 获取试卷列表
 */
export const useQuizzes = (params: UseQuizzesParams = {}) => {
  const currentRole = useCurrentRole();
  const { page = 1, pageSize = 20, search, quizType } = params;

  return useQuery({
    queryKey: queryKeys.quizzes.list({
      currentRole,
      page,
      pageSize,
      search,
      quizType,
    }),
    queryFn: () => getQuizzes({ page, pageSize, search, quizType }),
    enabled: currentRole !== null,
  });
};
