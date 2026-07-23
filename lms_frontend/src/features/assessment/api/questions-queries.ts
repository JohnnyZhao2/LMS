import {
  useQuery,
  type QueryClient,
} from '@tanstack/react-query';

import {
  createQuestion,
  deleteQuestion,
  getQuestion,
  getQuestions,
  updateQuestion,
  type GetQuestionsParams,
} from '@/features/assessment/api/questions-api';
import { useCurrentRole } from '@/hooks/use-current-role';
import { invalidateMany } from '@/lib/react-query/invalidate-many';
import { normalizeRoleKey, type QueryRole } from '@/lib/react-query/normalize-role-key';
import { useAppMutation } from '@/lib/react-query/use-app-mutation';
import type { PaginatedResponse } from '@/types/common';
import type { Question } from '@/types/question';

export const questionsQueryKeys = {
  all: () => ['questions'] as const,
  list: ({
    currentRole,
    page,
    pageSize,
    questionType,
    search,
    spaceTagId,
    tagId,
  }: {
    currentRole: QueryRole;
    page: number;
    pageSize: number;
    questionType?: string;
    search?: string;
    spaceTagId?: number;
    tagId?: number;
  }) => [
    'questions',
    normalizeRoleKey(currentRole),
    page,
    pageSize,
    questionType,
    search,
    spaceTagId,
    tagId,
  ] as const,
  detailRoot: () => ['question-detail'] as const,
  detail: ({
    currentRole,
    id,
  }: {
    currentRole: QueryRole;
    id: number;
  }) => ['question-detail', normalizeRoleKey(currentRole), id] as const,
} as const;

/**
 * 题目增删改后失效列表与详情缓存。
 */
export const invalidateAfterQuestionMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    questionsQueryKeys.all(),
    questionsQueryKeys.detailRoot(),
  ]);

const patchQuestionListCache = (
  current: PaginatedResponse<Question> | undefined,
  nextQuestion: Question,
) => {
  if (!current) return current;
  return {
    ...current,
    results: current.results.map((item) => (item.id === nextQuestion.id ? nextQuestion : item)),
  };
};

/**
 * 获取题目列表
 */
export const useQuestions = (params: GetQuestionsParams = {}) => {
  const currentRole = useCurrentRole();
  const { page = 1, pageSize = 20, questionType, search, spaceTagId, tagId } = params;

  return useQuery({
    queryKey: questionsQueryKeys.list({
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

export const useQuestionDetail = (id: number) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: questionsQueryKeys.detail({ currentRole, id }),
    queryFn: () => getQuestion(id),
    enabled: Boolean(id) && currentRole !== null,
  });
};

export const useCreateQuestion = () =>
  useAppMutation(createQuestion, invalidateAfterQuestionMutation);

export const useUpdateQuestion = () =>
  useAppMutation(updateQuestion, (qc, updatedQuestion) => {
    qc.setQueriesData(
      { queryKey: questionsQueryKeys.all() },
      (current: PaginatedResponse<Question> | undefined) =>
        patchQuestionListCache(current, updatedQuestion),
    );
    qc.setQueriesData(
      { queryKey: questionsQueryKeys.detailRoot() },
      (current: Question | undefined) =>
        current?.id === updatedQuestion.id ? updatedQuestion : current,
    );
    return invalidateAfterQuestionMutation(qc);
  });

export const useDeleteQuestion = () =>
  useAppMutation(deleteQuestion, invalidateAfterQuestionMutation);
