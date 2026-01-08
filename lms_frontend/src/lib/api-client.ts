import { config } from '@/config';
import { tokenStorage } from './token-storage';
import { ROUTES } from '@/config/routes';

/**
 * 统一 API 响应格式
 */
export interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

/**
 * API 错误类
 */
export class ApiError extends Error {
  status: number;
  statusText: string;
  code?: string;
  data?: unknown;

  constructor(status: number, statusText: string, data?: unknown) {
    // 尝试从响应数据中提取错误信息
    let message = `API Error: ${status} ${statusText}`;
    let code: string | undefined;
    
    if (data && typeof data === 'object') {
      const errorData = data as { code?: string; message?: string };
      if (errorData.message) {
        message = errorData.message;
      }
      code = errorData.code;
    }
    
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.code = code;
    this.data = data;
  }
}

/**
 * API 请求选项
 */
export interface ApiRequestOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * API 客户端
 */
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * 刷新 token
   */
  private async refreshToken(): Promise<void> {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      tokenStorage.setTokens(data.access_token, data.refresh_token);
    } catch (error) {
      tokenStorage.clearTokens();
      throw error;
    }
  }

  /**
   * 发送请求
   */
  async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {},
  ): Promise<T> {
    const { skipAuth = false, ...fetchOptions } = options;
    const url = `${this.baseURL}${endpoint}`;

    // 准备请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 合并现有 headers
    if (fetchOptions.headers) {
      const existingHeaders = fetchOptions.headers as Record<string, string>;
      Object.assign(headers, existingHeaders);
    }

    // 添加认证头
    if (!skipAuth) {
      const accessToken = tokenStorage.getAccessToken();
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
    }

    // 发送请求
    let response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    // 处理 401 错误，尝试刷新 token
    if (response.status === 401 && !skipAuth) {
      try {
        await this.refreshToken();
        // 重新发送请求
        const accessToken = tokenStorage.getAccessToken();
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }
        response = await fetch(url, {
          ...fetchOptions,
          headers,
        });
      } catch (error) {
        // 刷新失败，跳转到登录页
        tokenStorage.clearTokens();
        window.location.href = ROUTES.LOGIN;
        throw error;
      }
    }

    // 处理错误响应
    if (!response.ok) {
      let errorData: unknown;
      try {
        const text = await response.text();
        try {
          errorData = JSON.parse(text);
        } catch {
          errorData = text;
        }
      } catch {
        errorData = undefined;
      }
      throw new ApiError(response.status, response.statusText, errorData);
    }

    // 处理空响应
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return null as T;
    }

    const json = await response.json();
    
    // 自动解包统一响应格式 { code, message, data }
    if (json && typeof json === 'object' && 'code' in json && 'data' in json) {
      return json.data as T;
    }
    
    // 兼容旧格式（直接返回数据）
    return json as T;
  }

  /**
   * GET 请求
   */
  get<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST 请求
   */
  post<T>(endpoint: string, data?: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT 请求
   */
  put<T>(endpoint: string, data?: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH 请求
   */
  patch<T>(endpoint: string, data?: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE 请求
   */
  delete<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// 导出单例
export const apiClient = new ApiClient(config.apiUrl);
