import { useQueries } from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { RolePermissionTemplate } from '@/types/authorization';
import type { RoleCode } from '@/types/common';

export const getRolePermissionTemplate = (roleCode: RoleCode) =>
  apiClient.get<RolePermissionTemplate>(`/authorization/roles/${roleCode}/permissions/`);

export const useRolePermissionTemplates = (roleCodes: RoleCode[], enabled = true) => {
  const currentRole = useCurrentRole();
  return useQueries({
    queries: roleCodes.map((roleCode) => ({
      queryKey: queryKeys.authorization.roleTemplate({ currentRole, roleCode }),
      queryFn: () => getRolePermissionTemplate(roleCode),
      enabled: currentRole !== null && enabled,
    })),
  });
};
