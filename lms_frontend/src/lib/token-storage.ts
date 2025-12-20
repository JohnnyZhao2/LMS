import type { UserInfo, RoleCode, Role } from '@/types/api';

/**
 * Token 存储工具
 */
const ACCESS_TOKEN_KEY = 'lms_access_token';
const REFRESH_TOKEN_KEY = 'lms_refresh_token';
const USER_INFO_KEY = 'lms_user_info';
const CURRENT_ROLE_KEY = 'lms_current_role';
const AVAILABLE_ROLES_KEY = 'lms_available_roles';

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
   * 清除令牌
   */
  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
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
    const info = localStorage.getItem(USER_INFO_KEY);
    return info ? JSON.parse(info) : null;
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
    return localStorage.getItem(CURRENT_ROLE_KEY) as RoleCode | null;
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
    const roles = localStorage.getItem(AVAILABLE_ROLES_KEY);
    return roles ? JSON.parse(roles) : [];
  },

  /**
   * 设置可用角色列表
   */
  setAvailableRoles(roles: Role[]): void {
    localStorage.setItem(AVAILABLE_ROLES_KEY, JSON.stringify(roles));
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
  },
};

