import type { AccessTokenPayload } from '@/types/auth';

let accessToken: string | null = null;

export const tokenStorage = {
  /**
   * 获取访问令牌
   */
  getAccessToken(): string | null {
    return accessToken;
  },

  /**
   * 设置令牌
   */
  setAccessToken(nextAccessToken: string): void {
    accessToken = nextAccessToken;
  },

  setAccessTokenPayload({ access_token }: AccessTokenPayload): void {
    this.setAccessToken(access_token);
  },

  /**
   * 清除所有存储
   */
  clearTokens(): void {
    accessToken = null;
  },
};
