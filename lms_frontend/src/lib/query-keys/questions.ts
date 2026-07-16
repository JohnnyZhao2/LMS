import { normalizeRoleKey, type QueryRole } from '@/lib/query-keys/shared';

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
