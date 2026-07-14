import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString, buildPaginationParams } from '@/lib/api-utils';
import { queryKeys } from '@/lib/query-keys';
import { useCurrentRole } from '@/session/hooks/use-current-role';
import type { PaginatedResponse, RoleCode } from '@/types/common';
import type { SpotCheck, SpotCheckStudent } from '@/types/spot-check';

interface GetSpotChecksParams {
  page?: number;
  pageSize?: number;
  role?: RoleCode | null;
  studentId?: number;
  batchId?: string | null;
  enabled?: boolean;
}

interface GetSpotCheckStudentsParams {
  role?: RoleCode | null;
  search?: string;
}

/**
 * 获取抽查记录列表
 */
export const useSpotChecks = (params: GetSpotChecksParams = {}) => {
  const currentRole = useCurrentRole();
  const { page = 1, pageSize = 20, role, studentId, batchId, enabled = true } = params;
  const resolvedRole = role ?? currentRole;
  
  return useQuery({
    queryKey: queryKeys.spotChecks.list({
      currentRole: resolvedRole,
      studentId,
      batchId: batchId ?? undefined,
      page,
      pageSize,
    }),
    queryFn: () => {
      const queryString = buildQueryString({
        ...buildPaginationParams(page, pageSize),
        student_id: studentId,
        batch_id: batchId || undefined,
      });
      return apiClient.get<PaginatedResponse<SpotCheck>>(`/spot-checks/${queryString}`);
    },
    enabled: resolvedRole !== null && enabled,
  });
};

/** 拉取同批次全部成员（自动翻页，突破单页 100 上限）。 */
export const useSpotCheckBatchPeers = (batchId: string | null | undefined) => {
  const currentRole = useCurrentRole();

  return useQuery({
    queryKey: queryKeys.spotChecks.batchPeers({
      currentRole,
      batchId: batchId ?? '',
    }),
    queryFn: async () => {
      const pageSize = 100;
      let page = 1;
      const all: SpotCheck[] = [];
      while (true) {
        const queryString = buildQueryString({
          ...buildPaginationParams(page, pageSize),
          batch_id: batchId,
        });
        const res = await apiClient.get<PaginatedResponse<SpotCheck>>(`/spot-checks/${queryString}`);
        all.push(...(res.results ?? []));
        const totalPages = res.total_pages ?? 1;
        if (page >= totalPages || (res.results?.length ?? 0) === 0) break;
        page += 1;
      }
      return all;
    },
    enabled: currentRole !== null && Boolean(batchId),
  });
};

/**
 * 获取可查看抽查的学员列表
 */
export const useSpotCheckStudents = (params: GetSpotCheckStudentsParams = {}) => {
  const currentRole = useCurrentRole();
  const { role, search } = params;
  const resolvedRole = role ?? currentRole;

  return useQuery({
    queryKey: queryKeys.spotChecks.students({
      currentRole: resolvedRole,
      search,
    }),
    queryFn: () => {
      const queryString = buildQueryString({ search });
      return apiClient.get<SpotCheckStudent[]>(`/spot-checks/students/${queryString}`);
    },
    enabled: resolvedRole !== null,
  });
};

/**
 * 获取抽查详情
 */
export const useSpotCheckDetail = (id: number, role?: RoleCode | null) => {
  const currentRole = useCurrentRole();
  const resolvedRole = role ?? currentRole;
  return useQuery({
    queryKey: queryKeys.spotChecks.detail({ currentRole: resolvedRole, id }),
    queryFn: () => apiClient.get<SpotCheck>(`/spot-checks/${id}/`),
    enabled: !!id && resolvedRole !== null,
  });
};

/**
 * 学员：我的抽查列表
 */
export const useMySpotChecks = (
  params: {
    page?: number;
    pageSize?: number;
    status?: string;
    enabled?: boolean;
  } = {},
) => {
  const currentRole = useCurrentRole();
  const { page = 1, pageSize = 50, status, enabled = true } = params;

  return useQuery({
    queryKey: queryKeys.spotChecks.mine({ currentRole, page, pageSize, status }),
    queryFn: () => {
      const queryString = buildQueryString({
        ...buildPaginationParams(page, pageSize),
        status: status && status !== 'all' ? status : undefined,
      });
      return apiClient.get<PaginatedResponse<SpotCheck>>(`/spot-checks/mine/${queryString}`);
    },
    enabled: currentRole !== null && enabled,
  });
};
