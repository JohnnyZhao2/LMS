import { ApiError } from '@/lib/api-client';
import { toast } from 'sonner';

interface ErrorResponse {
  code?: string;
  message?: string;
  details?: unknown;
  detail?: unknown;
  [key: string]: unknown;
}

interface ErrorToastContent {
  title: string;
  description?: string;
}

const handledErrors = new WeakSet<object>();

function collectMessages(value: unknown): string[] {
  if (typeof value === 'string') {
    const text = value.trim();
    return text ? [text] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectMessages);
  }

  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(collectMessages);
  }

  return [];
}

function uniqueMessages(messages: string[]): string[] {
  const seen = new Set<string>();
  return messages.filter((message) => {
    if (seen.has(message)) {
      return false;
    }
    seen.add(message);
    return true;
  });
}

function extractErrorContent(errorData: unknown, fallbackMessage?: string): ErrorToastContent {
  const fallback = fallbackMessage || '操作失败，请稍后重试';
  if (!errorData) {
    return { title: fallback };
  }

  if (typeof errorData === 'string') {
    return { title: errorData };
  }

  if (Array.isArray(errorData)) {
    const messages = uniqueMessages(collectMessages(errorData));
    return {
      title: messages[0] || fallback,
      description: messages.slice(1).join('；') || undefined,
    };
  }

  if (typeof errorData !== 'object') {
    return { title: fallback };
  }

  const error = errorData as ErrorResponse;
  const detailMessages = uniqueMessages([
    ...collectMessages(error.details),
    ...collectMessages(error.detail),
  ]);
  const businessMessage = typeof error.message === 'string' ? error.message.trim() : '';
  const title = detailMessages[0] || businessMessage || fallback;
  const descriptionParts = [
    ...detailMessages.slice(1),
    ...(businessMessage && businessMessage !== title ? [businessMessage] : []),
  ];

  return {
    title,
    description: descriptionParts.join('；') || undefined,
  };
}

export function getApiErrorContent(error: unknown, defaultMessage?: string): ErrorToastContent {
  if (error instanceof ApiError) {
    return extractErrorContent(error.data, defaultMessage);
  }

  if (error instanceof Error && error.message.trim()) {
    return { title: error.message.trim() };
  }

  return { title: defaultMessage || '网络错误，请稍后重试' };
}

export function showApiError(error: unknown, defaultMessage?: string): void {
  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
    return;
  }

  if (error && typeof error === 'object') {
    if (handledErrors.has(error)) {
      return;
    }
    handledErrors.add(error);
  }

  const { title, description } = getApiErrorContent(error, defaultMessage);
  toast.error(title, {
    description,
  });
}
