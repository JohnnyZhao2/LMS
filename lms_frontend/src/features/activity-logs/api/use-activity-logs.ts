import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { UserLog, ContentLog, OperationLog } from '../types';
import type { PaginatedResponse } from '@/types/common';

/**
 * 获取用户日志列表
 */
export const useUserLogs = (page: number = 1, pageSize: number = 20) => {
  return useQuery({
    queryKey: ['user-logs', page, pageSize],
    queryFn: async () => {
      return await apiClient.get<PaginatedResponse<UserLog>>(
        `/api/logs/user/?page=${page}&page_size=${pageSize}`
      );
    },
  });
};

/**
 * 获取内容日志列表
 */
export const useContentLogs = (page: number = 1, pageSize: number = 20) => {
  return useQuery({
    queryKey: ['content-logs', page, pageSize],
    queryFn: async () => {
      return await apiClient.get<PaginatedResponse<ContentLog>>(
        `/api/logs/content/?page=${page}&page_size=${pageSize}`
      );
    },
  });
};

/**
 * 获取操作日志列表
 */
export const useOperationLogs = (page: number = 1, pageSize: number = 20) => {
  return useQuery({
    queryKey: ['operation-logs', page, pageSize],
    queryFn: async () => {
      return await apiClient.get<PaginatedResponse<OperationLog>>(
        `/api/logs/operation/?page=${page}&page_size=${pageSize}`
      );
    },
  });
};

