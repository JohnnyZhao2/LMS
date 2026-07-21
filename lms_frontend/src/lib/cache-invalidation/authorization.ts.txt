import type { QueryClient } from '@tanstack/react-query';

import { invalidateMany } from '@/lib/cache-invalidation/shared';
import { queryKeys } from '@/lib/query-keys';

export const invalidateAfterAuthorizationOverrideMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.authorization.userOverridesRoot(),
    queryKeys.authorization.userScopeGroupOverridesRoot(),
  ]);

export const invalidateAfterRoleTemplateMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.authorization.permissionCatalogRoot(),
    queryKeys.authorization.roleTemplatesRoot(),
    queryKeys.authorization.userOverridesRoot(),
    queryKeys.authorization.userScopeGroupOverridesRoot(),
  ]);
