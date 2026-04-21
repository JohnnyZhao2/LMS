import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ParseDocumentResponse } from '@/types/knowledge';

const parseDocument = async (file: File): Promise<ParseDocumentResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<ParseDocumentResponse>(
    '/knowledge/parse-document/',
    formData,
  );
  return response;
};

export const useParseDocument = () => {
  return useMutation({
    mutationFn: parseDocument,
  });
};
