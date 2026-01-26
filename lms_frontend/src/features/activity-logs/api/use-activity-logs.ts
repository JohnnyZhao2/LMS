import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse } from '@/types/common';
import type { ActivityLogPolicy, UserLog, ContentLog, OperationLog } from '../types';

/**
 * 获取用户日志列表
 */
export const useUserLogs = (page: number = 1, pageSize: number = 20) => {
  return useQuery({
    queryKey: ['user-logs', page, pageSize],
    queryFn: async () => {
      return await apiClient.get<PaginatedResponse<UserLog>>(
        `/logs/user/?page=${page}&page_size=${pageSize}`
      );
    },
    staleTime: 0,
    refetchOnMount: 'always',
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
        `/logs/content/?page=${page}&page_size=${pageSize}`
      );
    },
    staleTime: 0,
    refetchOnMount: 'always',
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
        `/logs/operation/?page=${page}&page_size=${pageSize}`
      );
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });
};

/**
 * 获取活动日志策略（超级用户）
 */
export const useActivityLogPolicies = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['activity-log-policies'],
    queryFn: async () => {
      return await apiClient.get<ActivityLogPolicy[]>(`/logs/policies/`);
    },
    enabled,
  });
};

/**
 * 更新活动日志策略（超级用户）
 */
export const useUpdateActivityLogPolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { key: string; enabled: boolean }) => {
      return apiClient.patch<ActivityLogPolicy>(`/logs/policies/`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-log-policies'] });
    },
  });
};
