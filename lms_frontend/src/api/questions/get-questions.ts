import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString, buildPaginationParams } from '@/lib/api-utils';
import { queryKeys } from '@/lib/query-keys';
import type { QuestionType, PaginatedResponse } from '@/types/common';
import type { Question } from '@/types/question';

interface GetQuestionsParams {
  page?: number;
  pageSize?: number;
  questionType?: QuestionType;
  search?: string;
  spaceTagId?: number;
  tagId?: number;
}

/**
 * 获取题目列表
 */
export const useQuestions = (params: GetQuestionsParams = {}) => {
  const { page = 1, pageSize = 20, questionType, search, spaceTagId, tagId } = params;

  return useQuery({
    queryKey: queryKeys.questions.list({
      page,
      pageSize,
      questionType,
      search,
      spaceTagId,
      tagId,
    }),
    queryFn: () => {
      const queryParams = {
        ...buildPaginationParams(page, pageSize),
        ...(questionType && { question_type: questionType }),
        ...(search && { search }),
        ...(spaceTagId && { space_tag_id: String(spaceTagId) }),
        ...(tagId && { tag_id: String(tagId) }),
      };
      const queryString = buildQueryString(queryParams);
      return apiClient.get<PaginatedResponse<Question>>(`/questions/${queryString}`);
    },
    enabled: true,
    // 保持之前的数据，避免翻页时闪烁
    placeholderData: (previousData) => previousData,
  });
};

/**
 * 获取题目详情
 */
export const useQuestionDetail = (id: number) => {
  return useQuery({
    queryKey: queryKeys.questions.detail({ id }),
    queryFn: () => apiClient.get<Question>(`/questions/${id}/`),
    enabled: !!id,
  });
};
