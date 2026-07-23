import { apiClient } from '@/lib/api-client';
import { buildPaginationParams, buildQueryString } from '@/lib/api-utils';
import type { PaginatedResponse, QuestionType } from '@/types/common';
import type { Question, QuestionCreateRequest } from '@/types/question';

export interface GetQuestionsParams {
  page?: number;
  pageSize?: number;
  questionType?: QuestionType;
  search?: string;
  spaceTagId?: number;
  tagId?: number;
}

export const getQuestions = ({
  page = 1,
  pageSize = 20,
  questionType,
  search,
  spaceTagId,
  tagId,
}: GetQuestionsParams = {}) => {
  const queryParams = {
    ...buildPaginationParams(page, pageSize),
    ...(questionType && { question_type: questionType }),
    ...(search && { search }),
    ...(spaceTagId && { space_tag_id: String(spaceTagId) }),
    ...(tagId && { tag_id: String(tagId) }),
  };
  return apiClient.get<PaginatedResponse<Question>>(`/questions/${buildQueryString(queryParams)}`);
};

export const getQuestion = (id: number) => apiClient.get<Question>(`/questions/${id}/`);

export const createQuestion = (data: QuestionCreateRequest) =>
  apiClient.post<Question>('/questions/', data);

export const updateQuestion = ({
  id,
  data,
}: {
  id: number;
  data: Partial<QuestionCreateRequest>;
}) => apiClient.patch<Question>(`/questions/${id}/`, data);

export const deleteQuestion = (id: number) => apiClient.delete(`/questions/${id}/`);
