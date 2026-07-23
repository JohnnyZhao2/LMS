import { normalizeRoleKey, type QueryRole } from '@/lib/query-keys/shared';

export const authorizationQueryKeys = {
  permissionCatalogRoot: () => ['authorization', 'permission-catalog'] as const,
  permissionCatalog: ({
    currentRole,
    module,
    view,
  }: {
    currentRole: QueryRole;
    module?: string;
    view?: string;
  }) => [
    'authorization',
    'permission-catalog',
    normalizeRoleKey(currentRole),
    module ?? 'ALL',
    view ?? 'ALL',
  ] as const,
  roleTemplatesRoot: () => ['authorization', 'role-template'] as const,
  roleTemplate: ({
    currentRole,
    roleCode,
  }: {
    currentRole: QueryRole;
    roleCode: string;
  }) => ['authorization', 'role-template', normalizeRoleKey(currentRole), roleCode] as const,
  userAuthorizationRoot: () => ['authorization', 'user-authorization'] as const,
  userAuthorization: ({
    currentRole,
    userId,
  }: {
    currentRole: QueryRole;
    userId: number | null;
  }) => [
    'authorization',
    'user-authorization',
    normalizeRoleKey(currentRole),
    userId ?? 'NONE',
  ] as const,
} as const;
