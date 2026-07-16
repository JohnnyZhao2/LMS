import { normalizeRoleKey, type QueryRole } from '@/lib/query-keys/shared';

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
