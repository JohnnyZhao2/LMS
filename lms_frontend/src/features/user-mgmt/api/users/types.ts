/**
 * User API Types
 * Type definitions for user management API
 * @module features/user-mgmt/api/users/types
 */

import type { RoleCode } from '@/config/roles';

/**
 * User list item
 */
export interface UserListItem {
  id: number;
  username: string;
  real_name: string;
  employee_id: string;
  is_active: boolean;
  department: {
    id: number;
    name: string;
  } | null;
  roles: Array<{
    code: RoleCode;
    name: string;
  }>;
  mentor?: {
    id: number;
    real_name: string;
  } | null;
}

/**
 * User detail with timestamps
 */
export interface UserDetail extends UserListItem {
  created_at: string;
  updated_at: string;
}

/**
 * Create user request
 */
export interface UserCreateRequest {
  username: string;
  password: string;
  real_name: string;
  employee_id: string;
  department_id?: number;
}

/**
 * Update user request
 */
export interface UserUpdateRequest {
  real_name?: string;
  employee_id?: string;
  department_id?: number | null;
}

/**
 * Assign roles request
 */
export interface AssignRolesRequest {
  role_codes: RoleCode[];
}

/**
 * Assign mentor request
 */
export interface AssignMentorRequest {
  mentor_id: number | null;
}

/**
 * Reset password request
 */
export interface ResetPasswordRequest {
  user_id: number;
}

/**
 * Reset password response
 */
export interface ResetPasswordResponse {
  temporary_password: string;
}

/**
 * User list params for filtering
 */
export interface UserListParams {
  search?: string;
  department_id?: number;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

/**
 * Paginated user list response
 */
export interface PaginatedUserList {
  count: number;
  next: string | null;
  previous: string | null;
  results: UserListItem[];
}
