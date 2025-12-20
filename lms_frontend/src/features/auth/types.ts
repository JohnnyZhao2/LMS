import type { RoleCode, UserInfo, Role } from '@/types/api';

/**
 * 认证状态
 */
export interface AuthState {
  user: UserInfo | null;
  currentRole: RoleCode | null;
  availableRoles: Role[];
  isAuthenticated: boolean;
  isLoading: boolean;
}

