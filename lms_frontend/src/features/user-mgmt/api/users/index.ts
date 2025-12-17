/**
 * Users API exports
 * @module features/user-mgmt/api/users
 */

// Keys
export { userKeys } from './keys';

// Types
export type {
  UserListItem,
  UserDetail,
  UserCreateRequest,
  UserUpdateRequest,
  AssignRolesRequest,
  AssignMentorRequest,
  ResetPasswordRequest,
  ResetPasswordResponse,
  UserListParams,
  PaginatedUserList,
} from './types';

// APIs
export { fetchUserList, useUserList } from './get-user-list';
export { fetchUserDetail, useUserDetail } from './get-user-detail';
export { createUser, useCreateUser } from './create-user';
export { updateUser, useUpdateUser } from './update-user';
export { deactivateUser, activateUser, useDeactivateUser, useActivateUser } from './toggle-user-status';
export { assignRoles, useAssignRoles } from './assign-roles';
export { assignMentor, useAssignMentor } from './assign-mentor';
export { resetPassword, useResetPassword } from './reset-password';
export { fetchMentees, useMentees } from './get-mentees';
export { fetchDepartmentMembers, useDepartmentMembers } from './get-department-members';
