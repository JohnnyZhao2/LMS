import { useQuery } from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { apiClient } from '@/lib/api-client';
import { buildQueryString } from '@/lib/api-utils';
import { queryKeys } from '@/lib/query-keys';
import type { UserList } from '@/types/common';

export interface GetUsersParams {
  departmentId?: number;
  mentorId?: number;
  isActive?: boolean;
  search?: string;
}

export interface UseUsersOptions {
  enabled?: boolean;
}

export const getUsers = ({ departmentId, mentorId, isActive, search }: GetUsersParams = {}) => {
  const queryString = buildQueryString({
    ...(departmentId && { department_id: String(departmentId) }),
    ...(mentorId && { mentor_id: String(mentorId) }),
    ...(isActive !== undefined && { is_active: String(isActive) }),
    ...(search && { search }),
  });
  return apiClient.get<UserList[]>(`/users${queryString}`);
};

export const useUsers = (params: GetUsersParams = {}, options: UseUsersOptions = {}) => {
  const currentRole = useCurrentRole();
  const { departmentId, mentorId, isActive, search } = params;
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.users.list({ currentRole, departmentId, mentorId, isActive, search }),
    queryFn: () => getUsers({ departmentId, mentorId, isActive, search }),
    enabled: currentRole !== null && enabled,
  });
};
