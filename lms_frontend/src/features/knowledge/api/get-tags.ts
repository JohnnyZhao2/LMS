import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Tag, TagType } from '@/types/api';

/**
 * 获取标签列表参数
 */
interface GetTagsParams {
  /** 标签类型 */
  tag_type?: TagType;
  /** 条线类型ID（用于级联筛选：获取该条线下知识使用的系统/操作标签） */
  line_type_id?: number;
  /** 搜索关键词 */
  search?: string;
  /** 返回数量限制 */
  limit?: number;
  /** 只返回启用的标签 */
  active_only?: boolean;
}

/**
 * 获取标签列表
 * 
 * 级联筛选：
 * - 当 tag_type=SYSTEM 且提供 line_type_id 时，返回该条线下知识使用的系统标签
 * - 当 tag_type=OPERATION 且提供 line_type_id 时，返回该条线下知识使用的操作标签
 */
export const useTags = (params: GetTagsParams = {}) => {
  const { tag_type, line_type_id, search, limit = 50, active_only = true } = params;

  return useQuery({
    queryKey: ['tags', tag_type, line_type_id, search, limit, active_only],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (tag_type) searchParams.set('tag_type', tag_type);
      if (line_type_id) searchParams.set('line_type_id', String(line_type_id));
      if (search) searchParams.set('search', search);
      if (limit) searchParams.set('limit', String(limit));
      searchParams.set('active_only', String(active_only));

      const queryString = searchParams.toString();
      const url = queryString 
        ? `/knowledge/tags/?${queryString}` 
        : `/knowledge/tags/`;
      return apiClient.get<Tag[]>(url);
    },
    staleTime: 2 * 60 * 1000, // 2分钟内不重新获取
  });
};

/**
 * 获取条线类型标签列表
 */
export const useLineTypeTags = (search?: string) => {
  return useTags({ tag_type: 'LINE', search });
};

/**
 * 获取系统标签列表
 * @param lineTypeId - 可选，如果提供则返回该条线下知识使用的系统标签（级联筛选）
 */
export const useSystemTags = (lineTypeId?: number, search?: string) => {
  return useTags({ tag_type: 'SYSTEM', line_type_id: lineTypeId, search });
};

/**
 * 获取操作标签列表
 * @param lineTypeId - 可选，如果提供则返回该条线下知识使用的操作标签（级联筛选）
 */
export const useOperationTags = (lineTypeId?: number, search?: string) => {
  return useTags({ tag_type: 'OPERATION', line_type_id: lineTypeId, search });
};

