/**
 * Organization API Types
 * Type definitions for organization management API
 * @module features/user-mgmt/api/organization/types
 */

import type { RoleCode } from '@/config/roles';

/**
 * Department basic info
 */
export interface DepartmentBasic {
  id: number;
  name: string;
}

/**
 * Department manager info
 */
export interface DepartmentManager {
  id: number;
  username: string;
  real_name: string;
  employee_id: string;
}

/**
 * Department with manager and member count
 */
export interface Department extends DepartmentBasic {
  manager: DepartmentManager | null;
  member_count: number;
}

/**
 * Department member info
 */
export interface DepartmentMember {
  id: number;
  username: string;
  real_name: string;
  employee_id: string;
  is_active: boolean;
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
 * Department with members
 */
export interface DepartmentWithMembers extends Department {
  members: DepartmentMember[];
}

/**
 * Update user department request
 */
export interface UpdateUserDepartmentRequest {
  department_id: number | null;
}

/**
 * Set department manager request
 */
export interface SetDepartmentManagerRequest {
  user_id: number;
}
