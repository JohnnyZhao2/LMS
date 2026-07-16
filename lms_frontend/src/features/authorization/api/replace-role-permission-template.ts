import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterRoleTemplateMutation } from '@/lib/cache-invalidation/authorization';
import type { RolePermissionTemplate } from '@/types/authorization';
import type { RoleCode } from '@/types/common';

interface ReplaceRolePermissionPayload {
  roleCode: RoleCode;
  permissionCodes: string[];
}

export const replaceRolePermissionTemplate = ({
  roleCode,
  permissionCodes,
}: ReplaceRolePermissionPayload) =>
  apiClient.put<RolePermissionTemplate>(`/authorization/roles/${roleCode}/permissions/`, {
    role_code: roleCode,
    permission_codes: permissionCodes,
  });

export const useReplaceRolePermissionTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: replaceRolePermissionTemplate,
    onSuccess: () => invalidateAfterRoleTemplateMutation(queryClient),
  });
};
