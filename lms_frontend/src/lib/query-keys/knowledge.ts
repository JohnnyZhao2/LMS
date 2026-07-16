import { normalizeRoleKey, type QueryRole } from '@/lib/query-keys/shared';

export const knowledgeQueryKeys = {
    listRoot: () => ['knowledge-list'] as const,
    infiniteList: ({
      currentRole,
      spaceTagId,
      tagId,
      search,
      pageSize,
    }: {
      currentRole: QueryRole;
      spaceTagId?: number;
      tagId?: number;
      search?: string;
      pageSize: number;
    }) => [
      'knowledge-list',
      'infinite',
      normalizeRoleKey(currentRole),
      spaceTagId,
      tagId,
      search,
      pageSize,
    ] as const,
    detailRoot: () => ['knowledge-detail'] as const,
    detail: ({
      currentRole,
      knowledgeId,
      taskKnowledgeId,
    }: {
      currentRole: QueryRole;
      knowledgeId?: number;
      taskKnowledgeId?: number;
    }) => [
      'knowledge-detail',
      normalizeRoleKey(currentRole),
      taskKnowledgeId ? 'task' : 'knowledge',
      taskKnowledgeId ?? knowledgeId ?? 0,
    ] as const,
} as const;
