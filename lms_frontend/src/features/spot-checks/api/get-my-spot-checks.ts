import { useQuery } from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { apiClient } from '@/lib/api-client';
import { buildPaginationParams, buildQueryString } from '@/lib/api-utils';
import { queryKeys } from '@/lib/query-keys';
import type { SpotCheck } from '@/features/spot-checks/types/spot-check';
import type { PaginatedResponse } from '@/types/common';

interface GetMySpotChecksParams {
  page?: number;
  pageSize?: number;
  status?: string;
  enabled?: boolean;
}

export const getMySpotChecks = ({ page = 1, pageSize = 50, status }: GetMySpotChecksParams = {}) =>
  apiClient.get<PaginatedResponse<SpotCheck>>(
    `/spot-checks/mine/${buildQueryString({
      ...buildPaginationParams(page, pageSize),
      status: status && status !== 'all' ? status : undefined,
    })}`,
  );

export const useMySpotChecks = (params: GetMySpotChecksParams = {}) => {
  const currentRole = useCurrentRole();
  const { page = 1, pageSize = 50, status, enabled = true } = params;

  return useQuery({
    queryKey: queryKeys.spotChecks.mine({ currentRole, page, pageSize, status }),
    queryFn: () => getMySpotChecks({ page, pageSize, status }),
    enabled: currentRole !== null && enabled,
  });
};
