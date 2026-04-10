import { ApiError } from '@/lib/api-client';
import { toast } from 'sonner';

/**
 * 后端错误响应格式
 */
interface ErrorResponse {
  code?: string;
  message?: string;
  details?: Record<string, string[] | string>;
  detail?: string;
  [key: string]: unknown;
}

/**
 * 从后端错误响应中提取错误消息
 * 
 * @param errorData 后端返回的错误数据
 * @returns 用户友好的错误消息字符串
 */
function extractErrorMessage(errorData: unknown): string {
  if (!errorData || typeof errorData !== 'object') {
    return '操作失败，请稍后重试';
  }

  const error = errorData as ErrorResponse;

  // 优先使用 message 字段（后端自定义错误格式）
  if (error.message && typeof error.message === 'string') {
    return error.message;
  }

  // 其次使用 detail 字段（DRF 标准格式）
  if (error.detail && typeof error.detail === 'string') {
    return error.detail;
  }

  // 如果有 details 字段（字段验证错误），组合显示
  if (error.details && typeof error.details === 'object') {
    const detailMessages: string[] = [];
    for (const [, messages] of Object.entries(error.details)) {
      if (Array.isArray(messages)) {
        detailMessages.push(`${messages.join(', ')}`);
      } else if (typeof messages === 'string') {
        detailMessages.push(messages);
      }
    }
    if (detailMessages.length > 0) {
      return detailMessages.join('; ');
    }
  }

  // 如果都没有，返回默认消息
  return '操作失败，请稍后重试';
}

/**
 * 显示 API 错误消息
 * 
 * @param error 错误对象
 * @param defaultMessage 默认错误消息
 */
export function showApiError(error: unknown, defaultMessage?: string): void {
  if (error instanceof ApiError) {
    // 401 和 403 错误通常由认证/权限组件处理，这里不显示
    if (error.status === 401 || error.status === 403) {
      return;
    }

    const errorMessage = extractErrorMessage(error.data);
    toast.error(errorMessage || defaultMessage || '操作失败');
  } else {
    toast.error(defaultMessage || '网络错误，请稍后重试');
  }
}
