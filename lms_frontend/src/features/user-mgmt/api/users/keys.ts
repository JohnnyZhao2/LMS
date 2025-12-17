/**
 * User Query Keys
 * React Query keys for user data caching
 * @module features/user-mgmt/api/users/keys
 */

import type { UserListParams } from './types';

/**
 * Query keys for users
 */
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: UserListParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: number | string) => [...userKeys.details(), id] as const,
  mentees: () => [...userKeys.all, 'mentees'] as const,
  departmentMembers: () => [...userKeys.all, 'departmentMembers'] as const,
};
