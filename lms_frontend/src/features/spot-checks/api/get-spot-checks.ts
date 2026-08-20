import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString, buildPaginationParams } from '@/lib/api-utils';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/lib/auth';
import type { PaginatedResponse } from '@/types/common';
import type { SpotCheck, SpotCheckStudent } from '@/features/spot-checks/types';

interface GetSpotChecksParams {
  page?: number;
  pageSize?: number;
  studentId?: number;
  batchId?: string | null;
  enabled?: boolean;
}

interface GetSpotCheckStudentsParams {
  search?: string;
}

/**
 * 获取抽查记录列表
 */
export const useSpotChecks = (params: GetSpotChecksParams = {}) => {
  const { isAuthenticated } = useAuth();
  const { page = 1, pageSize = 20, studentId, batchId, enabled = true } = params;

  return useQuery({
    queryKey: queryKeys.spotChecks.list({
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
    enabled: isAuthenticated && enabled,
  });
};

/** 拉取同批次全部成员（自动翻页，突破单页 100 上限）。 */
export const useSpotCheckBatchPeers = (batchId: string | null | undefined) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.spotChecks.batchPeers({
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
    enabled: isAuthenticated && Boolean(batchId),
  });
};

/**
 * 获取可查看抽查的学员列表
 */
export const useSpotCheckStudents = (params: GetSpotCheckStudentsParams = {}) => {
  const { isAuthenticated } = useAuth();
  const { search } = params;

  return useQuery({
    queryKey: queryKeys.spotChecks.students({
      search,
    }),
    queryFn: () => {
      const queryString = buildQueryString({ search });
      return apiClient.get<SpotCheckStudent[]>(`/spot-checks/students/${queryString}`);
    },
    enabled: isAuthenticated,
  });
};

/**
 * 获取抽查详情
 */
export const useSpotCheckDetail = (id: number) => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.spotChecks.detail({ id }),
    queryFn: () => apiClient.get<SpotCheck>(`/spot-checks/${id}/`),
    enabled: !!id && isAuthenticated,
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
  const { isAuthenticated } = useAuth();
  const { page = 1, pageSize = 50, status, enabled = true } = params;

  return useQuery({
    queryKey: queryKeys.spotChecks.mine({ page, pageSize, status }),
    queryFn: () => {
      const queryString = buildQueryString({
        ...buildPaginationParams(page, pageSize),
        status: status && status !== 'all' ? status : undefined,
      });
      return apiClient.get<PaginatedResponse<SpotCheck>>(`/spot-checks/mine/${queryString}`);
    },
    enabled: isAuthenticated && enabled,
  });
};
