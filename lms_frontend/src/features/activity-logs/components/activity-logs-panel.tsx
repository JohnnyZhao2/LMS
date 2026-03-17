import React, { useMemo, useState } from 'react';
import { Activity, FileText, RefreshCw, Settings, ShieldAlert, User } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  useUserLogs,
  useContentLogs,
  useOperationLogs,
} from '../api/use-activity-logs';
import { ActivityLogTimeline, type ActivityLogTimelineItem } from './activity-log-timeline';
import { ActivityLogPolicyPanel } from './activity-log-policy-panel';

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { hasPermission } = useAuth();
  const canViewActivityLogs = hasPermission('activity_log.view');
  const canUpdateActivityLogPolicy = hasPermission('activity_log.policy.update');


  // 分页状态
  const [userPagination, setUserPagination] = useState({ page: 1, pageSize: 10 });
  const [contentPagination, setContentPagination] = useState({ page: 1, pageSize: 10 });
  const [operationPagination, setOperationPagination] = useState({ page: 1, pageSize: 10 });

  const { data: userLogsData, isLoading: userLogsLoading, refetch: refetchUserLogs } = useUserLogs(
    userPagination.page,
    userPagination.pageSize,
    canViewActivityLogs
  );
  const { data: contentLogsData, isLoading: contentLogsLoading, refetch: refetchContentLogs } = useContentLogs(
    contentPagination.page,
    contentPagination.pageSize,
    canViewActivityLogs
  );
  const { data: operationLogsData, isLoading: operationLogsLoading, refetch: refetchOperationLogs } = useOperationLogs(
    operationPagination.page,
    operationPagination.pageSize,
    canViewActivityLogs
  );


  const handleRefresh = () => {
    if (!canViewActivityLogs) {
      return;
    }
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
        <>
          <span className="font-bold">{log.user.username}</span>
          <span> {getActionLabel(log.action)}</span>
        </>
      ),
      description: log.description,
      icon: <User />,
    }));
  }, [userLogsData]);

  const contentTimelineItems = useMemo<ActivityLogTimelineItem[]>(() => {
    const logs = contentLogsData?.results || [];
    return logs.map((log) => ({
      id: `content-${log.id}`,
      createdAt: log.created_at,
      status: log.status,
      title: (
        <>
          <span className="font-bold">{log.operator.username}</span>
          <span>
            {' '}
            {getActionLabel(log.action)} {getContentTypeLabel(log.content_type)} · {log.content_title}
          </span>
        </>
      ),
      description: log.description,
      icon: <FileText />,
    }));
  }, [contentLogsData]);

  const operationTimelineItems = useMemo<ActivityLogTimelineItem[]>(() => {
    const logs = operationLogsData?.results || [];
    return logs.map((log) => ({
      id: `operation-${log.id}`,
      createdAt: log.created_at,
      status: log.status,
      title: (
        <>
          <span className="font-bold">{log.operator.username}</span>
          <span>
            {' '}
            {getActionLabel(log.action)} · {getOperationTypeLabel(log.operation_type)}
          </span>
        </>
      ),
      description: log.description,
      icon: <Activity />,
    }));
  }, [operationLogsData]);

  if (!canViewActivityLogs) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="relative overflow-hidden bg-card border border-border/50 rounded-3xl shadow-sm">
          <div className="px-6 py-4 border-b border-border/30 bg-background/40 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground uppercase tracking-[0.15em]">审计流水线</h2>
            </div>
          </div>
          <div className="px-8 py-10">
            <div className="flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-4 text-sm font-medium text-rose-600 dark:text-rose-400">
              <ShieldAlert className="h-4 w-4" />
              无权查看活动日志。
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="relative overflow-hidden bg-card border border-border/50 rounded-3xl shadow-sm">

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full relative z-10">
          {/* Dashboard-style Slim Header */}
          <div className="px-6 py-4 border-b border-border/30 bg-background/40 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Left Side: System Title with LED */}
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <div>
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-[0.15em]">审计流水线</h2>
                </div>
              </div>

              {/* Right Side: Segmented Controls */}
              <div className="flex items-center gap-4">
                <TabsList className="bg-muted/40 p-1 h-9 rounded-xl border border-border/20">
                  <TabsTrigger
                    value="user"
                    className="px-4 py-1 text-[11px] font-bold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all"
                  >
                    用户日志
                  </TabsTrigger>
                  <TabsTrigger
                    value="content"
                    className="px-4 py-1 text-[11px] font-bold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all"
                  >
                    内容日志
                  </TabsTrigger>
                  <TabsTrigger
                    value="operation"
                    className="px-4 py-1 text-[11px] font-bold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all"
                  >
                    系统日志
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-1.5 border-l border-border/40 pl-4">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted/50 transition-all text-muted-foreground hover:text-primary active:scale-90"
                    title="刷新"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  {canUpdateActivityLogPolicy && (
                    <button
                      type="button"
                      onClick={() => setIsSettingsOpen(true)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted/50 transition-all text-muted-foreground active:scale-90"
                      title="设置"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card Content Section */}
          <div className="p-0">
            <TabsContent value="user" className="mt-0 outline-none">
              <div className="px-8 py-6 space-y-6">
                <ActivityLogTimeline
                  items={userTimelineItems}
                  isLoading={userLogsLoading}
                  emptyText="暂无用户日志"
                />
                <div className="pt-6 border-t border-border/20">
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
              <div className="px-8 py-6 space-y-6">
                <ActivityLogTimeline
                  items={contentTimelineItems}
                  isLoading={contentLogsLoading}
                  emptyText="暂无内容日志"
                />
                <div className="pt-6 border-t border-border/20">
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
              <div className="px-8 py-6 space-y-6">
                <ActivityLogTimeline
                  items={operationTimelineItems}
                  isLoading={operationLogsLoading}
                  emptyText="暂无操作日志"
                />
                <div className="pt-6 border-t border-border/20">
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
      </div>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
          <div className="relative p-8 bg-background">
            {/* Subtle Background Glow */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

            <DialogHeader className="mb-8 relative z-10">
              <DialogTitle className="text-xl font-bold tracking-tight">审计策略配置</DialogTitle>
              <DialogDescription className="text-xs font-medium text-slate-500">
                精细化控制系统日志的记录范围，优化存储与性能。
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="relative z-10 h-[70vh] pr-4">
              <ActivityLogPolicyPanel />
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
