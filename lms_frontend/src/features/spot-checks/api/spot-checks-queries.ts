import { useQuery, type QueryClient } from '@tanstack/react-query';

import {
  createSpotCheck,
  deleteSpotCheck,
  getMySpotChecks,
  getSpotCheck,
  getSpotCheckBatchPeers,
  getSpotChecks,
  getSpotCheckStudents,
  scoreSpotCheck,
  submitSpotCheck,
  type GetMySpotChecksParams,
  type GetSpotChecksParams,
  type GetSpotCheckStudentsParams,
} from '@/features/spot-checks/api/spot-checks-api';
import { useCurrentRole } from '@/hooks/use-current-role';
import { invalidateMany } from '@/lib/react-query/invalidate-many';
import { normalizeRoleKey, type QueryRole } from '@/lib/react-query/normalize-role-key';
import { useAppMutation } from '@/lib/react-query/use-app-mutation';
import type { RoleCode } from '@/types/common';

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
  batchPeersRoot: () => ['spot-checks-batch-peers'] as const,
  batchPeers: ({
    currentRole,
    batchId,
  }: {
    currentRole: QueryRole;
    batchId: string;
  }) =>
    [...spotChecksQueryKeys.batchPeersRoot(), normalizeRoleKey(currentRole), batchId] as const,
  mineRoot: () => ['spot-checks-mine'] as const,
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
  }) =>
    [
      ...spotChecksQueryKeys.mineRoot(),
      normalizeRoleKey(currentRole),
      page,
      pageSize,
      status ?? 'all',
    ] as const,
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

/**
 * 抽查增删改后失效列表、详情、学员与 mine/batchPeers 缓存。
 */
export const invalidateAfterSpotCheckMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    spotChecksQueryKeys.all(),
    spotChecksQueryKeys.detailRoot(),
    spotChecksQueryKeys.studentsRoot(),
    spotChecksQueryKeys.mineRoot(),
    spotChecksQueryKeys.batchPeersRoot(),
  ]);

interface UseSpotChecksParams extends GetSpotChecksParams {
  role?: RoleCode | null;
  enabled?: boolean;
}

export const useSpotChecks = (params: UseSpotChecksParams = {}) => {
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
    queryKey: spotChecksQueryKeys.list({
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

interface UseMySpotChecksParams extends GetMySpotChecksParams {
  enabled?: boolean;
}

export const useMySpotChecks = (params: UseMySpotChecksParams = {}) => {
  const currentRole = useCurrentRole();
  const { page = 1, pageSize = 50, status, enabled = true } = params;

  return useQuery({
    queryKey: spotChecksQueryKeys.mine({ currentRole, page, pageSize, status }),
    queryFn: () => getMySpotChecks({ page, pageSize, status }),
    enabled: currentRole !== null && enabled,
  });
};

export const useSpotCheckBatchPeers = (batchId: string | null | undefined) => {
  const currentRole = useCurrentRole();

  return useQuery({
    queryKey: spotChecksQueryKeys.batchPeers({ currentRole, batchId: batchId ?? '' }),
    queryFn: () => getSpotCheckBatchPeers(batchId!),
    enabled: currentRole !== null && Boolean(batchId),
  });
};

interface UseSpotCheckStudentsParams extends GetSpotCheckStudentsParams {
  role?: RoleCode | null;
}

export const useSpotCheckStudents = (params: UseSpotCheckStudentsParams = {}) => {
  const currentRole = useCurrentRole();
  const { role, search } = params;
  const resolvedRole = role ?? currentRole;

  return useQuery({
    queryKey: spotChecksQueryKeys.students({ currentRole: resolvedRole, search }),
    queryFn: () => getSpotCheckStudents({ search }),
    enabled: resolvedRole !== null,
  });
};

export const useSpotCheckDetail = (id: number, role?: RoleCode | null) => {
  const currentRole = useCurrentRole();
  const resolvedRole = role ?? currentRole;

  return useQuery({
    queryKey: spotChecksQueryKeys.detail({ currentRole: resolvedRole, id }),
    queryFn: () => getSpotCheck(id),
    enabled: Boolean(id) && resolvedRole !== null,
  });
};

export const useCreateSpotCheck = () =>
  useAppMutation(createSpotCheck, invalidateAfterSpotCheckMutation);

export const useScoreSpotCheck = () =>
  useAppMutation(scoreSpotCheck, invalidateAfterSpotCheckMutation);

export const useSubmitSpotCheck = () =>
  useAppMutation(submitSpotCheck, invalidateAfterSpotCheckMutation);

export const useDeleteSpotCheck = () =>
  useAppMutation(deleteSpotCheck, invalidateAfterSpotCheckMutation);
