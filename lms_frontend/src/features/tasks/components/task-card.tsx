import {
  Clock,
  User,
  BookOpen,
  FileText,
  CheckCircle,
  AlertCircle,
  Users,
  Timer,
  Pencil,
  Trash2,
  MoreVertical,
  StopCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress, StatusBadge, Tooltip } from '@/components/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

import type { StudentTaskCenterItem, TaskListItem } from '@/types/api';
import { useDeleteTask } from '../api/delete-task';
import { useCloseTask } from '../api/close-task';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { showApiError } from '@/utils/error-handler';
import dayjs from '@/lib/dayjs';

type TaskCardProps =
  | {
      variant: 'student';
      task: StudentTaskCenterItem;
    }
  | {
      variant: 'manager';
      task: TaskListItem;
    };

/**
 * 状态配置
 */
const statusConfig = {
  IN_PROGRESS: {
    status: 'processing' as const,
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  PENDING_EXAM: {
    status: 'warning' as const,
    icon: <Timer className="w-3.5 h-3.5" />,
  },
  COMPLETED: {
    status: 'success' as const,
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  OVERDUE: {
    status: 'error' as const,
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  ACTIVE: {
    status: 'processing' as const,
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  CLOSED: {
    status: 'default' as const,
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
};

/**
 * 任务卡片组件 - ShadCN UI 版本
 */
export const TaskCard: React.FC<TaskCardProps> = ({ task, variant }) => {
  const navigate = useNavigate();
  const { user, currentRole } = useAuth();
  const deleteTask = useDeleteTask();
  const closeTask = useCloseTask();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);

  const isStudentView = variant === 'student';
  const studentTask = isStudentView ? (task as StudentTaskCenterItem) : null;
  const managerTask = !isStudentView ? (task as TaskListItem) : null;

  // Determine style based on content
  const hasQuiz = managerTask ? managerTask.quiz_count > 0 : (studentTask?.has_quiz ?? false);

  const typeConfig = hasQuiz
    ? {
        icon: <FileText className="w-5 h-5" />,
        color: 'var(--color-primary-500)',
        bg: 'var(--color-primary-50)',
        gradient: 'linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-purple-500) 100%)',
      }
    : {
        icon: <BookOpen className="w-5 h-5" />,
        color: 'var(--color-success-500)',
        bg: 'var(--color-success-50)',
        gradient: 'linear-gradient(135deg, var(--color-success-500) 0%, var(--color-cyan-500) 100%)',
      };

  const managerClosed = managerTask?.is_closed ?? false;
  const targetTaskId = isStudentView ? studentTask!.task_id : managerTask!.id;
  const statusKey = isStudentView ? studentTask!.status : managerClosed ? 'CLOSED' : 'ACTIVE';
  const stConfig = statusConfig[statusKey as keyof typeof statusConfig] || statusConfig.IN_PROGRESS;

  const title = isStudentView ? studentTask!.task_title : managerTask!.title;
  const description = isStudentView ? studentTask!.task_description : managerTask!.description;
  const statusLabel = isStudentView
    ? studentTask!.status_display
    : managerClosed
      ? '已结束'
      : '进行中';
  const progress = studentTask?.progress;
  const isTaskClosed = isStudentView ? studentTask!.status === 'COMPLETED' : managerClosed;
  const isUrgent = !isTaskClosed && dayjs(task.deadline).diff(dayjs(), 'day') <= 1;

  // 检查是否有权限操作任务（管理员或创建者）
  const isAdmin = currentRole === 'ADMIN';
  const isCreator = managerTask?.created_by === user?.id;
  const canEditTask = !isStudentView && (isAdmin || isCreator);

  /**
   * 处理编辑
   */
  const handleEdit = () => {
    navigate(`/tasks/${targetTaskId}/edit`);
  };

  /**
   * 处理关闭任务
   */
  const handleCloseClick = () => {
    setCloseModalOpen(true);
  };

  /**
   * 确认关闭任务
   */
  const handleClose = async () => {
    try {
      await closeTask.mutateAsync(targetTaskId);
      toast.success('任务已关闭');
      setCloseModalOpen(false);
    } catch (error) {
      showApiError(error, '关闭任务失败');
    }
  };

  /**
   * 处理删除
   */
  const handleDeleteClick = () => {
    setDeleteModalOpen(true);
  };

  /**
   * 确认删除任务
   */
  const handleDelete = async () => {
    try {
      await deleteTask.mutateAsync(targetTaskId);
      toast.success('任务已删除');
      setDeleteModalOpen(false);
    } catch (error) {
      showApiError(error, '删除失败');
    }
  };

  return (
    <>
      <Card
        className="h-full cursor-pointer relative p-5 hover:shadow-md transition-shadow"
        onClick={() => navigate(`/tasks/${targetTaskId}`)}
      >
        {/* 操作按钮 - 仅在管理员/导师视图且有权限时显示 */}
        {canEditTask && (
          <div
            className="absolute top-3 right-3 z-10"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-white shadow-md border border-gray-100 hover:bg-gray-50"
                >
                  <MoreVertical className="h-4 w-4 text-gray-700" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem
                  onClick={handleEdit}
                  disabled={managerClosed}
                  className="cursor-pointer"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  修改
                </DropdownMenuItem>
                {isAdmin && !managerClosed && (
                  <DropdownMenuItem onClick={handleCloseClick} className="cursor-pointer">
                    <StopCircle className="mr-2 h-4 w-4" />
                    关闭任务
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={handleDeleteClick}
                  className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* 顶部类型标识 */}
        <div className="flex justify-between items-start mb-4">
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center text-white"
            style={{
              background: typeConfig.gradient,
              boxShadow: `0 4px 12px ${typeConfig.color}40`,
            }}
          >
            {typeConfig.icon}
          </div>
          <StatusBadge status={stConfig.status} text={statusLabel} size="small" />
        </div>

        {/* 标题和描述 */}
        <Tooltip title={title}>
          <h3 className="font-semibold text-lg text-gray-900 mb-2 truncate">{title}</h3>
        </Tooltip>

        {description && (
          <Tooltip title={description}>
            <p className="text-sm text-gray-500 mb-4 line-clamp-2">{description}</p>
          </Tooltip>
        )}

        {/* 进度条 - 学员视图 */}
        {isStudentView ? (
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-sm text-gray-500">完成进度</span>
              <span className="text-sm font-semibold" style={{ color: typeConfig.color }}>
                {progress?.percentage ?? 0}%
              </span>
            </div>
            <Progress
              percent={progress?.percentage ?? 0}
              showInfo={false}
              strokeColor={typeConfig.gradient}
              trailColor="var(--color-gray-100)"
              size="sm"
            />
            <span className="text-xs text-gray-500">
              {progress?.completed ?? 0}/{progress?.total ?? 0} 项已完成
            </span>
          </div>
        ) : (
          /* 统计信息 - 管理员视图 */
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: typeConfig.color }} />
              <div>
                <div className="text-xs text-gray-500">指派学员</div>
                <div className="font-semibold">{managerTask?.assignee_count ?? 0}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" style={{ color: typeConfig.color }} />
              <div>
                <div className="text-xs text-gray-500">知识文档</div>
                <div className="font-semibold">{managerTask?.knowledge_count ?? 0}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" style={{ color: typeConfig.color }} />
              <div>
                <div className="text-xs text-gray-500">试卷</div>
                <div className="font-semibold">{managerTask?.quiz_count ?? 0}</div>
              </div>
            </div>
          </div>
        )}

        {/* 底部信息 */}
        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500">{task.created_by_name}</span>
          </div>
          <div
            className="flex items-center gap-1"
            style={{ color: isUrgent ? 'var(--color-error-500)' : 'var(--color-gray-400)' }}
          >
            <Clock className="w-3 h-3" />
            <span
              className="text-xs"
              style={{
                color: isUrgent ? 'var(--color-error-500)' : 'var(--color-gray-500)',
                fontWeight: isUrgent ? 600 : 400,
              }}
            >
              {dayjs(task.deadline).format('MM-DD HH:mm')}
            </span>
          </div>
        </div>

        {/* 已关闭标签 - 管理员视图 */}
        {!isStudentView && managerClosed && managerTask?.closed_at && (
          <div className="mt-3">
            <Badge variant="secondary" className="text-xs">
              <Timer className="w-3 h-3 mr-1" />
              已于 {dayjs(managerTask.closed_at).format('MM-DD HH:mm')} 结束
            </Badge>
          </div>
        )}
      </Card>

      {/* 关闭任务确认弹窗 */}
      <Dialog open={closeModalOpen} onOpenChange={setCloseModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认关闭任务</DialogTitle>
            <DialogDescription>
              确定要关闭任务「{title}」吗？关闭后未完成的分配记录将标记为已逾期。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCloseModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleClose} disabled={closeTask.isPending}>
              {closeTask.isPending ? '关闭中...' : '关闭任务'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除任务「{title}」吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
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
    </>
  );
};
