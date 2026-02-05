import * as React from 'react';
import {
  BookOpen,
  FileText,
  Pencil,
  Trash2,
  MoreHorizontal,
  StopCircle,
  Activity,
} from 'lucide-react';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ActionDropdown } from '@/components/common/action-dropdown';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { CategoryBadge } from '@/components/common/category-badge';
import { StatusDot } from '@/components/common/status-dot';

import type { StudentTaskCenterItem, TaskListItem } from '@/types/api';
import { useDeleteTask } from '../api/delete-task';
import { useCloseTask } from '../api/close-task';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { showApiError } from '@/utils/error-handler';
import dayjs from '@/lib/dayjs';
import { cn } from '@/lib/utils';

type TaskCardProps =
  | { variant: 'student'; task: StudentTaskCenterItem }
  | { variant: 'manager'; task: TaskListItem };

/**
 * 任务卡片组件 - Flat Design 版本
 * 
 * 设计规范：
 * - 无阴影 
 * - 无渐变 (no gradient)
 * - 实心背景色
 * - hover:scale 交互反馈
 * - rounded-lg 圆角
 */
export const TaskCard: React.FC<TaskCardProps> = (props) => (
  <ErrorBoundary>
    <TaskCardContent {...props} />
  </ErrorBoundary>
);

