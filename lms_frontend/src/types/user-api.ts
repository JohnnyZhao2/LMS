import type { RoleCode } from '@/types/common';

export interface CreateUserRequest {
  password: string;
  employee_id: string;
  username: string;
  department_id?: number;
  mentor_id?: number | null;
  role_codes?: RoleCode[];
}

export interface UpdateUserRequest {
  username?: string;
  employee_id?: string;
  department_id?: number | null;
  role_codes?: RoleCode[];
}

export interface UpdateAvatarRequest {
  avatar_key: string;
}

export interface ChangePasswordRequest {
  userId: number;
  password: string;
}
