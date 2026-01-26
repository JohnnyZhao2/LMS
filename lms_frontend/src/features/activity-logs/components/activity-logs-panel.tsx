import React, { useMemo, useState } from 'react';
import { Activity, FileText, RefreshCw, Settings, User } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { ContentPanel } from '@/components/ui';
import { useAuth } from '@/features/auth/stores/auth-context';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { ROUTES } from '@/config/routes';
import {
  useUserLogs,
  useContentLogs,
  useOperationLogs,
} from '../api/use-activity-logs';
import { ActivityLogTimeline, type ActivityLogTimelineItem } from './activity-log-timeline';

const ACTION_LABELS: Record<string, string> = {
  login: '登录系统',
  logout: '登出系统',
  password_change: '修改密码',
  login_failed: '登录失败',
  role_assigned: '角色分配',
  mentor_assigned: '分配导师',
  activate: '启用账号',
  deactivate: '停用账号',
  switch_role: '切换角色',
  create: '创建',
  update: '修改',
  delete: '删除',
  publish: '发布',
  create_and_assign: '创建并分配任务',
  batch_grade: '批量评分',
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  knowledge: '知识文档',
  quiz: '试卷',
  question: '题目',
  assignment: '作业',
};

const OPERATION_TYPE_LABELS: Record<string, string> = {
  task_management: '任务管理',
  grading: '评分操作',
  spot_check: '抽查记录',
  data_export: '数据导出',
  submission: '答题/考试',
  learning: '学习进度',
};

const getActionLabel = (action: string): string => {
  return ACTION_LABELS[action] || action;
};

const getContentTypeLabel = (type: string): string => {
  return CONTENT_TYPE_LABELS[type] || type;
};

const getOperationTypeLabel = (type: string): string => {
  return OPERATION_TYPE_LABELS[type] || type;
};

/**
 * 活动记录面板组件
 *
 * 功能：
 * - 展示用户日志、内容日志、操作日志
 * - Tab切换不同类型的日志
 * - 使用时间线展示日志详情
 */
