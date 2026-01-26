import React, { useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DataTable, CellWithAvatar, CellStatus } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { ContentPanel } from '@/components/ui';
import {
  useUserLogs,
  useContentLogs,
  useOperationLogs,
} from '../api/use-activity-logs';
import type { UserLog, ContentLog, OperationLog } from '../types';

/**
 * 活动记录面板组件
 *
 * 功能：
 * - 展示用户日志、内容日志、操作日志
 * - Tab切换不同类型的日志
 * - 使用DataTable展示日志详情
 */
export const ActivityLogsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('user');

  // 分页状态
  const [userPagination, setUserPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [contentPagination, setContentPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [operationPagination, setOperationPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const { data: userLogsData, isLoading: userLogsLoading } = useUserLogs(
    userPagination.pageIndex + 1,
    userPagination.pageSize
  );
  const { data: contentLogsData, isLoading: contentLogsLoading } = useContentLogs(
    contentPagination.pageIndex + 1,
    contentPagination.pageSize
  );
  const { data: operationLogsData, isLoading: operationLogsLoading } = useOperationLogs(
    operationPagination.pageIndex + 1,
    operationPagination.pageSize
  );

  const userLogs = userLogsData?.results || [];
  const contentLogs = contentLogsData?.results || [];
  const operationLogs = operationLogsData?.results || [];

  // 辅助函数
  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      login: '登录系统',
      logout: '登出系统',
      password_change: '修改密码',
      login_failed: '登录失败',
      role_assigned: '角色分配',
      create: '创建',
      update: '修改',
      delete: '删除',
      publish: '发布',
      create_and_assign: '创建并分配任务',
      batch_grade: '批量评分',
    };
    return labels[action] || action;
  };

  const getContentTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      knowledge: '知识文档',
      quiz: '试卷',
      question: '题目',
      assignment: '作业',
    };
    return labels[type] || type;
  };

  const getOperationTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      task_management: '任务管理',
      grading: '评分操作',
      spot_check: '抽查记录',
      data_export: '数据导出',
    };
    return labels[type] || type;
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // 用户日志列定义
  const userLogColumns: ColumnDef<UserLog>[] = [
    {
      header: '时间',
      accessorKey: 'created_at',
      size: 180,
    },
    {
      header: '用户',
      id: 'user',
      size: 200,
      cell: ({ row }) => (
        <CellWithAvatar
          name={row.original.user.username}
          subtitle={row.original.user.employee_id}
        />
      ),
    },
    {
      header: '操作',
      accessorKey: 'action',
      size: 120,
      cell: ({ row }) => getActionLabel(row.original.action),
    },
    {
      header: '详情',
      accessorKey: 'description',
    },
    {
      header: '状态',
      accessorKey: 'status',
      size: 100,
      cell: ({ row }) => (
        <CellStatus isActive={row.original.status === 'success'} />
      ),
    },
  ];

  // 内容日志列定义
  const contentLogColumns: ColumnDef<ContentLog>[] = [
    {
      header: '时间',
      accessorKey: 'created_at',
      size: 180,
    },
    {
      header: '操作者',
      id: 'operator',
      size: 180,
      cell: ({ row }) => (
        <CellWithAvatar
          name={row.original.operator.username}
          subtitle={row.original.operator.employee_id}
        />
      ),
    },
    {
      header: '内容类型',
      accessorKey: 'content_type',
      size: 120,
      cell: ({ row }) => (
        <Badge variant="secondary">{getContentTypeLabel(row.original.content_type)}</Badge>
      ),
    },
    {
      header: '操作',
      accessorKey: 'action',
      size: 100,
      cell: ({ row }) => getActionLabel(row.original.action),
    },
    {
      header: '内容标题',
      accessorKey: 'content_title',
    },
    {
      header: '状态',
      accessorKey: 'status',
      size: 100,
      cell: ({ row }) => (
        <CellStatus isActive={row.original.status === 'success'} />
      ),
    },
  ];

  // 操作日志列定义
  const operationLogColumns: ColumnDef<OperationLog>[] = [
    {
      header: '时间',
      accessorKey: 'created_at',
      size: 180,
    },
    {
      header: '操作者',
      id: 'operator',
      size: 200,
      cell: ({ row }) => (
        <CellWithAvatar
          name={row.original.operator.username}
          subtitle={row.original.operator.role}
        />
      ),
    },
    {
      header: '操作类型',
      accessorKey: 'operation_type',
      size: 120,
      cell: ({ row }) => (
        <Badge variant="secondary">{getOperationTypeLabel(row.original.operation_type)}</Badge>
      ),
    },
    {
      header: '操作描述',
      accessorKey: 'description',
    },
    {
      header: '耗时',
      accessorKey: 'duration',
      size: 100,
      cell: ({ row }) => formatDuration(row.original.duration),
    },
    {
      header: '状态',
      accessorKey: 'status',
      size: 100,
      cell: ({ row }) => (
        <CellStatus isActive={row.original.status === 'success'} />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold text-gray-900">活动记录</h2>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
          <RefreshCw className="w-4 h-4" />
          刷新
        </button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="user">用户日志</TabsTrigger>
          <TabsTrigger value="content">内容日志</TabsTrigger>
          <TabsTrigger value="operation">操作日志</TabsTrigger>
        </TabsList>

        {/* User Logs Tab */}
        <TabsContent value="user">
          <ContentPanel padding="md" className="overflow-hidden">
            <DataTable
              columns={userLogColumns}
              data={userLogs}
              isLoading={userLogsLoading}
              pagination={{
                pageIndex: userPagination.pageIndex,
                pageSize: userPagination.pageSize,
                pageCount: userLogsData?.total_pages || 0,
                totalCount: userLogsData?.count || 0,
                onPageChange: (page) => setUserPagination(prev => ({ ...prev, pageIndex: page })),
                onPageSizeChange: (size) => setUserPagination(prev => ({ ...prev, pageSize: size, pageIndex: 0 })),
              }}
            />
          </ContentPanel>
        </TabsContent>

        {/* Content Logs Tab */}
        <TabsContent value="content">
          <ContentPanel padding="md" className="overflow-hidden">
            <DataTable
              columns={contentLogColumns}
              data={contentLogs}
              isLoading={contentLogsLoading}
              pagination={{
                pageIndex: contentPagination.pageIndex,
                pageSize: contentPagination.pageSize,
                pageCount: contentLogsData?.total_pages || 0,
                totalCount: contentLogsData?.count || 0,
                onPageChange: (page) => setContentPagination(prev => ({ ...prev, pageIndex: page })),
                onPageSizeChange: (size) => setContentPagination(prev => ({ ...prev, pageSize: size, pageIndex: 0 })),
              }}
            />
          </ContentPanel>
        </TabsContent>

        {/* Operation Logs Tab */}
        <TabsContent value="operation">
          <ContentPanel padding="md" className="overflow-hidden">
            <DataTable
              columns={operationLogColumns}
              data={operationLogs}
              isLoading={operationLogsLoading}
              pagination={{
                pageIndex: operationPagination.pageIndex,
                pageSize: operationPagination.pageSize,
                pageCount: operationLogsData?.total_pages || 0,
                totalCount: operationLogsData?.count || 0,
                onPageChange: (page) => setOperationPagination(prev => ({ ...prev, pageIndex: page })),
                onPageSizeChange: (size) => setOperationPagination(prev => ({ ...prev, pageSize: size, pageIndex: 0 })),
              }}
            />
          </ContentPanel>
        </TabsContent>
      </Tabs>
    </div>
  );
};
