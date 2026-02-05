import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ParseDocumentResponse } from '@/types/knowledge';

/**
 * 解析文档
 */
export const parseDocument = async (file: File): Promise<ParseDocumentResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<ParseDocumentResponse>(
    '/knowledge/parse-document/',
    formData,
  );
  return response;
};

/**
 * 文档解析 Hook
 */
export const useParseDocument = () => {
  return useMutation({
    mutationFn: parseDocument,
  });
};
