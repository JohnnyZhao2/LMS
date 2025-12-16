/**
 * TaskManagement - Task management page for mentors/managers/admins
 * Requirements: 14.1, 14.14
 * - Display task list with type and status filter
 * - Integrate task creation wizard
 * - Admin can force close tasks
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Table, type TableColumn } from '@/components/ui/Table';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { 
  Plus, 
  Search, 
  FileText, 
  Target, 
  ClipboardCheck,
  Calendar,
  StopCircle,
  Eye
} from 'lucide-react';
import { useTaskList, useForceCloseTask, type TaskListParams, type TaskListItem } from './api/task-management';
import { TaskWizard } from './components/TaskWizard';
import { useCurrentRole } from '@/stores/auth';
import type { TaskType } from '@/types/domain';

const TASK_TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: 'LEARNING', label: '学习任务' },
  { value: 'PRACTICE', label: '练习任务' },
  { value: 'EXAM', label: '考试任务' },
];

const TASK_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'ACTIVE', label: '进行中' },
  { value: 'CLOSED', label: '已结束' },
];

const TASK_TYPE_ICONS: Record<TaskType, typeof FileText> = {
  LEARNING: FileText,
  PRACTICE: Target,
  EXAM: ClipboardCheck,
};

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  LEARNING: '学习',
  PRACTICE: '练习',
  EXAM: '考试',
};

export function TaskManagement() {
  const currentRole = useCurrentRole();
  const isAdmin = currentRole === 'ADMIN';

  const [filters, setFilters] = useState<TaskListParams>({
    page: 1,
    page_size: 10,
  });
  const [search, setSearch] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [confirmCloseTask, setConfirmCloseTask] = useState<TaskListItem | null>(null);

  const { data, isLoading, error, refetch } = useTaskList({
    ...filters,
    search: search || undefined,
  });

  const forceClose = useForceCloseTask();

  const handleSearch = (value: string) => {
    setSearch(value);
    setFilters(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (key: keyof TaskListParams, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
      page: 1,
    }));
  };

  const handleForceClose = async () => {
    if (!confirmCloseTask) return;
    try {
      await forceClose.mutateAsync(confirmCloseTask.id);
      setConfirmCloseTask(null);
    } catch (error) {
      console.error('Failed to close task:', error);
    }
  };

  const tasks = data?.results || [];
  const totalCount = data?.count || 0;

  // Define table columns
  const columns: TableColumn<TaskListItem>[] = [
    {
      key: 'title',
      title: '任务标题',
      render: (_, task) => {
        const TypeIcon = TASK_TYPE_ICONS[task.type];
        return (
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              task.type === 'LEARNING' ? 'bg-blue-500/10 text-blue-400' :
              task.type === 'PRACTICE' ? 'bg-green-500/10 text-green-400' :
              'bg-orange-500/10 text-orange-400'
            }`}>
              <TypeIcon className="h-4 w-4" />
            </div>
            <div>
              <div className="font-medium text-white">{task.title}</div>
              {task.description && (
                <div className="text-sm text-text-muted truncate max-w-[200px]">
                  {task.description}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'type',
      title: '类型',
      render: (_, task) => (
        <Badge variant={
          task.type === 'LEARNING' ? 'default' :
          task.type === 'PRACTICE' ? 'success' :
          'warning'
        }>
          {TASK_TYPE_LABELS[task.type]}
        </Badge>
      ),
    },
    {
      key: 'status',
      title: '状态',
      render: (_, task) => (
        <Badge variant={task.status === 'ACTIVE' ? 'success' : 'secondary'}>
          {task.status === 'ACTIVE' ? '进行中' : '已结束'}
        </Badge>
      ),
    },
    {
      key: 'deadline',
      title: '截止时间',
      render: (_, task) => (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Calendar className="h-4 w-4" />
          {new Date(task.deadline).toLocaleDateString('zh-CN')}
        </div>
      ),
    },
    {
      key: 'progress',
      title: '完成进度',
      render: (_, task) => {
        const completionRate = task.assignment_count > 0 
          ? Math.round((task.completed_count / task.assignment_count) * 100) 
          : 0;
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden max-w-[100px]">
              <div 
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <span className="text-sm text-text-muted">
              {task.completed_count}/{task.assignment_count}
            </span>
          </div>
        );
      },
    },
    {
      key: 'created_by',
      title: '创建人',
      render: (_, task) => (
        <span className="text-sm text-text-muted">
          {task.created_by.real_name}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      align: 'right',
      render: (_, task) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
          {isAdmin && task.status === 'ACTIVE' && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmCloseTask(task);
              }}
              className="text-red-400 hover:text-red-300"
            >
              <StopCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">任务管理</h1>
          <p className="text-text-muted mt-1">创建和管理学习、练习、考试任务</p>
        </div>
        <Button onClick={() => setWizardOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新建任务
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="搜索任务标题..."
                className="pl-10"
              />
            </div>

            {/* Type Filter */}
            <select
              value={filters.type || ''}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="bg-black/20 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
            >
              {TASK_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="bg-black/20 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
            >
              {TASK_STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-400 mb-4">加载失败</p>
              <Button variant="secondary" onClick={() => refetch()}>
                重试
              </Button>
            </div>
          ) : tasks.length === 0 ? (
            <EmptyState
              icon={<ClipboardCheck className="h-12 w-12" />}
              title="暂无任务"
              description={search || filters.type || filters.status 
                ? "没有找到匹配的任务" 
                : "点击「新建任务」创建第一个任务"}
              actionText={!search && !filters.type && !filters.status ? "新建任务" : undefined}
              onAction={!search && !filters.type && !filters.status ? () => setWizardOpen(true) : undefined}
            />
          ) : (
            <Table
              columns={columns}
              dataSource={tasks}
              rowKey="id"
              pagination={totalCount > (filters.page_size || 10) ? {
                current: filters.page || 1,
                pageSize: filters.page_size || 10,
                total: totalCount,
                onChange: (page, pageSize) => setFilters(prev => ({ ...prev, page, page_size: pageSize })),
              } : false}
            />
          )}
        </CardContent>
      </Card>

      {/* Task Wizard Modal */}
      <TaskWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
      />

      {/* Force Close Confirmation Modal */}
      <Modal
        open={!!confirmCloseTask}
        onClose={() => setConfirmCloseTask(null)}
        title="强制结束任务"
      >
        <div className="space-y-4">
          <p className="text-text-muted">
            确定要强制结束任务「{confirmCloseTask?.title}」吗？
          </p>
          <p className="text-sm text-yellow-400">
            ⚠️ 此操作将结束所有学员的任务，未完成的学员将无法继续作答。
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setConfirmCloseTask(null)}>
              取消
            </Button>
            <Button 
              variant="danger" 
              onClick={handleForceClose}
              disabled={forceClose.isPending}
            >
              {forceClose.isPending ? '处理中...' : '确认结束'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
