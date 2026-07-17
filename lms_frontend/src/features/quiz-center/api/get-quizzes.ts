import { useQuery } from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { apiClient } from '@/lib/api-client';
import { buildPaginationParams, buildQueryString } from '@/lib/api-utils';
import { queryKeys } from '@/lib/query-keys';
import type { PaginatedResponse } from '@/types/common';
import type { QuizListItem } from '@/types/quiz';

interface GetQuizzesParams {
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
}: GetQuizzesParams = {}) => {
  const queryParams = {
    ...buildPaginationParams(page, pageSize),
    ...(search && { search }),
    ...(quizType && { quiz_type: quizType }),
  };
  return apiClient.get<PaginatedResponse<QuizListItem>>(`/quizzes/${buildQueryString(queryParams)}`);
};

export const useQuizzes = (params: GetQuizzesParams = {}) => {
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
