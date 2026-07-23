import {
  useQuery,
  type QueryClient,
} from '@tanstack/react-query';

import {
  createQuiz,
  deleteQuiz,
  getQuiz,
  getQuizzes,
  updateQuiz,
  type GetQuizzesParams,
} from '@/features/assessment/api/quizzes-api';
import { tasksQueryKeys } from '@/features/tasks/api/tasks-queries';
import { useCurrentRole } from '@/hooks/use-current-role';
import { invalidateMany } from '@/lib/react-query/invalidate-many';
import { normalizeRoleKey, type QueryRole } from '@/lib/react-query/normalize-role-key';
import { useAppMutation } from '@/lib/react-query/use-app-mutation';

export const quizzesQueryKeys = {
  all: () => ['quizzes'] as const,
  list: ({
    currentRole,
    page,
    pageSize,
    search,
    quizType,
  }: {
    currentRole: QueryRole;
    page: number;
    pageSize: number;
    search?: string;
    quizType?: string;
  }) => ['quizzes', normalizeRoleKey(currentRole), page, pageSize, search, quizType] as const,
  detailRoot: () => ['quiz-detail'] as const,
  detail: ({
    currentRole,
    id,
  }: {
    currentRole: QueryRole;
    id: number;
  }) => ['quiz-detail', normalizeRoleKey(currentRole), id] as const,
} as const;

/**
 * 试卷增删改后失效列表、详情与任务资源选项缓存。
 */
export const invalidateAfterQuizMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    quizzesQueryKeys.all(),
    quizzesQueryKeys.detailRoot(),
    tasksQueryKeys.resourceOptionsRoot(),
  ]);

export const useQuizzes = (params: GetQuizzesParams = {}) => {
  const currentRole = useCurrentRole();
  const { page = 1, pageSize = 20, search, quizType } = params;

  return useQuery({
    queryKey: quizzesQueryKeys.list({
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

export const useQuizDetail = (id: number) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: quizzesQueryKeys.detail({ currentRole, id }),
    queryFn: () => getQuiz(id),
    enabled: Boolean(id) && currentRole !== null,
  });
};

export const useCreateQuiz = () => useAppMutation(createQuiz, invalidateAfterQuizMutation);

export const useUpdateQuiz = () => useAppMutation(updateQuiz, invalidateAfterQuizMutation);

export const useDeleteQuiz = () => useAppMutation(deleteQuiz, invalidateAfterQuizMutation);
