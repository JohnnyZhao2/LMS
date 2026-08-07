import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString } from '@/lib/api-utils';
import {
  invalidateAfterGroupPermissionsMutation,
  invalidateAfterUserPermissionsMutation,
} from '@/lib/cache-invalidation';
import { queryKeys } from '@/lib/query-keys';
import { useCurrentRole } from '@/session/hooks/use-current-role';
import type { GroupPermissions, PermissionCatalogItem, UserPermissions } from '@/types/authorization';
import type { RoleCode } from '@/types/common';

interface PermissionCatalogQuery {
  module?: string;
}

interface ReplaceUserPermissionsPayload {
  userId: number;
  permissionCodes: string[];
}

interface ReplaceGroupPermissionsPayload {
  roleCode: RoleCode;
  permissionCodes: string[];
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
    queryFn: () => {
      if (!userId) {
        throw new Error('userId is required');
      }
      return apiClient.get<UserPermissions>(`/authorization/users/${userId}/permissions/`);
    },
    enabled: currentRole !== null && !!userId && enabled,
  });
};

export const useGroupPermissions = (roleCode: RoleCode | null, enabled = true) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: queryKeys.authorization.groupPermissions({ currentRole, roleCode }),
    queryFn: () => {
      if (!roleCode) {
        throw new Error('roleCode is required');
      }
      return apiClient.get<GroupPermissions>(`/authorization/groups/${roleCode}/permissions/`);
    },
    enabled: currentRole !== null && !!roleCode && enabled,
  });
};

export const useReplaceUserPermissions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, permissionCodes }: ReplaceUserPermissionsPayload) =>
      apiClient.put<UserPermissions>(`/authorization/users/${userId}/permissions/`, {
        permission_codes: permissionCodes,
      }),
    onSuccess: () => invalidateAfterUserPermissionsMutation(queryClient),
  });
};

export const useReplaceGroupPermissions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleCode, permissionCodes }: ReplaceGroupPermissionsPayload) =>
      apiClient.put<GroupPermissions>(`/authorization/groups/${roleCode}/permissions/`, {
        permission_codes: permissionCodes,
      }),
    onSuccess: () => invalidateAfterGroupPermissionsMutation(queryClient),
  });
};
