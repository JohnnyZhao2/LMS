import { config } from '@/config/app-config';
import { tokenStorage } from '@/lib/token-storage';
import { z, type ZodType } from 'zod';

/** 统一 API 响应 envelope */
const apiResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  data: z.unknown(),
});

/** API 错误 */
export class ApiError extends Error {
  status: number;
  statusText: string;
  code?: string;
  data?: unknown;

  constructor(status: number, statusText: string, data?: unknown) {
    const errorData =
      data && typeof data === 'object'
        ? (data as { code?: string; message?: string })
        : undefined;
    super(errorData?.message ?? `API Error: ${status} ${statusText}`);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.code = errorData?.code;
    this.data = data;
  }
}

/** API 请求选项 */
interface ApiRequestOptions<T = unknown> extends RequestInit {
  skipAuth?: boolean;
  schema?: ZodType<T>;
}

/**
 * API 客户端。
 * 公共管道：buildRequest → sendWithRefresh → parseError；上层解析 JSON / Blob。
 */
class ApiClient {
  private baseURL: string;
  private refreshPromise: Promise<void> | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /** 刷新 access token（单飞） */
  private async refreshToken(): Promise<void> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      const response = await fetch(`${this.baseURL}/auth/refresh/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) await this.parseError(response);
      const envelope = apiResponseSchema.parse(await response.json());
      tokenStorage.setAccessTokenPayload(
        z.object({ access_token: z.string().min(1) }).parse(envelope.data),
      );
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

  /** 序列化请求体 */
  private buildBody(data?: unknown): BodyInit | undefined {
    if (typeof FormData !== 'undefined' && data instanceof FormData) return data;
    return data ? JSON.stringify(data) : undefined;
  }

  /** 组装 URL / headers / fetchInit */
  private buildRequest(
    endpoint: string,
    options: ApiRequestOptions = {},
  ) {
    const skipAuth = options.skipAuth ?? false;
    const fetchOptions = { ...options };
    delete fetchOptions.skipAuth;
    delete fetchOptions.schema;

    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseURL}${endpoint}`;
    const isFormData =
      typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData;
    const headers = new Headers(fetchOptions.headers);

    if (isFormData) {
      headers.delete('Content-Type');
    } else if (fetchOptions.body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (!skipAuth) {
      const token = tokenStorage.getAccessToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }

    return {
      url,
      skipAuth,
      fetchInit: { ...fetchOptions, credentials: 'include' as const, headers },
    };
  }

  /** 发送请求；401 时刷新后重放一次 */
  private async sendWithRefresh(
    url: string,
    fetchInit: RequestInit,
    skipAuth: boolean,
  ): Promise<Response> {
    const headers = new Headers(fetchInit.headers);
    let response = await fetch(url, { ...fetchInit, headers });

    if (response.status === 401 && !skipAuth) {
      await this.refreshToken();
      const token = tokenStorage.getAccessToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      response = await fetch(url, { ...fetchInit, headers });
    }
    return response;
  }

  /** 解析错误响应并抛出 ApiError */
  private async parseError(response: Response): Promise<never> {
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

  /** 公共发送：认证 / 刷新 / 错误解析 */
  private async send(
    endpoint: string,
    options: ApiRequestOptions = {},
  ): Promise<Response> {
    const built = this.buildRequest(endpoint, options);
    const response = await this.sendWithRefresh(
      built.url,
      built.fetchInit,
      built.skipAuth,
    );
    if (!response.ok) await this.parseError(response);
    return response;
  }

  /** JSON 请求，解包 envelope.data */
  async request<T>(endpoint: string, options: ApiRequestOptions<T> = {}): Promise<T> {
    const { schema } = options;
    const response = await this.send(endpoint, options);
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return schema ? schema.parse(null) : (null as T);
    }
    const envelope = apiResponseSchema.parse(await response.json());
    return schema ? schema.parse(envelope.data) : (envelope.data as T);
  }

  get<T>(endpoint: string, options?: ApiRequestOptions<T>) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, data?: unknown, options?: ApiRequestOptions<T>) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: this.buildBody(data),
    });
  }

  put<T>(endpoint: string, data?: unknown, options?: ApiRequestOptions<T>) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: this.buildBody(data),
    });
  }

  patch<T>(endpoint: string, data?: unknown, options?: ApiRequestOptions<T>) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: this.buildBody(data),
    });
  }

  delete<T>(endpoint: string, options?: ApiRequestOptions<T>) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /** 下载二进制，复用同一管道 */
  async download(endpoint: string, options: ApiRequestOptions = {}): Promise<Blob> {
    const response = await this.send(endpoint, { method: 'GET', ...options });
    return response.blob();
  }
}

export const apiClient = new ApiClient(config.apiUrl);
