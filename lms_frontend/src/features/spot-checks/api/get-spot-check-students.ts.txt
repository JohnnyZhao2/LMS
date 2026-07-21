import { useQuery } from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { apiClient } from '@/lib/api-client';
import { buildQueryString } from '@/lib/api-utils';
import { queryKeys } from '@/lib/query-keys';
import type { SpotCheckStudent } from '@/features/spot-checks/types/spot-check';
import type { RoleCode } from '@/types/common';

interface GetSpotCheckStudentsParams {
  role?: RoleCode | null;
  search?: string;
}

export const getSpotCheckStudents = ({ search }: GetSpotCheckStudentsParams = {}) =>
  apiClient.get<SpotCheckStudent[]>(`/spot-checks/students/${buildQueryString({ search })}`);

export const useSpotCheckStudents = (params: GetSpotCheckStudentsParams = {}) => {
  const currentRole = useCurrentRole();
  const { role, search } = params;
  const resolvedRole = role ?? currentRole;

  return useQuery({
    queryKey: queryKeys.spotChecks.students({ currentRole: resolvedRole, search }),
    queryFn: () => getSpotCheckStudents({ search }),
    enabled: resolvedRole !== null,
  });
};
