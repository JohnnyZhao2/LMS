import { useQuery } from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { apiClient } from '@/lib/api-client';
import { buildPaginationParams, buildQueryString } from '@/lib/api-utils';
import { queryKeys } from '@/lib/query-keys';
import type {
  SpotCheck,
  SpotCheckStatus,
} from '@/features/spot-checks/types/spot-check';
import type { PaginatedResponse, RoleCode } from '@/types/common';

interface GetSpotChecksParams {
  page?: number;
  pageSize?: number;
  role?: RoleCode | null;
  studentId?: number;
  batchId?: string | null;
  status?: SpotCheckStatus;
  topic?: string;
  enabled?: boolean;
}

export const getSpotChecks = ({
  page = 1,
  pageSize = 20,
  studentId,
  batchId,
  status,
  topic,
}: GetSpotChecksParams = {}) =>
  apiClient.get<PaginatedResponse<SpotCheck>>(
    `/spot-checks/${buildQueryString({
      ...buildPaginationParams(page, pageSize),
      student_id: studentId,
      batch_id: batchId || undefined,
      status,
      topic: topic?.trim() || undefined,
    })}`,
  );

export const useSpotChecks = (params: GetSpotChecksParams = {}) => {
  const currentRole = useCurrentRole();
  const {
    page = 1,
    pageSize = 20,
    role,
    studentId,
    batchId,
    status,
    topic,
    enabled = true,
  } = params;
  const resolvedRole = role ?? currentRole;

  return useQuery({
    queryKey: queryKeys.spotChecks.list({
      currentRole: resolvedRole,
      studentId,
      batchId: batchId ?? undefined,
      status,
      topic: topic?.trim() || undefined,
      page,
      pageSize,
    }),
    queryFn: () =>
      getSpotChecks({ page, pageSize, studentId, batchId, status, topic }),
    enabled: resolvedRole !== null && enabled,
  });
};
