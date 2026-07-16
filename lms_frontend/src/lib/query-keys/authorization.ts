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
    userOverridesRoot: () => ['authorization', 'user-overrides'] as const,
    userOverrides: ({
      currentRole,
      userId,
    }: {
      currentRole: QueryRole;
      userId: number | null;
    }) => ['authorization', 'user-overrides', normalizeRoleKey(currentRole), userId ?? 'NONE'] as const,
    userScopeGroupOverridesRoot: () => ['authorization', 'user-scope-group-overrides'] as const,
    userScopeGroupOverrides: ({
      currentRole,
      userId,
    }: {
      currentRole: QueryRole;
      userId: number | null;
    }) => ['authorization', 'user-scope-group-overrides', normalizeRoleKey(currentRole), userId ?? 'NONE'] as const,
} as const;
