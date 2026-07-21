import { normalizeRoleKey, type QueryRole } from '@/lib/query-keys/shared';

export const spotChecksQueryKeys = {
    all: () => ['spot-checks'] as const,
    list: ({
      currentRole,
      studentId,
      batchId,
      status,
      topic,
      page,
      pageSize,
    }: {
      currentRole: QueryRole;
      studentId?: number;
      batchId?: string;
      status?: string;
      topic?: string;
      page: number;
      pageSize: number;
    }) => [
      'spot-checks',
      normalizeRoleKey(currentRole),
      studentId ?? 'ALL',
      batchId ?? 'ALL',
      status ?? 'ALL',
      topic ?? '',
      page,
      pageSize,
    ] as const,
    batchPeers: ({
      currentRole,
      batchId,
    }: {
      currentRole: QueryRole;
      batchId: string;
    }) => ['spot-checks-batch-peers', normalizeRoleKey(currentRole), batchId] as const,
    mine: ({
      currentRole,
      page,
      pageSize,
      status,
    }: {
      currentRole: QueryRole;
      page: number;
      pageSize: number;
      status?: string;
    }) => ['spot-checks-mine', normalizeRoleKey(currentRole), page, pageSize, status ?? 'all'] as const,
    studentsRoot: () => ['spot-check-students'] as const,
    students: ({
      currentRole,
      search,
    }: {
      currentRole: QueryRole;
      search?: string;
    }) => ['spot-check-students', normalizeRoleKey(currentRole), search ?? ''] as const,
    detailRoot: () => ['spot-check-detail'] as const,
    detail: ({
      currentRole,
      id,
    }: {
      currentRole: QueryRole;
      id: number;
    }) => ['spot-check-detail', normalizeRoleKey(currentRole), id] as const,
} as const;
