import { apiClient } from '@/lib/api-client';
import type { OneAccountAuthorizeUrlResponse } from '@/types/auth';

/**
 * 获取 OneAccount 扫码登录授权地址。
 */
export const getOneAccountAuthorizeUrl = () =>
  apiClient.get<OneAccountAuthorizeUrlResponse>(
    '/auth/one-account/authorize-url/',
    { skipAuth: true },
  );
