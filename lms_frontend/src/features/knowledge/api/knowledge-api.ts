import { apiClient } from '@/lib/api-client';
import { buildPaginationParams, buildQueryString } from '@/lib/api-utils';
import type { PaginatedResponse } from '@/types/common';
import type {
  KnowledgeCreateRequest,
  KnowledgeDetail,
  KnowledgeListItem,
  KnowledgeUpdateRequest,
  ParseDocumentResponse,
} from '@/types/knowledge';

export interface GetKnowledgeListParams {
  space_tag_id?: number;
  tag_id?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}

/**
 * 增加知识阅读次数响应
 */
export interface IncrementViewCountResponse {
  view_count: number;
}

export const getKnowledgeList = (
  { space_tag_id, tag_id, search, pageSize = 20 }: GetKnowledgeListParams = {},
  page = 1,
) =>
  apiClient.get<PaginatedResponse<KnowledgeListItem>>(
    `/knowledge${buildQueryString({
      ...buildPaginationParams(page, pageSize),
      ...(space_tag_id && { space_tag_id: String(space_tag_id) }),
      ...(tag_id && { tag_id: String(tag_id) }),
      ...(search && { search }),
    })}`,
  );

export const getKnowledgeDetail = (knowledgeId: number) =>
  apiClient.get<KnowledgeDetail>(`/knowledge/${knowledgeId}/`);

export const getTaskKnowledgeDetail = (taskKnowledgeId: number) =>
  apiClient.get<KnowledgeDetail>(`/knowledge/task/${taskKnowledgeId}/`);

export const createKnowledge = (data: KnowledgeCreateRequest) =>
  apiClient.post<KnowledgeDetail>('/knowledge/', data);

export const updateKnowledge = ({ id, data }: { id: number; data: KnowledgeUpdateRequest }) =>
  apiClient.patch<KnowledgeDetail>(`/knowledge/${id}/`, data);

export const deleteKnowledge = (id: number) => apiClient.delete(`/knowledge/${id}/`);

/**
 * 增加知识阅读次数（学员查看详情时调用）
 */
export const incrementViewCount = (id: number) =>
  apiClient.post<IncrementViewCountResponse>(`/knowledge/${id}/view/`);

export const parseDocument = async (file: File): Promise<ParseDocumentResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post<ParseDocumentResponse>('/knowledge/parse-document/', formData);
};
