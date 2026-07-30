import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentRole } from '@/session/hooks/use-current-role';
import {
  getPermissionCatalog,
  getUserPermissions,
  updateUserPermissions,
} from './authorization-api';

type QueryRole = string | null | undefined;

const normalizeRoleKey = (currentRole: QueryRole) => currentRole ?? 'UNKNOWN';

export const authorizationKeys = {
  permissionCatalog: ({
    currentRole,
    module,
  }: {
    currentRole: QueryRole;
    module?: string;
  }) => [
    'authorization',
    'permission-catalog',
    normalizeRoleKey(currentRole),
    module ?? 'ALL',
  ] as const,
  userPermissions: ({
    currentRole,
    userId,
  }: {
    currentRole: QueryRole;
    userId: number | null;
  }) => ['authorization', 'user-permissions', normalizeRoleKey(currentRole), userId ?? 'NONE'] as const,
};

export const usePermissionCatalog = (
  query: { module?: string } = {},
  enabled = true,
) => {
  const currentRole = useCurrentRole();
  const { module } = query;
  return useQuery({
    queryKey: authorizationKeys.permissionCatalog({ currentRole, module }),
    queryFn: () => getPermissionCatalog({ module }),
    enabled: currentRole !== null && enabled,
  });
};

export const useUserPermissions = (userId: number | null, enabled = true) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: authorizationKeys.userPermissions({ currentRole, userId }),
    queryFn: () => getUserPermissions(userId!),
    enabled: currentRole !== null && userId !== null && enabled,
  });
};

export const useUpdateUserPermissions = () => {
  const queryClient = useQueryClient();
  const currentRole = useCurrentRole();
  return useMutation({
    mutationFn: updateUserPermissions,
    onSuccess: (data, { userId }) => {
      queryClient.setQueryData(
        authorizationKeys.userPermissions({ currentRole, userId }),
        data,
      );
    },
  });
};
