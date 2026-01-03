import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString, buildPaginationParams } from '@/lib/api-utils';
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
 * 使用专属的学员接口 /knowledge/student/，强制只返回已发布的知识文档。
 * 即使用户同时拥有管理员角色，此接口也只返回已发布内容。
 * 
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
      const queryParams = {
        ...buildPaginationParams(page, pageSize),
        ...(knowledge_type && { knowledge_type }),
        ...(line_type_id && { line_type_id: String(line_type_id) }),
        ...(system_tag_id && { system_tag_id: String(system_tag_id) }),
        ...(operation_tag_id && { operation_tag_id: String(operation_tag_id) }),
        ...(search && { search }),
      };
      const queryString = buildQueryString(queryParams);
      // 使用学员专属接口，强制只返回已发布的知识
      return apiClient.get<PaginatedResponse<KnowledgeListItem>>(`/knowledge/student${queryString}`);
    },
  });
};

