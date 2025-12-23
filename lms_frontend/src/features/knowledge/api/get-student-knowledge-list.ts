import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { KnowledgeListItem, KnowledgeType, PaginatedResponse } from '@/types/api';

/**
 * 获取学员知识列表参数
 */
interface GetStudentKnowledgeListParams {
  /** 知识类型 */
  knowledge_type?: KnowledgeType;
  /** 条线类型ID */
  line_type_id?: number;
  /** 系统标签ID */
  system_tag_id?: number;
  /** 操作标签ID */
  operation_tag_id?: number;
  /** 搜索关键词 */
  search?: string;
  /** 页码 */
  page?: number;
  /** 每页数量 */
  pageSize?: number;
}

/**
 * 获取学员知识列表
 * 
 * 学员只能查看已发布的知识文档
 * @param params - 筛选参数
 */
export const useStudentKnowledgeList = (params: GetStudentKnowledgeListParams = {}) => {
  const {
    knowledge_type,
    line_type_id,
    system_tag_id,
    operation_tag_id,
    search,
    page = 1,
    pageSize = 20,
  } = params;

  return useQuery({
    queryKey: [
      'student-knowledge-list',
      knowledge_type,
      line_type_id,
      system_tag_id,
      operation_tag_id,
      search,
      page,
      pageSize,
    ],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (knowledge_type) searchParams.set('knowledge_type', knowledge_type);
      if (line_type_id) searchParams.set('line_type_id', String(line_type_id));
      if (system_tag_id) searchParams.set('system_tag_id', String(system_tag_id));
      if (operation_tag_id) searchParams.set('operation_tag_id', String(operation_tag_id));
      if (search) searchParams.set('search', search);
      searchParams.set('page', String(page));
      searchParams.set('page_size', String(pageSize));

      const queryString = searchParams.toString();
      return apiClient.get<PaginatedResponse<KnowledgeListItem>>(`/knowledge/${queryString ? `?${queryString}` : ''}`);
    },
  });
};

