import { config } from '@/config/app-config';
import { tokenStorage } from '@/lib/token-storage';
import { z, type ZodType } from 'zod';

/**
 * 统一 API 响应格式
 */
const apiResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  data: z.unknown(),
});

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
interface ApiRequestOptions<T = unknown> extends RequestInit {
  skipAuth?: boolean;
  schema?: ZodType<T>;
}

/**
 * API 客户端。
 *
 * 后端统一返回 `{ code, message, data }`，调用方只拿 `data`。401 时集中刷新
 * token，页面层不需要各自处理刷新逻辑。
 */
class ApiClient {
  private baseURL: string;
  // 多个请求同时遇到 401 时，共享同一次 refresh，避免刷新令牌被并发消费。
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

    this.refreshPromise = (async () => {
      const response = await fetch(`${this.baseURL}/auth/refresh/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const responseData = apiResponseSchema.parse(await response.json());
      const accessTokenPayload = z.object({ access_token: z.string().min(1) }).parse(responseData.data);
      tokenStorage.setAccessTokenPayload(accessTokenPayload);
    })();

    try {
      await this.refreshPromise;
    } catch (error) {
      tokenStorage.clearTokens();
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
    options: ApiRequestOptions<T> = {},
  ): Promise<T> {
    const { skipAuth = false, schema, ...fetchOptions } = options;
    const url = `${this.baseURL}${endpoint}`;

    const isFormData =
      typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData;

    // FormData 不能手动设置 Content-Type，浏览器需要自动写入 boundary。
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
      credentials: 'include',
      headers,
    });

    // access token 过期时刷新后重放原请求；刷新失败只清理令牌，路由由认证上下文处理。
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
          credentials: 'include',
          headers,
        });
      } catch (error) {
        tokenStorage.clearTokens();
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
      return schema ? schema.parse(null) : null as T;
    }

    const envelope = apiResponseSchema.parse(await response.json());
    return schema ? schema.parse(envelope.data) : envelope.data as T;
  }

  /**
   * GET 请求
   */
  get<T>(endpoint: string, options?: ApiRequestOptions<T>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST 请求
   */
  post<T>(endpoint: string, data?: unknown, options?: ApiRequestOptions<T>): Promise<T> {
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
  put<T>(endpoint: string, data?: unknown, options?: ApiRequestOptions<T>): Promise<T> {
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
  patch<T>(endpoint: string, data?: unknown, options?: ApiRequestOptions<T>): Promise<T> {
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
  delete<T>(endpoint: string, options?: ApiRequestOptions<T>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * 下载二进制文件（Excel 等）
   */
  async download(endpoint: string, options?: ApiRequestOptions): Promise<Blob> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      ...(options?.headers as Record<string, string> | undefined),
    };

    if (!options?.skipAuth) {
      const accessToken = tokenStorage.getAccessToken();
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
    }

    let response = await fetch(url, {
      ...options,
      method: options?.method || 'GET',
      credentials: 'include',
      headers,
    });

    if (response.status === 401 && !options?.skipAuth) {
      await this.refreshToken();
      const accessToken = tokenStorage.getAccessToken();
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      response = await fetch(url, {
        ...options,
        method: options?.method || 'GET',
        credentials: 'include',
        headers,
      });
    }

    if (!response.ok) {
      let errorData: unknown;
      try {
        errorData = await response.json();
      } catch {
        errorData = undefined;
      }
      throw new ApiError(response.status, response.statusText, errorData);
    }

    return response.blob();
  }
}

// 导出单例
export const apiClient = new ApiClient(config.apiUrl);
