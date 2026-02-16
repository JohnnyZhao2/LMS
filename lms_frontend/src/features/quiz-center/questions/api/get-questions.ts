import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString, buildPaginationParams } from '@/lib/api-utils';
import { useCurrentRole } from '@/hooks/use-current-role';
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
  const currentRole = useCurrentRole();
  const { page = 1, pageSize = 20, questionType, search, lineTypeId } = params;

  return useQuery({
    queryKey: ['questions', currentRole ?? 'UNKNOWN', page, pageSize, questionType, search, lineTypeId],
    queryFn: () => {
      const queryParams = {
        ...buildPaginationParams(page, pageSize),
        ...(questionType && { question_type: questionType }),
        ...(search && { search }),
        ...(lineTypeId && { line_tag_id: String(lineTypeId) }),
      };
      const queryString = buildQueryString(queryParams);
      return apiClient.get<PaginatedResponse<Question>>(`/questions/${queryString}`);
    },
    enabled: currentRole !== null,
    // 保持之前的数据，避免翻页时闪烁
    placeholderData: (previousData) => previousData,
  });
};

/**
 * 获取题目详情
 */
export const useQuestionDetail = (id: number) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: ['question-detail', currentRole ?? 'UNKNOWN', id],
    queryFn: () => apiClient.get<Question>(`/questions/${id}/`),
    enabled: !!id && currentRole !== null,
  });
};

