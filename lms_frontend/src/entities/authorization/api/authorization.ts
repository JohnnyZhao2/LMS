import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  invalidateAfterGroupPermissionsMutation,
  invalidateAfterUserPermissionsMutation,
} from '@/lib/cache-invalidation';
import { queryKeys } from '@/lib/query-keys';
import type { GroupPermissions, PermissionCatalogItem, UserPermissions } from '@/types/authorization';
import type { RoleCode } from '@/types/common';

interface ReplaceUserPermissionsPayload {
  userId: number;
  permissionCodes: string[];
}

interface ReplaceGroupPermissionsPayload {
  roleCode: RoleCode;
  permissionCodes: string[];
}

export const usePermissionCatalog = (enabled = true) => {
  return useQuery({
    queryKey: queryKeys.authorization.permissionCatalog(),
    queryFn: () => apiClient.get<PermissionCatalogItem[]>('/authorization/permissions/'),
    enabled: enabled,
  });
};

export const useUserPermissions = (userId: number | null, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.authorization.userPermissions({ userId }),
    queryFn: () => {
      if (!userId) {
        throw new Error('userId is required');
      }
      return apiClient.get<UserPermissions>(`/authorization/users/${userId}/permissions/`);
    },
    enabled: !!userId && enabled,
  });
};

export const useGroupPermissions = (roleCode: RoleCode | null, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.authorization.groupPermissions({ roleCode }),
    queryFn: () => {
      if (!roleCode) {
        throw new Error('roleCode is required');
      }
      return apiClient.get<GroupPermissions>(`/authorization/groups/${roleCode}/permissions/`);
    },
    enabled: !!roleCode && enabled,
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
