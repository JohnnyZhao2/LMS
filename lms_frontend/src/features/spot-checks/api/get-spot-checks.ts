import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString, buildPaginationParams } from '@/lib/api-utils';
import { useCurrentRole } from '@/hooks/use-current-role';
import type { PaginatedResponse, RoleCode, SpotCheck } from '@/types/api';

interface GetSpotChecksParams {
  page?: number;
  pageSize?: number;
  role?: RoleCode | null;
}

/**
 * 获取抽查记录列表
 */
export const useSpotChecks = (params: GetSpotChecksParams = {}) => {
  const currentRole = useCurrentRole();
  const { page = 1, pageSize = 20, role } = params;
  const resolvedRole = role ?? currentRole;
  
  return useQuery({
    queryKey: ['spot-checks', resolvedRole ?? 'UNKNOWN', page, pageSize],
    queryFn: () => {
      const queryString = buildQueryString(buildPaginationParams(page, pageSize));
      return apiClient.get<PaginatedResponse<SpotCheck>>(`/spot-checks/${queryString}`);
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
    queryKey: ['spot-check-detail', resolvedRole ?? 'UNKNOWN', id],
    queryFn: () => apiClient.get<SpotCheck>(`/spot-checks/${id}/`),
    enabled: !!id && resolvedRole !== null,
  });
};
