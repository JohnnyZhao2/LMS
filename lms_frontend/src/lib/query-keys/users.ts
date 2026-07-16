import { normalizeRoleKey, type QueryRole } from '@/lib/query-keys/shared';

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
