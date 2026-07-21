import { useQuery } from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { SpotCheck } from '@/features/spot-checks/types/spot-check';
import type { RoleCode } from '@/types/common';

export const getSpotCheck = (id: number) => apiClient.get<SpotCheck>(`/spot-checks/${id}/`);

export const useSpotCheckDetail = (id: number, role?: RoleCode | null) => {
  const currentRole = useCurrentRole();
  const resolvedRole = role ?? currentRole;

  return useQuery({
    queryKey: queryKeys.spotChecks.detail({ currentRole: resolvedRole, id }),
    queryFn: () => getSpotCheck(id),
    enabled: Boolean(id) && resolvedRole !== null,
  });
};
