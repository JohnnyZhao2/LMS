"use client"

import * as React from 'react';
import {
  Clock,
  BookOpen,
  FileText,
  Users,
  Pencil,
  Trash2,
  MoreHorizontal,
  StopCircle,
  BarChart3,
  ChevronRight,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
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
  const isUrgent = !managerClosed && dayjs(task.deadline).diff(dayjs(), 'day') <= 1;

  const canEditTask = !isStudentView && (currentRole === 'ADMIN' || managerTask?.created_by === user?.id);

  return (
    <div
      className={cn(
        "group relative flex flex-col h-full bg-white rounded-lg p-6 transition-all duration-200 cursor-pointer hover:scale-[1.02]",
        isStudentView && studentTask?.status === 'COMPLETED' && "bg-[#F9FAFB]"
      )}
      onClick={() => navigate(`/tasks/${targetTaskId}`)}
    >
      {/* 状态栏 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-md flex items-center justify-center text-white transition-transform group-hover:scale-110"
            style={{ backgroundColor: missionConfig.bgColor }}
          >
            <missionConfig.icon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest block">{missionConfig.label}</span>
            <span className="text-[10px] font-semibold text-[#9CA3AF]">ID: {targetTaskId}</span>
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {isUrgent && <Badge className="bg-[#EF4444] text-white border-none px-2 py-0.5 text-[10px] font-bold">紧急</Badge>}
          {canEditTask && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-9 w-9 rounded-md bg-[#F3F4F6] flex items-center justify-center text-[#6B7280] hover:bg-[#111827] hover:text-white transition-all duration-200">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-lg p-2 border-2 border-[#E5E7EB] bg-white">
                <DropdownMenuLabel className="text-[10px] font-bold text-[#6B7280] uppercase px-3 py-2">任务控制</DropdownMenuLabel>
                <DropdownMenuItem className="rounded-md px-3 py-2.5 font-semibold cursor-pointer hover:bg-[#F3F4F6]" onClick={() => navigate(`/tasks/${targetTaskId}/edit`)}>
                  <Pencil className="w-4 h-4 mr-2" /> 编辑任务
                </DropdownMenuItem>
                {!managerClosed && (
                  <DropdownMenuItem className="rounded-md px-3 py-2.5 font-semibold cursor-pointer hover:bg-[#F3F4F6]" onClick={() => setCloseModalOpen(true)}>
                    <StopCircle className="w-4 h-4 mr-2" /> 终止任务
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-[#E5E7EB] mx-2" />
                <DropdownMenuItem className="rounded-md px-3 py-2.5 font-semibold text-[#EF4444] hover:bg-[#FEF2F2] cursor-pointer" onClick={() => setDeleteModalOpen(true)}>
                  <Trash2 className="w-4 h-4 mr-2" /> 彻底删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* 标题 & 描述 */}
      <div className="flex-1 mb-6">
        <h3 className="text-xl font-bold text-[#111827] leading-tight mb-3 line-clamp-2 group-hover:text-[#3B82F6] transition-colors">
          {title}
        </h3>
        <p className="text-sm font-medium text-[#6B7280] line-clamp-2 leading-relaxed">
          {description || '此任务暂无描述...'}
        </p>
      </div>

      {/* 进度/指标渲染 - Flat Design */}
      <div className="mb-6">
        {isStudentView ? (
          <div className="space-y-4 bg-[#F3F4F6] p-5 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#3B82F6]" />
                <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">进度同步</span>
              </div>
              <span className="text-lg font-bold text-[#111827]">{progress?.percentage ?? 0}<span className="text-xs font-medium text-[#9CA3AF] ml-0.5">%</span></span>
            </div>
            <div className="h-2 w-full bg-[#E5E7EB] rounded-md overflow-hidden">
              <div
                className="h-full rounded-md transition-all duration-500 ease-out"
                style={{
                  width: `${progress?.percentage ?? 0}%`,
                  backgroundColor: missionConfig.bgColor
                }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold text-[#6B7280] uppercase">
              <div className="flex gap-4">
                {hasKnowledge && <span>知识: {progress?.knowledge_completed ?? 0}/{progress?.knowledge_total ?? 0}</span>}
                {hasQuiz && <span>测验: {progress?.quiz_completed ?? 0}/{progress?.quiz_total ?? 0}</span>}
              </div>
              <span className="text-[#111827]">{progress?.completed ?? 0} / {progress?.total ?? 0}</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 bg-[#F3F4F6] p-5 rounded-lg">
            <div className="flex flex-col items-center">
              <Users className="w-4 h-4 text-[#3B82F6] mb-2" />
              <span className="text-sm font-bold text-[#111827]">{managerTask?.assignee_count ?? 0}</span>
              <span className="text-[10px] font-semibold text-[#6B7280] uppercase">学员</span>
            </div>
            <div className="flex flex-col items-center border-x border-[#E5E7EB]">
              <BookOpen className="w-4 h-4 text-[#10B981] mb-2" />
              <span className="text-sm font-bold text-[#111827]">{managerTask?.knowledge_count ?? 0}</span>
              <span className="text-[10px] font-semibold text-[#6B7280] uppercase">文档</span>
            </div>
            <div className="flex flex-col items-center">
              <FileText className="w-4 h-4 text-[#A855F7] mb-2" />
              <span className="text-sm font-bold text-[#111827]">{managerTask?.quiz_count ?? 0}</span>
              <span className="text-[10px] font-semibold text-[#6B7280] uppercase">测验</span>
            </div>
          </div>
        )}
      </div>

      {/* 底部信息 */}
      <div className="mt-auto pt-5 border-t-2 border-[#F3F4F6] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-[#111827] rounded-md flex items-center justify-center text-white font-bold text-sm group-hover:scale-110 transition-transform">
            {(task.created_by_name || 'U').charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-[#111827] leading-none mb-1">{task.created_by_name || '发布人'}</span>
            <span className="text-[10px] font-semibold text-[#6B7280] flex items-center gap-1">
              <Clock className="w-3 h-3" />
              截止: {dayjs(task.deadline).format('MM.DD')}
            </span>
          </div>
        </div>

        <div className="h-10 w-10 rounded-md bg-[#DBEAFE] text-[#3B82F6] flex items-center justify-center group-hover:bg-[#3B82F6] group-hover:text-white transition-all transform group-hover:translate-x-1">
          <ChevronRight className="w-6 h-6" />
        </div>
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

      {/* 删除对话框 - Flat Design */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="rounded-lg max-w-md p-8 border-2 border-[#E5E7EB]">
          <DialogHeader>
            <div className="w-16 h-16 bg-[#FEE2E2] text-[#EF4444] rounded-md flex items-center justify-center mb-6 mx-auto">
              <Trash2 className="w-8 h-8" />
            </div>
            <DialogTitle className="text-xl font-bold text-[#111827] mb-2 text-center">彻底清除任务？</DialogTitle>
            <DialogDescription className="text-[#6B7280] font-medium text-center leading-relaxed">
              确定要永久删除任务「{title}」吗？相关的所有提交记录和数据都将被删除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-8 gap-4 sm:flex-row">
            <Button variant="secondary" className="flex-1 h-12" onClick={() => setDeleteModalOpen(false)}>取消</Button>
            <Button className="flex-1 h-12 bg-[#EF4444] hover:bg-[#DC2626] text-white hover:scale-105" onClick={handleDelete}>删除任务</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