export const ActivityLogsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('user');

  const { user } = useAuth();
  const isSuperuser = Boolean(user?.is_superuser);
  const { roleNavigate } = useRoleNavigate();

  // 分页状态
  const [userPagination, setUserPagination] = useState({ page: 1, pageSize: 10 });
  const [contentPagination, setContentPagination] = useState({ page: 1, pageSize: 10 });
  const [operationPagination, setOperationPagination] = useState({ page: 1, pageSize: 10 });

  const { data: userLogsData, isLoading: userLogsLoading, refetch: refetchUserLogs } = useUserLogs(
    userPagination.page,
    userPagination.pageSize
  );
  const { data: contentLogsData, isLoading: contentLogsLoading, refetch: refetchContentLogs } = useContentLogs(
    contentPagination.page,
    contentPagination.pageSize
  );
  const { data: operationLogsData, isLoading: operationLogsLoading, refetch: refetchOperationLogs } = useOperationLogs(
    operationPagination.page,
    operationPagination.pageSize
  );

  const userLogs = userLogsData?.results || [];
  const contentLogs = contentLogsData?.results || [];
  const operationLogs = operationLogsData?.results || [];

  const handleRefresh = () => {
    if (activeTab === 'user') {
      void refetchUserLogs();
      return;
    }
    if (activeTab === 'content') {
      void refetchContentLogs();
      return;
    }
    void refetchOperationLogs();
  };

  const userTimelineItems = useMemo<ActivityLogTimelineItem[]>(() => {
    return userLogs.map((log) => ({
      id: `user-${log.id}`,
      createdAt: log.created_at,
      status: log.status,
      title: (
        <span className="text-foreground">
          <span className="font-semibold text-foreground">{log.user.username}</span>
          <span> {getActionLabel(log.action)}</span>
        </span>
      ),
      description: log.description,
      icon: <User className="h-4 w-4" />,
    }));
  }, [userLogs]);

  const contentTimelineItems = useMemo<ActivityLogTimelineItem[]>(() => {
    return contentLogs.map((log) => ({
      id: `content-${log.id}`,
      createdAt: log.created_at,
      status: log.status,
      title: (
        <span className="text-foreground">
          <span className="font-semibold text-foreground">{log.operator.username}</span>
          <span>
            {' '}
            {getActionLabel(log.action)} {getContentTypeLabel(log.content_type)} · {log.content_title}
          </span>
        </span>
      ),
      description: log.description,
      icon: <FileText className="h-4 w-4" />,
    }));
  }, [contentLogs]);

  const operationTimelineItems = useMemo<ActivityLogTimelineItem[]>(() => {
    return operationLogs.map((log) => ({
      id: `operation-${log.id}`,
      createdAt: log.created_at,
      status: log.status,
      title: (
        <span className="text-foreground">
          <span className="font-semibold text-foreground">{log.operator.username}</span>
          <span>
            {' '}
            {getActionLabel(log.action)} · {getOperationTypeLabel(log.operation_type)}
          </span>
        </span>
      ),
      description: log.description,
      icon: <Activity className="h-4 w-4" />,
    }));
  }, [operationLogs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">活动记录</h2>
        </div>
        <div className="flex items-center gap-2">
          {isSuperuser && (
            <button
              type="button"
              onClick={() => roleNavigate(ROUTES.ACTIVITY_LOG_SETTINGS)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-foreground bg-muted rounded-lg hover:bg-muted-hover transition-colors"
            >
              <Settings className="w-4 h-4" />
              设置
            </button>
          )}
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 text-sm text-foreground bg-muted rounded-lg hover:bg-muted-hover transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>
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
          <ContentPanel padding="md" className="space-y-6">
            <ActivityLogTimeline
              items={userTimelineItems}
              isLoading={userLogsLoading}
              emptyText="暂无用户日志"
            />
            <Pagination
              current={userPagination.page}
              total={userLogsData?.count || 0}
              pageSize={userPagination.pageSize}
              showSizeChanger
              showTotal={(total, range) => `共 ${total} 条，当前 ${range[0]}-${range[1]} 条`}
              onChange={(page, pageSize) => setUserPagination({ page, pageSize })}
              onShowSizeChange={(page, size) => setUserPagination({ page, pageSize: size })}
            />
          </ContentPanel>
        </TabsContent>

        {/* Content Logs Tab */}
        <TabsContent value="content">
          <ContentPanel padding="md" className="space-y-6">
            <ActivityLogTimeline
              items={contentTimelineItems}
              isLoading={contentLogsLoading}
              emptyText="暂无内容日志"
            />
            <Pagination
              current={contentPagination.page}
              total={contentLogsData?.count || 0}
              pageSize={contentPagination.pageSize}
              showSizeChanger
              showTotal={(total, range) => `共 ${total} 条，当前 ${range[0]}-${range[1]} 条`}
              onChange={(page, pageSize) => setContentPagination({ page, pageSize })}
              onShowSizeChange={(page, size) => setContentPagination({ page, pageSize: size })}
            />
          </ContentPanel>
        </TabsContent>

        {/* Operation Logs Tab */}
        <TabsContent value="operation">
          <ContentPanel padding="md" className="space-y-6">
            <ActivityLogTimeline
              items={operationTimelineItems}
              isLoading={operationLogsLoading}
              emptyText="暂无操作日志"
            />
            <Pagination
              current={operationPagination.page}
              total={operationLogsData?.count || 0}
              pageSize={operationPagination.pageSize}
              showSizeChanger
              showTotal={(total, range) => `共 ${total} 条，当前 ${range[0]}-${range[1]} 条`}
              onChange={(page, pageSize) => setOperationPagination({ page, pageSize })}
              onShowSizeChange={(page, size) => setOperationPagination({ page, pageSize: size })}
            />
          </ContentPanel>
        </TabsContent>
      </Tabs>
    </div>
  );
};
