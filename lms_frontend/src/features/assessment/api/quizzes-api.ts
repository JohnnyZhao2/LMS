import { apiClient } from '@/lib/api-client';
import { buildPaginationParams, buildQueryString } from '@/lib/api-utils';
import type { PaginatedResponse } from '@/types/common';
import type { QuizCreateRequest, QuizDetail, QuizListItem } from '@/types/quiz';

export interface GetQuizzesParams {
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
  return apiClient.get<PaginatedResponse<QuizListItem>>(
    `/quizzes/${buildQueryString(queryParams)}`,
  );
};

export const getQuiz = (id: number) => apiClient.get<QuizDetail>(`/quizzes/${id}/`);

export const createQuiz = (data: QuizCreateRequest) =>
  apiClient.post<QuizDetail>('/quizzes/', data);

export const updateQuiz = ({ id, data }: { id: number; data: Partial<QuizCreateRequest> }) =>
  apiClient.patch<QuizDetail>(`/quizzes/${id}/`, data);

export const deleteQuiz = (id: number) => apiClient.delete(`/quizzes/${id}/`);
