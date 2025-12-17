/**
 * Organization API exports
 * @module features/user-mgmt/api/organization
 */

// Keys
export { organizationKeys } from './keys';

// Types
export type {
  DepartmentBasic,
  DepartmentManager,
  Department,
  DepartmentMember,
  DepartmentWithMembers,
  UpdateUserDepartmentRequest,
  SetDepartmentManagerRequest,
} from './types';

// APIs
export { fetchDepartments, useDepartments } from './get-departments';
export { fetchDepartmentDetail, useDepartmentDetail } from './get-department-detail';
export { fetchDepartmentMembersById, useDepartmentMembersById } from './get-department-members';
export { updateUserDepartment, useUpdateUserDepartment } from './update-user-department';
export { setDepartmentManager, useSetDepartmentManager } from './set-department-manager';
