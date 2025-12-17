/**
 * Mentorship API Types
 * Type definitions for mentorship management API
 * @module features/user-mgmt/api/mentorship/types
 */

import type { RoleCode } from '@/config/roles';

/**
 * Mentor basic info
 */
export interface MentorBasic {
  id: number;
  username: string;
  real_name: string;
  employee_id: string;
}

/**
 * Mentee info
 */
export interface Mentee {
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
}

/**
 * Mentor with mentee count
 */
export interface MentorWithMentees {
  id: number;
  username: string;
  real_name: string;
  employee_id: string;
  is_active: boolean;
  department: {
    id: number;
    name: string;
  } | null;
  mentee_count: number;
}

/**
 * Student without mentor
 */
export interface StudentWithoutMentor {
  id: number;
  username: string;
  real_name: string;
  employee_id: string;
  is_active: boolean;
  department: {
    id: number;
    name: string;
  } | null;
}

/**
 * Assign mentor request
 */
export interface AssignMentorRequest {
  mentor_id: number;
}

/**
 * Remove mentor request (empty)
 */
export type RemoveMentorRequest = Record<string, never>;
