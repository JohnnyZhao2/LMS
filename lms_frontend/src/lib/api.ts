/**
 * API Client
 * Centralized HTTP client with JWT authentication and automatic token refresh
 * Requirements: 1.6, 1.7, 23.1, 23.3
 */

import { config } from '@/config';
import { API_ENDPOINTS } from '@/config/api';

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Network error class
export class NetworkError extends Error {
  constructor(message: string = '网络连接失败，请检查网络设置') {
    super(message);
    this.name = 'NetworkError';
  }
}

// Token storage utilities
const tokenStorage = {
  getAccessToken: (): string | null => {
    return localStorage.getItem(config.tokenKey);
  },
  
  setAccessToken: (token: string): void => {
    localStorage.setItem(config.tokenKey, token);
  },
  
  getRefreshToken: (): string | null => {
    return localStorage.getItem(config.refreshTokenKey);
  },
  
  setRefreshToken: (token: string): void => {
    localStorage.setItem(config.refreshTokenKey, token);
  },
  
  clearTokens: (): void => {
    localStorage.removeItem(config.tokenKey);
    localStorage.removeItem(config.refreshTokenKey);
    localStorage.removeItem(config.userKey);
    localStorage.removeItem(config.currentRoleKey);
  },
};

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempt to refresh the access token using the refresh token
 * Requirements: 1.6 - Auto refresh when token expires
 */
async function refreshAccessToken(): Promise<boolean> {
  // If already refreshing, wait for that to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }
  
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) {
    return false;
  }
  
  isRefreshing = true;
  
  refreshPromise = (async () => {
    try {
      const response = await fetch(API_ENDPOINTS.auth.refresh, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      
      if (!response.ok) {
        // Refresh token is also invalid/expired
        tokenStorage.clearTokens();
        return false;
      }
      
      const data = await response.json();
      tokenStorage.setAccessToken(data.access_token);
      
      // If a new refresh token is provided, update it
      if (data.refresh_token) {
        tokenStorage.setRefreshToken(data.refresh_token);
      }
      
      return true;
    } catch {
      tokenStorage.clearTokens();
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  
  return refreshPromise;
}

// Request options interface
interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
}

/**
 * Main API request function
 * Handles authentication, error handling, and automatic token refresh
 */
export async function apiRequest<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, skipAuth = false, ...fetchOptions } = options;
  
  // Build headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };
  
  // Add authorization header if not skipped
  if (!skipAuth) {
    const accessToken = tokenStorage.getAccessToken();
    if (accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
    }
  }
  
  // Build request config
  const requestConfig: RequestInit = {
    ...fetchOptions,
    headers,
  };
  
  // Add body if present
  if (body !== undefined) {
    requestConfig.body = JSON.stringify(body);
  }
  
  try {
    let response = await fetch(url, requestConfig);
    
    // Handle 401 Unauthorized - attempt token refresh
    // Requirements: 1.6 - Auto refresh when token expires
    if (response.status === 401 && !skipAuth) {
      const refreshed = await refreshAccessToken();
      
      if (refreshed) {
        // Retry the request with new token
        const newAccessToken = tokenStorage.getAccessToken();
        if (newAccessToken) {
          (headers as Record<string, string>)['Authorization'] = `Bearer ${newAccessToken}`;
        }
        response = await fetch(url, { ...requestConfig, headers });
      } else {
        // Requirements: 1.7 - Redirect to login if refresh fails
        tokenStorage.clearTokens();
        window.location.href = '/login';
        throw new ApiError('认证已过期，请重新登录', 401, 'AUTH_EXPIRED');
      }
    }
    
    // Handle other error responses
    if (!response.ok) {
      let errorData: { message?: string; code?: string; detail?: string } = {};
      
      try {
        errorData = await response.json();
      } catch {
        // Response body is not JSON
      }
      
      const errorMessage = errorData.message || errorData.detail || getDefaultErrorMessage(response.status);
      throw new ApiError(errorMessage, response.status, errorData.code);
    }
    
    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return undefined as T;
    }
    
    // Parse and return JSON response
    return await response.json();
  } catch (error) {
    // Re-throw API errors
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Handle network errors
    // Requirements: 23.3 - Show clear error messages
    throw new NetworkError();
  }
}

/**
 * Get default error message based on HTTP status code
 */
function getDefaultErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return '请求参数错误';
    case 401:
      return '认证失败，请重新登录';
    case 403:
      return '没有权限执行此操作';
    case 404:
      return '请求的资源不存在';
    case 409:
      return '资源冲突，请刷新后重试';
    case 422:
      return '数据验证失败';
    case 429:
      return '请求过于频繁，请稍后重试';
    case 500:
      return '服务器内部错误';
    case 502:
      return '网关错误';
    case 503:
      return '服务暂时不可用';
    default:
      return '请求失败，请稍后重试';
  }
}

// Convenience methods for common HTTP methods
export const api = {
  get: <T>(url: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(url, { ...options, method: 'GET' }),
    
  post: <T>(url: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(url, { ...options, method: 'POST', body }),
    
  put: <T>(url: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(url, { ...options, method: 'PUT', body }),
    
  patch: <T>(url: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(url, { ...options, method: 'PATCH', body }),
    
  delete: <T>(url: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(url, { ...options, method: 'DELETE' }),
};

// Export token storage for auth module
export { tokenStorage };
