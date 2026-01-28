import React, { useMemo, useState } from 'react';
import { Activity, FileText, Filter, RefreshCw, Settings, User } from 'lucide-react';
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
    const logs = userLogsData?.results || [];
    return logs.map((log) => ({
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
  }, [userLogsData]);

  const contentTimelineItems = useMemo<ActivityLogTimelineItem[]>(() => {
    const logs = contentLogsData?.results || [];
    return logs.map((log) => ({
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
  }, [contentLogsData]);

  const operationTimelineItems = useMemo<ActivityLogTimelineItem[]>(() => {
    const logs = operationLogsData?.results || [];
    return logs.map((log) => ({
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
  }, [operationLogsData]);

  return (
    <div className="space-y-6">
      {/* Page Title Area (Outside) */}
      <div className="flex items-center gap-3 px-0.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground tracking-tight">活动记录</h2>
          <p className="text-[12px] text-text-muted font-medium opacity-80">查看系统内的关键操作与审计日志</p>
        </div>
      </div>

      <ContentPanel padding="none" className="overflow-hidden border-border/60 shadow-sm bg-background">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Card Header (Controls & Tabs) */}
          <div className="px-6 py-4 border-b border-border/40 bg-muted/5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <TabsList className="bg-muted/30 p-1 h-auto rounded-lg w-fit border border-border/30">
                <TabsTrigger
                  value="user"
                  className="px-5 py-1.5 text-[13px] rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all"
                >
                  用户日志
                </TabsTrigger>
                <TabsTrigger
                  value="content"
                  className="px-5 py-1.5 text-[13px] rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all"
                >
                  内容日志
                </TabsTrigger>
                <TabsTrigger
                  value="operation"
                  className="px-5 py-1.5 text-[13px] rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all"
                >
                  操作日志
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="group flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium text-foreground bg-background border border-border/60 rounded-lg hover:bg-muted/50 transition-all active:scale-95 shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-text-muted transition-transform group-hover:rotate-180" />
                  <span>刷新</span>
                </button>

                <button
                  type="button"
                  className="group flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium text-foreground bg-background border border-border/60 rounded-lg hover:bg-muted/50 transition-all active:scale-95 shadow-sm"
                >
                  <Filter className="w-3.5 h-3.5 text-text-muted" />
                  <span>筛选</span>
                </button>

                {isSuperuser && (
                  <button
                    type="button"
                    onClick={() => roleNavigate(ROUTES.ACTIVITY_LOG_SETTINGS)}
                    className="group flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium text-foreground bg-background border border-border/60 rounded-lg hover:bg-muted/50 transition-all active:scale-95 shadow-sm"
                  >
                    <Settings className="w-3.5 h-3.5 text-text-muted transition-transform group-hover:rotate-45" />
                    设置
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Card Content Section */}
          <div className="p-0">
            <TabsContent value="user" className="mt-0 outline-none">
              <div className="p-6 space-y-6">
                <ActivityLogTimeline
                  items={userTimelineItems}
                  isLoading={userLogsLoading}
                  emptyText="暂无用户日志"
                />
                <div className="pt-4 border-t border-border/30">
                  <Pagination
                    current={userPagination.page}
                    total={userLogsData?.count || 0}
                    pageSize={userPagination.pageSize}
                    showSizeChanger
                    showTotal={(total, range) => `共 ${total} 条，当前 ${range[0]}-${range[1]} 条`}
                    onChange={(page, pageSize) => setUserPagination({ page, pageSize })}
                    onShowSizeChange={(page, size) => setUserPagination({ page, pageSize: size })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="content" className="mt-0 outline-none">
              <div className="p-6 space-y-6">
                <ActivityLogTimeline
                  items={contentTimelineItems}
                  isLoading={contentLogsLoading}
                  emptyText="暂无内容日志"
                />
                <div className="pt-4 border-t border-border/30">
                  <Pagination
                    current={contentPagination.page}
                    total={contentLogsData?.count || 0}
                    pageSize={contentPagination.pageSize}
                    showSizeChanger
                    showTotal={(total, range) => `共 ${total} 条，当前 ${range[0]}-${range[1]} 条`}
                    onChange={(page, pageSize) => setContentPagination({ page, pageSize })}
                    onShowSizeChange={(page, size) => setContentPagination({ page, pageSize: size })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="operation" className="mt-0 outline-none">
              <div className="p-6 space-y-6">
                <ActivityLogTimeline
                  items={operationTimelineItems}
                  isLoading={operationLogsLoading}
                  emptyText="暂无操作日志"
                />
                <div className="pt-4 border-t border-border/30">
                  <Pagination
                    current={operationPagination.page}
                    total={operationLogsData?.count || 0}
                    pageSize={operationPagination.pageSize}
                    showSizeChanger
                    showTotal={(total, range) => `共 ${total} 条，当前 ${range[0]}-${range[1]} 条`}
                    onChange={(page, pageSize) => setOperationPagination({ page, pageSize })}
                    onShowSizeChange={(page, size) => setOperationPagination({ page, pageSize: size })}
                  />
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </ContentPanel>
    </div>
  );
};
