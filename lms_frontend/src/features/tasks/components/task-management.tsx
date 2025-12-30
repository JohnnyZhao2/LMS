import { useMemo, useState } from 'react';
import {
  Plus,
  FileText,
  Search,
  BookOpen,
  CheckCircle,
  Pencil,
  Trash2,
  Eye,
  Award,
  ChevronDown,
  ChevronUp,
  XCircle,
  LayoutGrid,
} from 'lucide-react';
import { useTaskList } from '../api/get-tasks';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import { usePendingGrading } from '@/features/grading/api/get-pending-grading';
import { useDeleteTask } from '../api/delete-task';
import { showApiError } from '@/utils/error-handler';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner, Progress, Tooltip } from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataTable } from '@/components/ui/data-table/data-table';
import { type ColumnDef } from '@tanstack/react-table';
import type { TaskListItem } from '@/types/api';
import dayjs from '@/lib/dayjs';

/**
 * 统计卡片组件
 */
interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  description?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  color,
  bgColor,
  description,
}) => (
  <Card className="h-full overflow-hidden relative hover:shadow-md transition-shadow">
    {/* 装饰圆圈 */}
    <div
      className="absolute -top-5 -right-5 w-[100px] h-[100px] rounded-full opacity-30"
      style={{ background: bgColor }}
    />
    <div
      className="absolute top-5 right-5 w-[50px] h-[50px] rounded-full opacity-20"
      style={{ background: bgColor }}
    />

    <CardContent className="p-6 relative z-10">
      {/* 图标 */}
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
        style={{ background: bgColor, color }}
      >
        {icon}
      </div>

      {/* 标签 */}
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        {label}
      </span>

      {/* 数值 */}
      <div className="text-4xl font-bold text-gray-900 leading-tight mt-1">
        {value}
      </div>

      {/* 描述 */}
      {description && (
        <span className="text-xs text-gray-500 mt-2 block">
          {description}
        </span>
      )}
    </CardContent>
  </Card>
);

/**
 * 任务管理组件（管理员/导师视图）- ShadCN UI 版本
 */
