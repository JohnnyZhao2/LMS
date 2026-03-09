import type { AuthSessionPayload, Role, RoleCode, UserInfo } from '@/types/api';

/**
 * Token 存储工具
 */
const ACCESS_TOKEN_KEY = 'lms_access_token';
const REFRESH_TOKEN_KEY = 'lms_refresh_token';
const USER_INFO_KEY = 'lms_user_info';
const CURRENT_ROLE_KEY = 'lms_current_role';
const AVAILABLE_ROLES_KEY = 'lms_available_roles';
const EFFECTIVE_PERMISSIONS_KEY = 'lms_effective_permissions';
const ROLE_CODES: RoleCode[] = ['STUDENT', 'MENTOR', 'DEPT_MANAGER', 'ADMIN', 'TEAM_MANAGER'];

const parseStorageJson = <T>(key: string, fallback: T): T => {
  const rawValue = localStorage.getItem(key);
  if (!rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
};

export const tokenStorage = {
  /**
   * 获取访问令牌
   */
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  /**
   * 获取刷新令牌
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  /**
   * 设置令牌
   */
  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  /**
   * 检查是否已登录
   */
  hasTokens(): boolean {
    return !!this.getAccessToken() && !!this.getRefreshToken();
  },

  /**
   * 获取用户信息
   */
  getUserInfo(): UserInfo | null {
    return parseStorageJson<UserInfo | null>(USER_INFO_KEY, null);
  },

  /**
   * 设置用户信息
   */
  setUserInfo(user: UserInfo): void {
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
  },

  /**
   * 获取当前角色
   */
  getCurrentRole(): RoleCode | null {
    const role = localStorage.getItem(CURRENT_ROLE_KEY);
    if (!role) {
      return null;
    }

    if (ROLE_CODES.includes(role as RoleCode)) {
      return role as RoleCode;
    }

    localStorage.removeItem(CURRENT_ROLE_KEY);
    return null;
  },

  /**
   * 设置当前角色
   */
  setCurrentRole(role: RoleCode): void {
    localStorage.setItem(CURRENT_ROLE_KEY, role);
  },

  /**
   * 获取可用角色列表
   */
  getAvailableRoles(): Role[] {
    return parseStorageJson<Role[]>(AVAILABLE_ROLES_KEY, []);
  },

  /**
   * 设置可用角色列表
   */
  setAvailableRoles(roles: Role[]): void {
    localStorage.setItem(AVAILABLE_ROLES_KEY, JSON.stringify(roles));
  },

  /**
   * 设置当前认证会话数据（不含 token）
   */
  setAuthSession(session: AuthSessionPayload): void {
    this.setUserInfo(session.user);
    this.setCurrentRole(session.current_role);
    this.setAvailableRoles(session.available_roles);
    this.setEffectivePermissions(session.effective_permissions);
  },

  /**
   * 获取当前生效权限列表
   */
  getEffectivePermissions(): string[] {
    return parseStorageJson<string[]>(EFFECTIVE_PERMISSIONS_KEY, []);
  },

  /**
   * 设置当前生效权限列表
   */
  setEffectivePermissions(permissionCodes: string[]): void {
    localStorage.setItem(EFFECTIVE_PERMISSIONS_KEY, JSON.stringify(permissionCodes));
  },

  /**
   * 清除所有存储
   */
  clearAll(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_INFO_KEY);
    localStorage.removeItem(CURRENT_ROLE_KEY);
    localStorage.removeItem(AVAILABLE_ROLES_KEY);
    localStorage.removeItem(EFFECTIVE_PERMISSIONS_KEY);
  },
};
