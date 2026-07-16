import { normalizeRoleKey, type QueryRole } from '@/lib/query-keys/shared';

export const submissionsQueryKeys = {
    detailRoot: () => ['submission'] as const,
    detail: (submissionId: number) => ['submission', submissionId] as const,
    examResult: ({
      currentRole,
      submissionId,
    }: {
      currentRole: QueryRole;
      submissionId?: number;
    }) => ['exam-result', normalizeRoleKey(currentRole), submissionId] as const,
    practiceResult: ({
      currentRole,
      submissionId,
    }: {
      currentRole: QueryRole;
      submissionId?: number;
    }) => ['practice-result', normalizeRoleKey(currentRole), submissionId] as const,
} as const;
