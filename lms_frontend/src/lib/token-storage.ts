/**
 * Token 存储工具
 */
import type { TokenPair } from '@/types/auth';

const ACCESS_TOKEN_KEY = 'lms_access_token';
const REFRESH_TOKEN_KEY = 'lms_refresh_token';
const IMPERSONATION_ACCESS_KEY = 'lms_impersonation_access_token';
const IMPERSONATION_REFRESH_KEY = 'lms_impersonation_refresh_token';

const hasSessionStorage = (): boolean => typeof sessionStorage !== 'undefined';

export const tokenStorage = {
  /**
   * 当前标签页是否处于超管扮演态
   */
  isImpersonating(): boolean {
    if (!hasSessionStorage()) {
      return false;
    }
    return Boolean(
      sessionStorage.getItem(IMPERSONATION_ACCESS_KEY)
      || sessionStorage.getItem(IMPERSONATION_REFRESH_KEY),
    );
  },

  /**
   * 获取访问令牌（优先读取当前标签页扮演会话）
   */
  getAccessToken(): string | null {
    if (this.isImpersonating()) {
      return sessionStorage.getItem(IMPERSONATION_ACCESS_KEY);
    }
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  /**
   * 获取刷新令牌（优先读取当前标签页扮演会话）
   */
  getRefreshToken(): string | null {
    if (this.isImpersonating()) {
      return sessionStorage.getItem(IMPERSONATION_REFRESH_KEY);
    }
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  /**
   * 读取主登录态（localStorage）中的刷新令牌
   */
  getPrimaryRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  /**
   * 设置令牌（扮演态仅更新当前标签页 sessionStorage，不覆盖超管登录态）
   */
  setTokens(accessToken: string, refreshToken: string): void {
    if (this.isImpersonating()) {
      sessionStorage.setItem(IMPERSONATION_ACCESS_KEY, accessToken);
      sessionStorage.setItem(IMPERSONATION_REFRESH_KEY, refreshToken);
      return;
    }
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  setTokenPair({ access_token, refresh_token }: TokenPair): void {
    this.setTokens(access_token, refresh_token);
  },

  setImpersonationTokenPair({ access_token, refresh_token }: TokenPair): void {
    if (!hasSessionStorage()) {
      return;
    }
    sessionStorage.setItem(IMPERSONATION_ACCESS_KEY, access_token);
    sessionStorage.setItem(IMPERSONATION_REFRESH_KEY, refresh_token);
  },

  clearImpersonationTokens(): void {
    if (!hasSessionStorage()) {
      return;
    }
    sessionStorage.removeItem(IMPERSONATION_ACCESS_KEY);
    sessionStorage.removeItem(IMPERSONATION_REFRESH_KEY);
  },

  /**
   * 检查是否已登录
   */
  hasTokens(): boolean {
    return !!this.getAccessToken() && !!this.getRefreshToken();
  },

  /**
   * 清除所有存储
   */
  clearTokens(): void {
    this.clearImpersonationTokens();
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};