export const TaskManagement: React.FC = () => {
  const { currentRole, user } = useAuth();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; taskId?: number }>({ open: false });

  // 获取任务列表（不带筛选，前端筛选）
  const { data: tasks, isLoading } = useTaskList({});

  // 获取待评分数量
  const { data: pendingGradingData } = usePendingGrading(1);

  // 删除任务
  const deleteTask = useDeleteTask();

  // 综合筛选任务
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((t) => {
      // 搜索
      const query = searchQuery.toLowerCase();
      const matchesSearch = !query ||
        t.title.toLowerCase().includes(query) ||
        t.id.toString().includes(query);

      // 状态
      const matchesStatus = statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && !t.is_closed) ||
        (statusFilter === 'CLOSED' && t.is_closed);

      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchQuery, statusFilter]);

  // 统计数据
  const stats = useMemo(() => {
    const allTasks = tasks || [];
    const total = allTasks.length;
    const active = allTasks.filter((t) => !t.is_closed).length;
    const pendingGrading = pendingGradingData?.count || 0;

    const tasksWithPassRate = allTasks.filter((t) => t.pass_rate !== null && t.pass_rate !== undefined);
    let passRate = '-';
    if (tasksWithPassRate.length > 0) {
      const avgPassRate = tasksWithPassRate.reduce((sum, t) => sum + (t.pass_rate ?? 0), 0) / tasksWithPassRate.length;
      passRate = `${avgPassRate.toFixed(1)}%`;
    }

    return { total, active, pendingGrading, passRate };
  }, [tasks, pendingGradingData]);

  // 检查是否有权限操作任务
  const canEditTask = (task: TaskListItem) => {
    const isAdmin = currentRole === 'ADMIN';
    const isCreator = task.created_by === user?.id;
    return isAdmin || isCreator;
  };

  // 删除任务
  const handleDelete = async () => {
    if (!deleteDialog.taskId) return;
    try {
      await deleteTask.mutateAsync(deleteDialog.taskId);
      toast.success('任务已删除');
      setDeleteDialog({ open: false });
    } catch (error) {
      showApiError(error, '删除失败');
    }
  };

  // 表格列定义
  const columns: ColumnDef<TaskListItem>[] = [
    {
      id: 'title',
      header: '任务名称',
      size: 280,
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--color-gray-50)', color: 'var(--color-gray-500)' }}
            >
              <LayoutGrid className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-gray-900 truncate">{record.title}</div>
              <div className="text-xs text-gray-500">{record.created_by_name}</div>
            </div>
          </div>
        );
      },
    },
    {
      id: 'resources',
      header: 'Resources',
      size: 90,
      cell: ({ row }) => {
        const record = row.original;
        const hasKnowledge = (record.knowledge_count || 0) > 0;
        const hasQuiz = (record.quiz_count || 0) > 0;

        return (
          <div className="flex justify-center gap-1">
            {hasKnowledge && (
              <Tooltip title={`${record.knowledge_count} 知识点`}>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--color-success-50)', color: 'var(--color-success-500)' }}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
              </Tooltip>
            )}
            {hasQuiz && (
              <Tooltip title={`${record.quiz_count} 测验`}>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary-500)' }}
                >
                  <FileText className="w-3.5 h-3.5" />
                </div>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      id: 'progress',
      header: '完成进度',
      size: 140,
      cell: ({ row }) => {
        const record = row.original;
        const completed = record.completed_count || 0;
        const total = record.assignee_count || 0;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        const progressColor = percentage >= 80 ? 'var(--color-success-500)' : percentage >= 50 ? 'var(--color-primary-500)' : 'var(--color-gray-400)';

        return (
          <div>
            <div className="flex justify-between mb-0.5">
              <span className="text-xs text-gray-500">{completed}/{total}</span>
              <span className="text-xs font-semibold" style={{ color: progressColor }}>{percentage}%</span>
            </div>
            <Progress
              percent={percentage}
              showInfo={false}
              strokeColor={progressColor}
              trailColor="var(--color-gray-100)"
              size="sm"
            />
          </div>
        );
      },
    },
    {
      id: 'pass_rate',
      header: '及格率',
      size: 80,
      cell: ({ row }) => {
        const record = row.original;
        if (record.pass_rate === null || record.pass_rate === undefined) {
          return <span className="text-gray-400">-</span>;
        }
        const rate = record.pass_rate;
        const color = rate >= 80 ? 'var(--color-success-500)' : rate >= 60 ? 'var(--color-warning-500)' : 'var(--color-error-500)';
        return (
          <span className="font-semibold" style={{ color }}>
            {rate.toFixed(0)}%
          </span>
        );
      },
    },
    {
      id: 'deadline',
      header: '截止时间',
      size: 120,
      cell: ({ row }) => {
        const record = row.original;
        const isUrgent = !record.is_closed && dayjs(record.deadline).diff(dayjs(), 'day') <= 1;
        return (
          <span
            className={`text-sm ${isUrgent ? 'text-red-500 font-semibold' : 'text-gray-600'}`}
          >
            {dayjs(record.deadline).format('MM-DD HH:mm')}
          </span>
        );
      },
    },
    {
      id: 'status',
      header: '状态',
      size: 80,
      cell: ({ row }) => {
        const record = row.original;
        return (
          <Badge
            variant={record.is_closed ? 'secondary' : 'default'}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              record.is_closed
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-100'
                : 'bg-primary-50 text-primary-600 hover:bg-primary-50'
            }`}
          >
            {record.is_closed ? '已结束' : '进行中'}
          </Badge>
        );
      },
    },
    {
      id: 'action',
      header: '操作',
      size: 140,
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Tooltip title="预览">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => navigate(`/tasks/${record.id}`)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </Tooltip>
            {canEditTask(record) && (
              <>
                <Tooltip title="编辑">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={record.is_closed}
                    onClick={() => navigate(`/tasks/${record.id}/edit`)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </Tooltip>
                <Tooltip title="删除">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => setDeleteDialog({ open: true, taskId: record.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Tooltip>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="animate-fadeIn">
      {/* 页面头部 */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2
              className="m-0 flex items-center gap-3 text-2xl font-bold"
              style={{ fontSize: 'var(--font-size-3xl)' }}
            >
              <span
                className="flex items-center justify-center w-10 h-10 rounded-lg"
                style={{
                  background: 'var(--color-primary-50)',
                  color: 'var(--color-primary-500)',
                }}
              >
                <FileText className="w-5 h-5" />
              </span>
              任务中心
            </h2>
            <p className="text-gray-500 mt-1" style={{ fontSize: 'var(--font-size-base)', marginLeft: '52px' }}>
              管理并监控学习任务、练习任务和考试任务
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/grading')}
              className="h-11 px-5 font-semibold rounded-xl"
            >
              <Award className="h-4 w-4 mr-2" />
              进入评审中心
              {stats.pendingGrading > 0 && (
                <Badge className="ml-2 bg-red-500 text-white rounded-full min-w-[24px] text-center">
                  {stats.pendingGrading}
                </Badge>
              )}
            </Button>
            <Button
              onClick={() => navigate('/tasks/create')}
              className="h-11 px-5 font-semibold rounded-xl"
              style={{ background: 'var(--color-primary-500)' }}
            >
              <Plus className="h-4 w-4 mr-2" />
              发布新任务
            </Button>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div
        className="grid gap-4 mb-6 animate-fadeInUp"
        style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
      >
        <StatCard
          label="任务总数"
          value={stats.total}
          icon={<FileText className="w-6 h-6" />}
          color="var(--color-primary-500)"
          bgColor="var(--color-primary-50)"
          description="累计发布的任务总量"
        />
        <StatCard
          label="进行中"
          value={stats.active}
          icon={<CheckCircle className="w-6 h-6" />}
          color="var(--color-success-500)"
          bgColor="var(--color-success-50)"
          description="学员正在参与的任务"
        />
        <StatCard
          label="待批阅"
          value={stats.pendingGrading}
          icon={<Pencil className="w-6 h-6" />}
          color="var(--color-warning-500)"
          bgColor="var(--color-warning-50)"
          description="主观题待导师评审"
        />
        <StatCard
          label="及格率"
          value={stats.passRate}
          icon={<Award className="w-6 h-6" />}
          color="var(--color-purple-500)"
          bgColor="#F3E8FF"
          description="已完成任务的整体表现"
        />
      </div>

      {/* 筛选区和任务列表 */}
      <Card className="rounded-xl border-gray-200 shadow-sm">
        <CardContent className="p-6">
          {/* 顶部筛选条 */}
          <div className={`flex items-center gap-4 ${showAdvancedFilters ? 'mb-3' : 'mb-4'}`}>
            {/* 搜索框 */}
            <div className="relative w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索任务名称..."
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>
            {/* 更多筛选按钮 */}
            <Button
              variant="ghost"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`ml-auto ${
                (statusFilter !== 'ALL' || deptFilter !== 'ALL')
                  ? 'text-primary-500'
                  : 'text-gray-500'
              }`}
            >
              {showAdvancedFilters ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
              更多筛选
              {(statusFilter !== 'ALL' || deptFilter !== 'ALL') && (
                <Badge className="ml-1 bg-primary-500 text-white rounded-full">
                  {(statusFilter !== 'ALL' ? 1 : 0) + (deptFilter !== 'ALL' ? 1 : 0)}
                </Badge>
              )}
            </Button>
          </div>

          {/* 高级筛选面板 */}
          {showAdvancedFilters && (
            <div className="flex items-center gap-4 p-3 mb-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">状态:</span>
                <div className="flex gap-1">
                  {[
                    { value: 'ALL', label: '全部' },
                    { value: 'ACTIVE', label: '进行中' },
                    { value: 'CLOSED', label: '已结束' },
                  ].map((option) => (
                    <Button
                      key={option.value}
                      variant={statusFilter === option.value ? 'default' : 'ghost'}
                      size="sm"
                      className={`h-7 px-3 ${statusFilter === option.value ? '' : 'text-gray-600'}`}
                      onClick={() => setStatusFilter(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">部门:</span>
                <div className="flex gap-1">
                  {[
                    { value: 'ALL', label: '全部' },
                    { value: 'DEPT_1', label: '一室' },
                    { value: 'DEPT_2', label: '二室' },
                  ].map((option) => (
                    <Button
                      key={option.value}
                      variant={deptFilter === option.value ? 'default' : 'ghost'}
                      size="sm"
                      className={`h-7 px-3 ${deptFilter === option.value ? '' : 'text-gray-600'}`}
                      onClick={() => setDeptFilter(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 重置筛选 */}
              {(statusFilter !== 'ALL' || deptFilter !== 'ALL') && (
                <Button
                  variant="link"
                  size="sm"
                  className="ml-auto text-gray-500"
                  onClick={() => {
                    setStatusFilter('ALL');
                    setDeptFilter('ALL');
                  }}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  重置
                </Button>
              )}
            </div>
          )}

          {/* 任务表格 */}
          <Spinner spinning={isLoading}>
            {filteredTasks && filteredTasks.length > 0 ? (
              <DataTable
                columns={columns}
                data={filteredTasks}
                onRowClick={(row) => navigate(`/tasks/${row.id}`)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <FileText className="w-12 h-12 text-gray-300 mb-4" />
                <span className="text-base">
                  {searchQuery ? '未找到符合搜索条件的任务' : '暂无任务'}
                </span>
              </div>
            )}
          </Spinner>
        </CardContent>
      </Card>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除此任务吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false })}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTask.isPending}
            >
              {deleteTask.isPending ? '删除中...' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskManagement;
