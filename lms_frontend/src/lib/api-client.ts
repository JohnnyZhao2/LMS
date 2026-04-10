import { config } from '@/config';
import { tokenStorage } from './token-storage';
import { ROUTES } from '@/config/routes';

/**
 * 统一 API 响应格式
 */
interface ApiResponse<T> {
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
interface ApiRequestOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * API 客户端
 */
class ApiClient {
  private baseURL: string;
  private refreshPromise: Promise<void> | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * 刷新 token
   */
  private async refreshToken(): Promise<void> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    this.refreshPromise = (async () => {
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

      const responseData = (await response.json()) as ApiResponse<{
        access_token: string;
        refresh_token: string;
      }>;
      tokenStorage.setTokens(
        responseData.data.access_token,
        responseData.data.refresh_token,
      );
    })();

    try {
      await this.refreshPromise;
    } catch (error) {
      tokenStorage.clearAll();
      throw error;
    } finally {
      this.refreshPromise = null;
    }
  }

  private buildBody(data?: unknown): BodyInit | undefined {
    if (typeof FormData !== 'undefined' && data instanceof FormData) {
      return data;
    }

    return data ? JSON.stringify(data) : undefined;
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

    const isFormData =
      typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData;

    // 准备请求头
    const headers: Record<string, string> = {};
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    // 合并现有 headers
    if (fetchOptions.headers) {
      const existingHeaders = fetchOptions.headers as Record<string, string>;
      Object.assign(headers, existingHeaders);
    }

    if (isFormData) {
      delete headers['Content-Type'];
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
        tokenStorage.clearAll();
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

    if (
      json &&
      typeof json === 'object' &&
      'code' in json &&
      'message' in json &&
      'data' in json
    ) {
      return (json as ApiResponse<T>).data;
    }

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
    const body = this.buildBody(data);
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body,
    });
  }

  /**
   * PUT 请求
   */
  put<T>(endpoint: string, data?: unknown, options?: ApiRequestOptions): Promise<T> {
    const body = this.buildBody(data);
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body,
    });
  }

  /**
   * PATCH 请求
   */
  patch<T>(endpoint: string, data?: unknown, options?: ApiRequestOptions): Promise<T> {
    const body = this.buildBody(data);
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body,
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