const TaskCardContent: React.FC<TaskCardProps> = ({ task, variant }) => {
  const { roleNavigate } = useRoleNavigate();
  const { user, currentRole } = useAuth();
  const deleteTask = useDeleteTask();
  const closeTask = useCloseTask();
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [closeModalOpen, setCloseModalOpen] = React.useState(false);

  const handleClose = () => {
    if (!targetTaskId) return;

    closeTask.mutate(targetTaskId, {
      onSuccess: () => {
        toast.success("Task closed successfully");
        setCloseModalOpen(false);
      },
      onError: (error: unknown) => {
        showApiError(error);
      }
    });
  };

  const handleDelete = () => {
    if (!targetTaskId) return;

    deleteTask.mutate(targetTaskId, {
      onSuccess: () => {
        toast.success("Task deleted successfully");
        setDeleteModalOpen(false);
      },
      onError: (error: unknown) => {
        showApiError(error);
      }
    });
  };

  const isStudentView = variant === 'student';
  const studentTask = isStudentView ? (task as StudentTaskCenterItem) : null;
  const managerTask = !isStudentView ? (task as TaskListItem) : null;

  const hasQuiz = managerTask ? managerTask.quiz_count > 0 : (studentTask?.has_quiz ?? false);
  const hasKnowledge = managerTask ? managerTask.knowledge_count > 0 : (studentTask?.has_knowledge ?? false);

  // Flat Design: 实心颜色配置
  const missionConfig = React.useMemo(() => {
    if (hasQuiz && hasKnowledge) {
      return {
        icon: Activity,
        bgClass: 'bg-primary', // Blue - 实心颜色
        label: '综合任务',
      };
    }
    if (hasQuiz) {
      return {
        icon: FileText,
        bgClass: 'bg-primary-500', // Purple - 实心颜色
        label: '考核任务',
      };
    }
    return {
      icon: BookOpen,
      bgClass: 'bg-secondary', // Emerald - 实心颜色
      label: '知识任务',
    };
  }, [hasQuiz, hasKnowledge]);

  const managerClosed = managerTask?.is_closed ?? false;
  const targetTaskId = isStudentView ? studentTask!.task_id : managerTask!.id;

  const title = isStudentView ? studentTask!.task_title : managerTask!.title;
  const description = isStudentView ? studentTask!.task_description : managerTask!.description;
  const progress = studentTask?.progress;
  const now = dayjs();
  const deadline = dayjs(task.deadline);
  const isUrgent = !managerClosed && deadline.isAfter(now) && deadline.diff(now, 'hour') <= 48;

  const canEditTask = !isStudentView && (currentRole === 'ADMIN' || managerTask?.created_by === user?.id);

  return (
    <div
      className={cn(
        "group relative flex flex-col h-[210px] bg-background rounded-[1.5rem] p-6 transition-all duration-300 cursor-pointer border border-border/50 hover:-translate-y-1",
        isStudentView && studentTask?.status === 'COMPLETED' && "bg-muted/80 border-transparent"
      )}
      onClick={() => roleNavigate(`tasks/${targetTaskId}`)}
    >
      {/* 顶部：状态、发布人、日期 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <StatusDot
              color={isUrgent ? "bg-destructive-500" : missionConfig.bgClass}
              animate={isUrgent}
            />
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
              {isUrgent ? '紧急任务' : missionConfig.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-[11px] font-bold text-text-muted">
            {task.created_by_name || '发布人'}
          </div>
          <div className="text-[11px] font-bold text-text-muted">
            {dayjs(task.deadline).format('YYYY-MM-DD')}
          </div>

          {canEditTask && (
            <div onClick={e => e.stopPropagation()} className="ml-1">
              <ActionDropdown
                triggerIcon={MoreHorizontal}
                triggerSize="sm"
                label="任务控制"
                items={[
                  {
                    icon: Pencil,
                    label: '编辑任务',
                    onClick: () => roleNavigate(`tasks/${targetTaskId}/edit`),
                  },
                  ...(!managerClosed ? [{
                    icon: StopCircle,
                    label: '终止任务',
                    onClick: () => setCloseModalOpen(true),
                  }] : []),
                  {
                    icon: Trash2,
                    label: '彻底删除',
                    onClick: () => setDeleteModalOpen(true),
                    variant: 'destructive' as const,
                  },
                ]}
              />
            </div>
          )}
        </div>
      </div>

      {/* 中部：标题 & 描述 */}
      <div className="flex-1 min-h-0">
        <h3 className="text-xl font-black text-foreground leading-tight mb-1 truncate group-hover:text-primary-600 transition-colors">
          {title}
        </h3>
        <p className="text-[14px] font-medium text-text-muted/80 truncate">
          {description || '此任务暂无描述...'}
        </p>
      </div>

      {/* 底部：进度或统计 */}
      <div className="mt-auto">
        {isStudentView ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {(studentTask?.progress.knowledge_total ?? 0) > 0 && (
                  <CategoryBadge
                    variant={(studentTask?.progress.knowledge_completed ?? 0) >= (studentTask?.progress.knowledge_total ?? 0) ? 'completed' : 'knowledge'}
                    label={(studentTask?.progress.knowledge_completed ?? 0) >= (studentTask?.progress.knowledge_total ?? 0) ? '知识' : undefined}
                    count={studentTask?.progress.knowledge_total}
                  />
                )}
                {(studentTask?.progress.practice_total ?? 0) > 0 && (
                  <CategoryBadge
                    variant={(studentTask?.progress.practice_completed ?? 0) >= (studentTask?.progress.practice_total ?? 0) ? 'completed' : 'practice'}
                    label={(studentTask?.progress.practice_completed ?? 0) >= (studentTask?.progress.practice_total ?? 0) ? '测验' : undefined}
                    count={studentTask?.progress.practice_total}
                  />
                )}
                {(studentTask?.progress.exam_total ?? 0) > 0 && (
                  <CategoryBadge
                    variant={(studentTask?.progress.exam_completed ?? 0) >= (studentTask?.progress.exam_total ?? 0) ? 'completed' : 'exam'}
                    label={(studentTask?.progress.exam_completed ?? 0) >= (studentTask?.progress.exam_total ?? 0) ? '考试' : undefined}
                    count={studentTask?.progress.exam_total}
                  />
                )}
              </div>
              <span className="text-base font-black text-foreground">{progress?.percentage ?? 0}<span className="text-xs ml-0.5">%</span></span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  missionConfig.bgClass
                )}
                style={{
                  width: `${progress?.percentage ?? 0}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(managerTask?.knowledge_count ?? 0) > 0 && (
                <CategoryBadge variant="knowledge" count={managerTask?.knowledge_count} />
              )}
              {(managerTask?.practice_count ?? 0) > 0 && (
                <CategoryBadge variant="practice" count={managerTask?.practice_count} />
              )}
              {(managerTask?.exam_count ?? 0) > 0 && (
                <CategoryBadge variant="exam" count={managerTask?.exam_count} />
              )}
            </div>
            <div className="flex gap-4 p-4 bg-muted/50 rounded-xl border border-border">
              <div className="flex gap-4">
                <div className="flex flex-col">
                  <span className="text-base font-black text-foreground">{managerTask?.assignee_count ?? 0}</span>
                  <span className="text-[10px] font-bold text-text-muted uppercase">学员</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-black text-foreground">{managerTask?.completed_count ?? 0}</span>
                  <span className="text-[10px] font-bold text-text-muted uppercase">完成</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-black text-foreground">
                    {managerTask?.pass_rate !== null && managerTask?.pass_rate !== undefined
                      ? `${managerTask.pass_rate}%`
                      : '-'
                    }
                  </span>
                  <span className="text-[10px] font-bold text-text-muted uppercase">及格率</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 终止对话框 - Flat Design */}
      <Dialog open={closeModalOpen} onOpenChange={setCloseModalOpen}>
        <DialogContent className="rounded-lg max-w-md p-8 border-2 border-border">
          <DialogHeader>
            <div className="w-16 h-16 bg-warning-100 text-warning rounded-md flex items-center justify-center mb-6 mx-auto">
              <StopCircle className="w-8 h-8" />
            </div>
            <DialogTitle className="text-xl font-bold text-foreground mb-2 text-center">终止当前任务？</DialogTitle>
            <DialogDescription className="text-text-muted font-medium text-center leading-relaxed">
              终止后，所有未完成的学员记录将同步标记为"已逾期"。此操作不可撤回。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-8 gap-4 sm:flex-row">
            <Button variant="secondary" className="flex-1 h-12" onClick={() => setCloseModalOpen(false)}>放弃</Button>
            <Button className="flex-1 h-12 bg-warning hover:bg-warning-hover text-white hover:scale-105" onClick={handleClose}>确认终止</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除对话框 */}
      <ConfirmDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="彻底清除任务？"
        description={`确定要永久删除任务「${title}」吗？相关的所有提交记录和数据都将被删除。`}
        icon={<Trash2 className="w-8 h-8" />}
        iconBgColor="bg-destructive-100"
        iconColor="text-destructive"
        confirmText="删除任务"
        cancelText="取消"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        isConfirming={deleteTask.isPending}
        contentClassName="rounded-lg max-w-md p-8 border-2 border-border"
      />
    </div>
  );
};
