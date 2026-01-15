"use client"

import * as React from 'react';
import {
  Clock,
  BookOpen,
  FileText,
  Pencil,
  Trash2,
  MoreHorizontal,
  StopCircle,
  Activity,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorBoundary } from '@/components/ui/error-boundary';

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
 * - 无阴影 (shadow-none)
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
  const navigate = useNavigate();
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
        bgColor: '#3B82F6', // Blue - 实心颜色
        label: '综合任务',
      };
    }
    if (hasQuiz) {
      return {
        icon: FileText,
        bgColor: '#A855F7', // Purple - 实心颜色
        label: '考核任务',
      };
    }
    return {
      icon: BookOpen,
      bgColor: '#10B981', // Emerald - 实心颜色
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
        "group relative flex flex-col h-full bg-white rounded-[2rem] p-8 transition-all duration-300 cursor-pointer border border-slate-100/50 hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1",
        isStudentView && studentTask?.status === 'COMPLETED' && "bg-[#F9FAFB]/80 border-transparent shadow-none"
      )}
      onClick={() => navigate(`/tasks/${targetTaskId}`)}
    >
      {/* 顶部：状态、发布人、日期 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          {isUrgent ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider">Urgent</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-500 rounded-full">
              <span className="text-[10px] font-black uppercase tracking-wider">{missionConfig.label}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 text-[10px] font-bold">
              {(task.created_by_name || 'U').charAt(0)}
            </div>
            <span className="text-xs font-bold text-slate-700">{task.created_by_name || '发布人'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-bold text-slate-600">{dayjs(task.deadline).format('YYYY-MM-DD')}</span>
          </div>

          {canEditTask && (
            <div onClick={e => e.stopPropagation()} className="ml-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl p-2 border border-slate-200 bg-white shadow-xl">
                  <DropdownMenuLabel className="text-[10px] font-bold text-[#6B7280] uppercase px-3 py-2">任务控制</DropdownMenuLabel>
                  <DropdownMenuItem className="rounded-lg px-3 py-2.5 font-semibold cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/tasks/${targetTaskId}/edit`)}>
                    <Pencil className="w-4 h-4 mr-2" /> 编辑任务
                  </DropdownMenuItem>
                  {!managerClosed && (
                    <DropdownMenuItem className="rounded-lg px-3 py-2.5 font-semibold cursor-pointer hover:bg-slate-50" onClick={() => setCloseModalOpen(true)}>
                      <StopCircle className="w-4 h-4 mr-2" /> 终止任务
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-slate-100 mx-2" />
                  <DropdownMenuItem className="rounded-lg px-3 py-2.5 font-semibold text-red-500 hover:bg-red-50 cursor-pointer" onClick={() => setDeleteModalOpen(true)}>
                    <Trash2 className="w-4 h-4 mr-2" /> 彻底删除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {/* 中部：标题 & 描述 */}
      <div className="flex-1 mb-8">
        <h3 className="text-2xl font-black text-slate-900 leading-tight mb-4 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>
        <p className="text-[15px] font-medium text-slate-500/80 line-clamp-2 leading-relaxed">
          {description || '此任务暂无描述...'}
        </p>
      </div>

      {/* 底部：进度或统计 */}
      <div className="mt-auto">
        {isStudentView ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">进度</span>
              <span className="text-xl font-black text-slate-900">{progress?.percentage ?? 0}<span className="text-sm ml-0.5">%</span></span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${progress?.percentage ?? 0}%`,
                  backgroundColor: missionConfig.bgColor
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex gap-8 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
            <div className="flex gap-8">
              <div className="flex flex-col">
                <span className="text-xl font-black text-slate-900">{managerTask?.assignee_count ?? 0}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">学员</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black text-slate-900">{managerTask?.knowledge_count ?? 0}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">知识</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black text-slate-900">{managerTask?.quiz_count ?? 0}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">测验</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 终止对话框 - Flat Design */}
      <Dialog open={closeModalOpen} onOpenChange={setCloseModalOpen}>
        <DialogContent className="rounded-lg max-w-md p-8 border-2 border-[#E5E7EB]">
          <DialogHeader>
            <div className="w-16 h-16 bg-[#FEF3C7] text-[#F59E0B] rounded-md flex items-center justify-center mb-6 mx-auto">
              <StopCircle className="w-8 h-8" />
            </div>
            <DialogTitle className="text-xl font-bold text-[#111827] mb-2 text-center">终止当前任务？</DialogTitle>
            <DialogDescription className="text-[#6B7280] font-medium text-center leading-relaxed">
              终止后，所有未完成的学员记录将同步标记为"已逾期"。此操作不可撤回。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-8 gap-4 sm:flex-row">
            <Button variant="secondary" className="flex-1 h-12" onClick={() => setCloseModalOpen(false)}>放弃</Button>
            <Button className="flex-1 h-12 bg-[#F59E0B] hover:bg-[#D97706] text-white hover:scale-105" onClick={handleClose}>确认终止</Button>
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
        iconBgColor="bg-[#FEE2E2]"
        iconColor="text-[#EF4444]"
        confirmText="删除任务"
        cancelText="取消"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        isConfirming={deleteTask.isPending}
        contentClassName="rounded-lg max-w-md p-8 border-2 border-[#E5E7EB]"
      />
    </div>
  );
};
