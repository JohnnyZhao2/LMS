import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { QuizDetail, QuizListItem, PaginatedResponse } from '@/types/api';

interface UseQuizzesParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

/**
 * 获取试卷列表
 */
export const useQuizzes = (params: UseQuizzesParams | number = {}) => {
  // 兼容旧的调用方式 useQuizzes(page)
  const { page = 1, pageSize = 20, search } = typeof params === 'number' 
    ? { page: params, pageSize: 20, search: undefined } 
    : params;

  return useQuery({
    queryKey: ['quizzes', page, pageSize, search],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(page));
      searchParams.set('page_size', String(pageSize));
      if (search) searchParams.set('search', search);
      return apiClient.get<PaginatedResponse<QuizListItem>>(`/quizzes/?${searchParams.toString()}`);
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


