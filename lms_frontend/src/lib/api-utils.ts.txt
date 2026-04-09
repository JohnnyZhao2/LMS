/**
 * API 工具函数
 */

/**
 * 构建查询参数字符串
 * @param params - 查询参数对象
 * @returns 查询参数字符串（包含?前缀，如果为空则返回空字符串）
 */
export function buildQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * 构建查询参数字符串（不包含?前缀）
 * @param params - 查询参数对象
 * @returns 查询参数字符串（不包含?前缀）
 */
export function buildQueryParams(params: Record<string, string | number | boolean | undefined | null>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  
  return searchParams.toString();
}

/**
 * 分页参数接口
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/**
 * 构建标准分页查询参数
 * @param page - 页码（默认1）
 * @param pageSize - 每页数量（默认20）
 * @returns 包含page和page_size的查询参数对象
 */
export function buildPaginationParams(page = 1, pageSize = 20): Record<string, string> {
  return {
    page: String(page),
    page_size: String(pageSize),
  };
}
