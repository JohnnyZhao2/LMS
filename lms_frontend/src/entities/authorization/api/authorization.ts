import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString } from '@/lib/api-utils';
import { queryKeys } from '@/lib/query-keys';
import { useCurrentRole } from '@/session/hooks/use-current-role';
import type {
  PermissionCatalogItem,
  UserPermissions,
} from '@/types/authorization';

interface PermissionCatalogQuery {
  module?: string;
}

interface UserPermissionMutationPayload {
  userId: number;
  permissionCode: string;
}

export const usePermissionCatalog = (query: PermissionCatalogQuery = {}, enabled = true) => {
  const currentRole = useCurrentRole();
  const { module } = query;
  return useQuery({
    queryKey: queryKeys.authorization.permissionCatalog({ currentRole, module }),
    queryFn: () => {
      const queryString = buildQueryString({ module });
      return apiClient.get<PermissionCatalogItem[]>(`/authorization/permissions/${queryString}`);
    },
    enabled: currentRole !== null && enabled,
  });
};

export const useUserPermissions = (userId: number | null, enabled = true) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: queryKeys.authorization.userPermissions({ currentRole, userId }),
    queryFn: () => apiClient.get<UserPermissions>(
      `/authorization/users/${userId}/permissions/`,
    ),
    enabled: currentRole !== null && userId !== null && enabled,
  });
};

export const useGrantUserPermission = () => {
  const queryClient = useQueryClient();
  const currentRole = useCurrentRole();
  return useMutation({
    mutationFn: ({ userId, permissionCode }: UserPermissionMutationPayload) =>
      apiClient.put<UserPermissions>(
        `/authorization/users/${userId}/permissions/${permissionCode}/`,
      ),
    onSuccess: (data, { userId }) => {
      queryClient.setQueryData(
        queryKeys.authorization.userPermissions({ currentRole, userId }),
        data,
      );
    },
  });
};

export const useRevokeUserPermission = () => {
  const queryClient = useQueryClient();
  const currentRole = useCurrentRole();
  return useMutation({
    mutationFn: ({ userId, permissionCode }: UserPermissionMutationPayload) =>
      apiClient.delete<UserPermissions>(
        `/authorization/users/${userId}/permissions/${permissionCode}/`,
      ),
    onSuccess: (data, { userId }) => {
      queryClient.setQueryData(
        queryKeys.authorization.userPermissions({ currentRole, userId }),
        data,
      );
    },
  });
};
