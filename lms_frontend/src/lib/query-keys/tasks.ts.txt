import { normalizeRoleKey, type QueryRole } from '@/lib/query-keys/shared';

export const tasksQueryKeys = {
    all: () => ['tasks'] as const,
    list: ({
      currentRole,
      page,
      pageSize,
      search,
      taskStatus,
      creatorSide,
    }: {
      currentRole: QueryRole;
      page: number;
      pageSize: number;
      search?: string;
      taskStatus?: string;
      creatorSide?: string;
    }) => [
      'tasks',
      normalizeRoleKey(currentRole),
      page,
      pageSize,
      search,
      taskStatus,
      creatorSide,
    ] as const,
    detailRoot: () => ['task-detail'] as const,
    detail: ({
      currentRole,
      id,
    }: {
      currentRole: QueryRole;
      id: number;
    }) => ['task-detail', normalizeRoleKey(currentRole), id] as const,
    studentRoot: () => ['student-tasks'] as const,
    studentList: ({
      currentRole,
      page,
      pageSize,
      status,
      search,
    }: {
      currentRole: QueryRole;
      page: number;
      pageSize: number;
      status?: string;
      search?: string;
    }) => ['student-tasks', normalizeRoleKey(currentRole), page, pageSize, status, search] as const,
    studentLearningDetailRoot: () => ['student-learning-task-detail'] as const,
    studentLearningDetail: ({
      currentRole,
      taskId,
    }: {
      currentRole: QueryRole;
      taskId: number;
    }) => ['student-learning-task-detail', normalizeRoleKey(currentRole), taskId] as const,
    resourceOptionsRoot: () => ['task-resource-options'] as const,
    resourceOptions: ({
      currentRole,
      resourceType,
      search,
      page,
      pageSize,
      excludeDocumentIds,
      excludeQuizIds,
    }: {
      currentRole: QueryRole;
      resourceType: string;
      search: string;
      page: number;
      pageSize: number;
      excludeDocumentIds: string;
      excludeQuizIds: string;
    }) => [
      'task-resource-options',
      normalizeRoleKey(currentRole),
      resourceType,
      search,
      page,
      pageSize,
      excludeDocumentIds,
      excludeQuizIds,
    ] as const,
} as const;
