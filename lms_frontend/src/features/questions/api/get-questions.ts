import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Question, QuestionType, PaginatedResponse } from '@/types/api';

interface GetQuestionsParams {
  page?: number;
  pageSize?: number;
  questionType?: QuestionType;
  search?: string;
  lineTypeId?: number;
}

/**
 * 获取题目列表
 */
export const useQuestions = (params: GetQuestionsParams = {}) => {
  const { page = 1, pageSize = 20, questionType, search, lineTypeId } = params;

  return useQuery({
    queryKey: ['questions', page, pageSize, questionType, search, lineTypeId],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (page) searchParams.set('page', String(page));
      if (pageSize) searchParams.set('page_size', String(pageSize));
      if (questionType) searchParams.set('question_type', questionType);
      if (search) searchParams.set('search', search);
      if (lineTypeId) searchParams.set('line_type_id', String(lineTypeId));

      return apiClient.get<PaginatedResponse<Question>>(`/questions/?${searchParams.toString()}`);
    },
  });
};

/**
 * 获取题目详情
 */
export const useQuestionDetail = (id: number) => {
  return useQuery({
    queryKey: ['question-detail', id],
    queryFn: () => apiClient.get<Question>(`/questions/${id}/`),
    enabled: !!id,
  });
};


