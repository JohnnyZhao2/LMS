import {
  useQuery,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { invalidateMany } from '@/lib/react-query/invalidate-many';
import {
  normalizeRoleKey,
  type QueryRole,
} from '@/lib/react-query/normalize-role-key';
import { useAppMutation } from '@/lib/react-query/use-app-mutation';

import { authorizationQueryKeys } from '@/features/user-management/api/authorization-queries';
import {
  activateUser,
  changeUserPassword,
  createUser,
  deactivateUser,
  deleteUser,
  getDepartments,
  getMentors,
  getRoles,
  getUser,
  getUsers,
  normalizeDepartments,
  updateMyAvatar,
  updateUser,
  updateUserAvatar,
  type GetUsersParams,
} from '@/features/user-management/api/users-api';

export const usersQueryKeys = {
  all: () => ['users'] as const,
  list: ({
    currentRole,
    departmentId,
    mentorId,
    isActive,
    search,
  }: {
    currentRole: QueryRole;
    departmentId?: number;
    mentorId?: number;
    isActive?: boolean;
    search?: string;
  }) => [
    'users',
    normalizeRoleKey(currentRole),
    departmentId,
    mentorId,
    isActive,
    search,
  ] as const,
  detailRoot: () => ['user-detail'] as const,
  detail: ({
    currentRole,
    id,
  }: {
    currentRole: QueryRole;
    id: number;
  }) => ['user-detail', normalizeRoleKey(currentRole), id] as const,
  mentorsRoot: () => ['mentors'] as const,
  mentors: (currentRole: QueryRole) => ['mentors', normalizeRoleKey(currentRole)] as const,
  rolesRoot: () => ['roles'] as const,
  roles: (currentRole: QueryRole) => ['roles', normalizeRoleKey(currentRole)] as const,
  departmentsRoot: () => ['departments'] as const,
  departments: (currentRole: QueryRole) => ['departments', normalizeRoleKey(currentRole)] as const,
  assignableRoot: () => ['assignable-users'] as const,
  assignable: (currentRole: QueryRole) => ['assignable-users', normalizeRoleKey(currentRole)] as const,
} as const;

type UserMutationInvalidateOptions = {
  includeMentors?: boolean;
  includeAssignableUsers?: boolean;
  includeAuthorization?: boolean;
};

/** 用户变更后失效相关缓存 */
export const invalidateAfterUserMutation = (
  queryClient: QueryClient,
  options: UserMutationInvalidateOptions = {},
) => {
  const keys: QueryKey[] = [usersQueryKeys.all(), usersQueryKeys.detailRoot()];
  if (options.includeMentors) keys.push(usersQueryKeys.mentorsRoot());
  if (options.includeAssignableUsers) keys.push(usersQueryKeys.assignableRoot());
  if (options.includeAuthorization) {
    keys.push(authorizationQueryKeys.userAuthorizationRoot());
  }
  return invalidateMany(queryClient, keys);
};

const invalidateUserDirectory = (qc: QueryClient) =>
  invalidateAfterUserMutation(qc, { includeMentors: true, includeAssignableUsers: true });

export interface UseUsersOptions {
  enabled?: boolean;
}

export const useUsers = (params: GetUsersParams = {}, options: UseUsersOptions = {}) => {
  const currentRole = useCurrentRole();
  const { departmentId, mentorId, isActive, search } = params;
  const { enabled = true } = options;

  return useQuery({
    queryKey: usersQueryKeys.list({ currentRole, departmentId, mentorId, isActive, search }),
    queryFn: () => getUsers({ departmentId, mentorId, isActive, search }),
    enabled: currentRole !== null && enabled,
  });
};

export const useUserDetail = (id: number) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: usersQueryKeys.detail({ currentRole, id }),
    queryFn: () => getUser(id),
    enabled: Boolean(id) && currentRole !== null,
  });
};

export const useCreateUser = () =>
  useAppMutation(createUser, (qc) =>
    invalidateAfterUserMutation(qc, { includeAssignableUsers: true }),
  );

export const useUpdateUser = () =>
  useAppMutation(updateUser, (qc, _data, variables) =>
    invalidateAfterUserMutation(qc, {
      includeMentors: true,
      includeAssignableUsers: true,
      includeAuthorization: variables.data.role_codes !== undefined,
    }),
  );

export const useDeleteUser = () => useAppMutation(deleteUser, invalidateUserDirectory);

export const useActivateUser = () => useAppMutation(activateUser, invalidateUserDirectory);

export const useDeactivateUser = () =>
  useAppMutation(deactivateUser, invalidateUserDirectory);

export const useDepartments = () => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: usersQueryKeys.departments(currentRole),
    queryFn: getDepartments,
    select: normalizeDepartments,
    enabled: currentRole !== null,
  });
};

export const useMentors = () => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: usersQueryKeys.mentors(currentRole),
    queryFn: getMentors,
    enabled: currentRole !== null,
  });
};

export const useRoles = () => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: usersQueryKeys.roles(currentRole),
    queryFn: getRoles,
    enabled: currentRole !== null,
  });
};

export const useChangePassword = () =>
  useAppMutation(changeUserPassword, (qc) => invalidateAfterUserMutation(qc));

export const useUpdateUserAvatar = () =>
  useAppMutation(updateUserAvatar, invalidateUserDirectory);

export const useUpdateMyAvatar = () =>
  useAppMutation(updateMyAvatar, invalidateUserDirectory);
