import {
  useMutation,
  useQueries,
  useQueryClient,
} from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { apiClient } from '@/lib/api-client';
import { invalidateAfterRoleTemplateMutation } from '@/lib/cache-invalidation/authorization';
import { queryKeys } from '@/lib/query-keys';
import type {
  AuthorizationScopePayload,
  RoleAuthorizationState,
} from '@/types/authorization';
import type { RoleCode } from '@/types/common';

interface ReplaceRolePermissionPayload {
  roleCode: RoleCode;
  permissionCodes: string[];
  scopes: AuthorizationScopePayload[];
}

export const getRolePermissionTemplate = (roleCode: RoleCode) =>
  apiClient.get<RoleAuthorizationState>(`/authorization/roles/${roleCode}/`);

export const useRolePermissionTemplates = (
  roleCodes: RoleCode[],
  enabled = true,
) => {
  const currentRole = useCurrentRole();
  return useQueries({
    queries: roleCodes.map((roleCode) => ({
      queryKey: queryKeys.authorization.roleTemplate({ currentRole, roleCode }),
      queryFn: () => getRolePermissionTemplate(roleCode),
      enabled: currentRole !== null && enabled,
    })),
  });
};

export const replaceRolePermissionTemplate = ({
  roleCode,
  permissionCodes,
  scopes,
}: ReplaceRolePermissionPayload) =>
  apiClient.put<RoleAuthorizationState>(`/authorization/roles/${roleCode}/`, {
    role_code: roleCode,
    permission_codes: permissionCodes,
    scopes,
  });

export const useReplaceRolePermissionTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: replaceRolePermissionTemplate,
    onSuccess: () => invalidateAfterRoleTemplateMutation(queryClient),
  });
};
