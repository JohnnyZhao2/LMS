/**
 * Organization Query Keys
 * React Query keys for organization data caching
 * @module features/user-mgmt/api/organization/keys
 */

/**
 * Query keys for organization
 */
export const organizationKeys = {
  all: ['organization'] as const,
  departments: () => [...organizationKeys.all, 'departments'] as const,
  departmentList: () => [...organizationKeys.departments(), 'list'] as const,
  departmentDetail: (id: number) => [...organizationKeys.departments(), 'detail', id] as const,
  departmentMembers: (id: number) => [...organizationKeys.departments(), 'members', id] as const,
};
