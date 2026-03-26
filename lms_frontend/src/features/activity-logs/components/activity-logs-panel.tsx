import React, { startTransition, useDeferredValue, useMemo, useState } from 'react';
import {
  Activity,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { cn } from '@/lib/utils';
import { useActivityLogs } from '../api/use-activity-logs';
import { ActivityLogFeed } from './activity-log-feed';
import { ActivityLogMemberList } from './activity-log-member-list';
import type { ActivityLogItem, ActivityLogType } from '../types';

const LOG_TYPE_META = {
  user: { label: '账号' },
  content: { label: '内容' },
  operation: { label: '行为记录' },
} as const;

const ACTION_LABELS: Record<string, string> = {
  login: '登录系统',
  logout: '登出系统',
  password_change: '修改密码',
  login_failed: '登录失败',
  role_assigned: '分配角色',
  mentor_assigned: '分配导师',
  activate: '启用账号',
  deactivate: '停用账号',
  switch_role: '切换角色',
  create: '创建',
  update: '更新',
  delete: '删除',
  publish: '发布',
  create_and_assign: '创建并分配任务',
  update_task: '更新任务',
  delete_task: '删除任务',
  manual_grade: '人工批改',
  batch_grade: '批量评分',
  submit: '提交答卷',
  start_quiz: '开始答题',
  complete_knowledge: '完成学习',
};

const ACTION_OPTIONS: Record<ActivityLogType, Array<{ label: string; value: string }>> = {
  user: [
    { label: '登录系统', value: 'login' },
    { label: '登录失败', value: 'login_failed' },
    { label: '登出系统', value: 'logout' },
    { label: '切换角色', value: 'switch_role' },
    { label: '修改密码', value: 'password_change' },
    { label: '启用账号', value: 'activate' },
    { label: '停用账号', value: 'deactivate' },
    { label: '分配角色', value: 'role_assigned' },
    { label: '分配导师', value: 'mentor_assigned' },
  ],
  content: [
    { label: '创建', value: 'create' },
    { label: '更新', value: 'update' },
    { label: '删除', value: 'delete' },
    { label: '发布', value: 'publish' },
  ],
  operation: [
    { label: '创建并分配任务', value: 'create_and_assign' },
    { label: '更新任务', value: 'update_task' },
    { label: '删除任务', value: 'delete_task' },
    { label: '人工批改', value: 'manual_grade' },
    { label: '批量评分', value: 'batch_grade' },
    { label: '开始答题', value: 'start_quiz' },
    { label: '提交答卷', value: 'submit' },
    { label: '完成学习', value: 'complete_knowledge' },
  ],
};

export const ActivityLogsPanel: React.FC = () => {
  const { hasPermission } = useAuth();
  const canViewActivityLogs = hasPermission('activity_log.view');

  const [activeType, setActiveType] = useState<ActivityLogType>('user');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);

  const deferredSearch = useDeferredValue(search.trim());

  const query = useMemo(
    () => ({
      type: activeType,
      page,
      pageSize,
      memberIds: selectedMemberIds,
      search: deferredSearch || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      action: action === 'all' ? undefined : action,
    }),
    [action, activeType, dateFrom, dateTo, deferredSearch, page, pageSize, selectedMemberIds]
  );

  const { data, isLoading } = useActivityLogs(query, canViewActivityLogs);

  const normalizedItems = useMemo<ActivityLogItem[]>(
    () =>
      (data?.results ?? []).map((item) => ({
        ...item,
        action: ACTION_LABELS[item.action] ?? item.action,
      })),
    [data?.results]
  );

  const actionOptions = ACTION_OPTIONS[activeType];
  const selectedMembers = useMemo(
    () => (data?.members ?? []).filter((m) => selectedMemberIds.includes(m.user.id)),
    [data?.members, selectedMemberIds]
  );
  const hasActiveFilters =
    selectedMemberIds.length > 0 ||
    search.trim().length > 0 ||
    action !== 'all' ||
    dateFrom !== '' ||
    dateTo !== '';

  const handleTypeChange = (nextType: ActivityLogType) => {
    if (nextType === activeType) return;
    startTransition(() => {
      setActiveType(nextType);
      setPage(1);
      setAction('all');
      setDateFrom('');
      setDateTo('');
      setSelectedMemberIds([]);
    });
  };

  const handleToggleMember = (memberId: number) => {
    startTransition(() => {
      setSelectedMemberIds((cur) =>
        cur.includes(memberId) ? cur.filter((id) => id !== memberId) : [...cur, memberId]
      );
      setPage(1);
    });
  };

  if (!canViewActivityLogs) {
    return (
      <div className="overflow-hidden rounded-xl border border-border/60 bg-background">
        <div className="border-b border-border/40 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">日志审计</h2>
              <p className="text-xs text-text-muted">统一查看账号、内容与行为记录。</p>
            </div>
          </div>
        </div>
        <div className="px-5 py-6">
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-error-50 px-3 py-2.5 text-xs font-medium text-destructive">
            <ShieldAlert className="h-3.5 w-3.5" />
            无权查看活动日志。
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      {/* 标题 */}
      <h2 className="text-xl font-semibold tracking-tight text-foreground">Activity Feed</h2>

      {/* 筛选栏 */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* 类型切换 */}
        <div className="inline-flex rounded-xl bg-muted p-1">
          {(['user', 'content', 'operation'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleTypeChange(type)}
              className={cn(
                'rounded-lg px-4 py-2 text-[13px] font-medium transition-all',
                type === activeType
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-muted hover:text-foreground'
              )}
            >
              {LOG_TYPE_META[type].label}
            </button>
          ))}
        </div>

        {/* 搜索 */}
        <div className="relative min-w-[13rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search Activity..."
            className="h-10 rounded-xl border-border/60 bg-background pl-9 text-[13px] shadow-none"
          />
        </div>

        {/* 日期 */}
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="h-10 w-[9rem] shrink-0 rounded-xl border-border/60 bg-background text-[13px] shadow-none"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="h-10 w-[9rem] shrink-0 rounded-xl border-border/60 bg-background text-[13px] shadow-none"
        />

        {/* 动作筛选 */}
        <Select value={action} onValueChange={(v) => { setAction(v); setPage(1); }}>
          <SelectTrigger className="h-10 w-[10rem] shrink-0 rounded-xl border-border/60 bg-background text-[13px] shadow-none">
            <SelectValue placeholder="Activity Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部动作</SelectItem>
            {actionOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setSearch(''); setAction('all'); setDateFrom(''); setDateTo('');
              setSelectedMemberIds([]); setPage(1);
            }}
            className="h-10 rounded-xl border border-border/60 bg-background px-3.5 text-[13px] text-text-muted transition-colors hover:bg-muted hover:text-foreground"
          >
            清空
          </button>
        )}
      </div>

      {/* 主体 */}
      <div className="grid gap-5 xl:grid-cols-[17rem_minmax(0,1fr)]">
        {/* 左侧成员列表 */}
        <ActivityLogMemberList
          members={data?.members ?? []}
          selectedMemberIds={selectedMemberIds}
          activeType={activeType}
          onToggleMember={handleToggleMember}
        />

        {/* 右侧日志流 */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
            {/* 选中成员标签 + Tab */}
            <div className="border-b border-border/60 px-5 pt-4">
              <div className="flex items-center gap-6">
                <button type="button" className="relative pb-3 text-[13px] font-semibold text-primary">
                  全部
                  <span className="ml-1.5 rounded-md bg-primary-50 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                    {data?.count ?? 0}
                  </span>
                  <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-primary" />
                </button>
              </div>
            </div>

            {/* 已选成员 pills */}
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-2 border-b border-border/40 px-5 py-3">
                {selectedMembers.map((m) => (
                  <button
                    key={m.user.id}
                    type="button"
                    onClick={() => handleToggleMember(m.user.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-50/60 px-3 py-1 text-[12px] font-medium text-primary transition-colors hover:bg-primary-100"
                  >
                    {m.user.username}
                    <X className="h-3 w-3 opacity-60" />
                  </button>
                ))}
              </div>
            )}

            {/* 日志列表 */}
            <ActivityLogFeed items={normalizedItems} isLoading={isLoading} />
          </div>

          {/* 分页 */}
          <div className="rounded-2xl border border-border/60 bg-background px-5 py-3">
            <Pagination
              current={page}
              total={data?.count ?? 0}
              pageSize={pageSize}
              showSizeChanger
              showTotal={(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`}
              onChange={(p, s) => { setPage(p); setPageSize(s); }}
              onShowSizeChange={(p, s) => { setPage(p); setPageSize(s); }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};
