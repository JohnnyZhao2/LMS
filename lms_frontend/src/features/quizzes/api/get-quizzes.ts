import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { QuizDetail, QuizListItem, PaginatedResponse } from '@/types/api';

/**
 * 获取试卷列表
 */
export const useQuizzes = (page = 1, pageSize = 20) => {
  return useQuery({
    queryKey: ['quizzes', page, pageSize],
    queryFn: () =>
      apiClient.get<PaginatedResponse<QuizListItem>>(`/quizzes/?page=${page}&page_size=${pageSize}`),
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


