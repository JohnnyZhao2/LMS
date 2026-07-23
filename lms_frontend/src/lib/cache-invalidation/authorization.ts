import type { QueryClient } from '@tanstack/react-query';

import { invalidateMany } from '@/lib/cache-invalidation/shared';
import { queryKeys } from '@/lib/query-keys';

/**
 * 用户最终授权变更后失效相关缓存。
 */
export const invalidateAfterUserAuthorizationMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.authorization.userAuthorizationRoot(),
  ]);

/**
 * 角色模板变更后失效相关缓存。
 */
export const invalidateAfterRoleTemplateMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.authorization.permissionCatalogRoot(),
    queryKeys.authorization.roleTemplatesRoot(),
    queryKeys.authorization.userAuthorizationRoot(),
  ]);
