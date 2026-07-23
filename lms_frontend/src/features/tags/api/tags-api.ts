import { apiClient } from '@/lib/api-client';
import { buildQueryString } from '@/lib/api-utils';
import type { Tag, TagType } from '@/types/common';
import type {
  MergeTagPayload,
  ReorderSpaceTagsPayload,
  TagMutationPayload,
} from '@/types/tag-api';

export interface GetTagsParams {
  tag_type?: TagType;
  search?: string;
  limit?: number;
  applicable_to?: 'knowledge' | 'question';
}

export const getTags = ({
  tag_type,
  search,
  limit = 50,
  applicable_to,
}: GetTagsParams = {}) =>
  apiClient.get<Tag[]>(
    `/tags/${buildQueryString({ tag_type, search, limit, applicable_to })}`,
  );

export const createTag = (data: TagMutationPayload) => apiClient.post<Tag>('/tags/', data);

export const updateTag = ({ id, data }: { id: number; data: Partial<TagMutationPayload> }) =>
  apiClient.patch<Tag>(`/tags/${id}/`, data);

export const deleteTag = (id: number) => apiClient.delete(`/tags/${id}/`);

export const mergeTags = (data: MergeTagPayload) => apiClient.post<Tag>('/tags/merge/', data);

export const reorderSpaceTags = (data: ReorderSpaceTagsPayload) =>
  apiClient.post('/tags/reorder/', data);
