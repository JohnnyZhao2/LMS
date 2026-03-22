import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString } from '@/lib/api-utils';
import { useCurrentRole } from '@/hooks/use-current-role';
import type { Tag, TagType } from '@/types/api';

/**
 * 获取标签列表参数
 */
interface GetTagsParams {
  /** 标签类型 */
  tag_type?: TagType;
  /** 搜索关键词 */
  search?: string;
  /** 返回数量限制 */
  limit?: number;
  /** 只返回启用的标签 */
  active_only?: boolean;
}

/**
 * 获取标签列表
 */
export const useTags = (params: GetTagsParams = {}) => {
  const currentRole = useCurrentRole();
  const { tag_type, search, limit = 50, active_only = true } = params;

  return useQuery({
    queryKey: ['tags', currentRole ?? 'UNKNOWN', tag_type, search, limit, active_only],
    queryFn: () => {
      const queryParams = {
        ...(tag_type && { tag_type }),
        ...(search && { search }),
        ...(limit && { limit: String(limit) }),
        active_only: String(active_only),
      };
      const queryString = buildQueryString(queryParams);
      return apiClient.get<Tag[]>(`/knowledge/tags${queryString}`);
    },
    staleTime: 2 * 60 * 1000, // 2分钟内不重新获取
    enabled: currentRole !== null,
  });
};

/**
 * 获取条线类型标签列表
 */
export const useLineTypeTags = (search?: string) => {
  return useTags({ tag_type: 'LINE', search });
};

/**
 * 获取知识标签列表
 */
export const useKnowledgeTags = (search?: string) => {
  return useTags({ tag_type: 'TAG', search });
};

/**
 * 创建标签请求
 */
interface CreateTagRequest {
  name: string;
  tag_type: TagType;
  sort_order?: number;
  is_active?: boolean;
}

/**
 * 创建标签
 */
export const useCreateTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTagRequest) => 
      apiClient.post<Tag>('/knowledge/tags/create/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
};
