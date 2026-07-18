import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString, buildPaginationParams } from '@/lib/api-utils';
import { queryKeys } from '@/lib/query-keys';
import { useCurrentRole } from '@/hooks/use-current-role';
import type { QuestionType, PaginatedResponse } from '@/types/common';
import type { Question } from '@/types/question';

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

/**
 * 获取题目列表
 */
export const useQuestions = (params: GetQuestionsParams = {}) => {
  const currentRole = useCurrentRole();
  const { page = 1, pageSize = 20, questionType, search, spaceTagId, tagId } = params;

  return useQuery({
    queryKey: queryKeys.questions.list({
      currentRole,
      page,
      pageSize,
      questionType,
      search,
      spaceTagId,
      tagId,
    }),
    queryFn: () => getQuestions({ page, pageSize, questionType, search, spaceTagId, tagId }),
    enabled: currentRole !== null,
    // 保持之前的数据，避免翻页时闪烁
    placeholderData: (previousData) => previousData,
  });
};
