import type { QueryClient, QueryKey } from '@tanstack/react-query';

import { invalidateMany } from '@/lib/cache-invalidation/shared';
import { queryKeys } from '@/lib/query-keys';

export const invalidateAfterUserMutation = (
  queryClient: QueryClient,
  options: {
    includeMentors?: boolean;
    includeAssignableUsers?: boolean;
    includeAuthorization?: boolean;
  } = {},
) => {
  const keys: QueryKey[] = [
    queryKeys.users.all(),
    queryKeys.users.detailRoot(),
  ];

  if (options.includeMentors) {
    keys.push(queryKeys.users.mentorsRoot());
  }

  if (options.includeAssignableUsers) {
    keys.push(queryKeys.users.assignableRoot());
  }

  if (options.includeAuthorization) {
    keys.push(queryKeys.authorization.userAuthorizationRoot());
  }

  return invalidateMany(queryClient, keys);
};
