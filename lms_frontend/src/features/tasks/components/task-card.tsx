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
 * 任务卡片组件 - 极致美学版
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

  const missionConfig = React.useMemo(() => {
    if (hasQuiz && hasKnowledge) {
      return {
        icon: Activity,
        color: 'var(--color-primary-500)',
        gradient: 'linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-purple-500) 100%)',
        label: '综合任务',
      };
    }
    if (hasQuiz) {
      return {
        icon: FileText,
        color: 'var(--color-purple-500)',
        gradient: 'linear-gradient(135deg, var(--color-purple-500) 0%, var(--color-pink-500) 100%)',
        label: '考核任务',
      };
    }
    return {
      icon: BookOpen,
      color: 'var(--color-success-500)',
      gradient: 'linear-gradient(135deg, var(--color-success-500) 0%, var(--color-cyan-500) 100%)',
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
        "group relative flex flex-col h-full bg-white rounded-[2.5rem] p-8 transition-all duration-500 ease-out border border-transparent shadow-sm hover:shadow-2xl hover:shadow-primary-500/10 hover:-translate-y-2 overflow-hidden",
        isStudentView && studentTask?.status === 'COMPLETED' && "bg-gray-50/50"
      )}
      onClick={() => navigate(`/tasks/${targetTaskId}`)}
    >
      {/* 装饰性背景光效 */}
      <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-0 group-hover:opacity-20 transition-opacity blur-3xl pointer-events-none" style={{ background: missionConfig.color }} />

      {/* 状态排布 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:rotate-6"
            style={{ background: missionConfig.gradient }}
          >
            <missionConfig.icon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">{missionConfig.label}</span>
            <span className="text-[10px] font-bold text-gray-300">ID: {targetTaskId}</span>
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {isUrgent && <Badge className="bg-error-500 text-white border-none animate-pulse px-2 py-0.5 text-[10px] font-bold">紧急</Badge>}
          {canEditTask && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-9 w-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-900 hover:text-white transition-all">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 border-none shadow-premium animate-fadeIn">
                <DropdownMenuLabel className="text-[10px] font-bold text-gray-400 uppercase px-3 py-2">任务控制</DropdownMenuLabel>
                <DropdownMenuItem className="rounded-xl px-3 py-2.5 font-bold cursor-pointer" onClick={() => navigate(`/tasks/${targetTaskId}/edit`)}>
                  <Pencil className="w-4 h-4 mr-2" /> 编辑任务
                </DropdownMenuItem>
                {!managerClosed && (
                  <DropdownMenuItem className="rounded-xl px-3 py-2.5 font-bold cursor-pointer" onClick={() => setCloseModalOpen(true)}>
                    <StopCircle className="w-4 h-4 mr-2" /> 终止任务
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-gray-50 mx-2" />
                <DropdownMenuItem className="rounded-xl px-3 py-2.5 font-bold text-error-500 focus:bg-error-50 cursor-pointer" onClick={() => setDeleteModalOpen(true)}>
                  <Trash2 className="w-4 h-4 mr-2" /> 彻底删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* 标题 & 描述 */}
      <div className="flex-1 mb-8">
        <h3 className="text-xl font-black text-gray-900 leading-tight mb-4 line-clamp-2 group-hover:text-primary-600 transition-colors">
          {title}
        </h3>
        <p className="text-sm font-medium text-gray-400 line-clamp-2 leading-relaxed italic">
          {description || '此任务暂无战略指示...'}
        </p>
      </div>

      {/* 进度/指标渲染 */}
      <div className="mb-8">
        {isStudentView ? (
          <div className="space-y-4 bg-gray-50/50 p-6 rounded-[1.5rem] group-hover:bg-white transition-colors duration-500 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary-500" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">进度同步</span>
              </div>
              <span className="text-lg font-black text-gray-900 italic">{progress?.percentage ?? 0}<span className="text-xs font-bold text-gray-300 ml-0.5">%</span></span>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${progress?.percentage ?? 0}%`,
                  background: missionConfig.gradient
                }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase">
              <div className="flex gap-4">
                {hasKnowledge && <span>知识: {progress?.knowledge_completed ?? 0}/{progress?.knowledge_total ?? 0}</span>}
                {hasQuiz && <span>测验: {progress?.quiz_completed ?? 0}/{progress?.quiz_total ?? 0}</span>}
              </div>
              <span className="text-gray-900">{progress?.completed ?? 0} / {progress?.total ?? 0}</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 bg-gray-50/50 p-6 rounded-[1.5rem] group-hover:bg-white transition-colors duration-500 border border-gray-100">
            <div className="flex flex-col items-center">
              <Users className="w-4 h-4 text-primary-500 mb-2" />
              <span className="text-sm font-black text-gray-900">{managerTask?.assignee_count ?? 0}</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase">学员</span>
            </div>
            <div className="flex flex-col items-center border-x border-gray-200">
              <BookOpen className="w-4 h-4 text-success-500 mb-2" />
              <span className="text-sm font-black text-gray-900">{managerTask?.knowledge_count ?? 0}</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase">文档</span>
            </div>
            <div className="flex flex-col items-center">
              <FileText className="w-4 h-4 text-purple-500 mb-2" />
              <span className="text-sm font-black text-gray-900">{managerTask?.quiz_count ?? 0}</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase">测验</span>
            </div>
          </div>
        )}
      </div>

      {/* 底部信息 */}
      <div className="mt-auto pt-6 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-gray-900 rounded-xl flex items-center justify-center text-white font-black text-sm group-hover:scale-110 transition-transform shadow-lg">
            {(task.created_by_name || 'U').charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-gray-900 leading-none mb-1">{task.created_by_name || '发布人'}</span>
            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              截止: {dayjs(task.deadline).format('MM.DD')}
            </span>
          </div>
        </div>

        <div className="h-10 w-10 rounded-2xl bg-primary-50 text-primary-500 flex items-center justify-center group-hover:bg-primary-500 group-hover:text-white transition-all transform group-hover:translate-x-1">
          <ChevronRight className="w-6 h-6" />
        </div>
      </div>

      {/* 对话框保持之前的逻辑 */}
      <Dialog open={closeModalOpen} onOpenChange={setCloseModalOpen}>
        <DialogContent className="rounded-[2.5rem] max-w-md p-10 border-none shadow-2xl">
          <DialogHeader>
            <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-[1.5rem] flex items-center justify-center mb-8 mx-auto">
              <StopCircle className="w-10 h-10" />
            </div>
            <DialogTitle className="text-2xl font-black text-gray-900 mb-2 text-center">终止当前任务？</DialogTitle>
            <DialogDescription className="text-gray-500 font-medium text-center leading-relaxed">
              终止后，所有未完成的学员记录将同步标记为“已逾期”。此操作不可撤回。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-10 gap-4 sm:flex-row">
            <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-bold" onClick={() => setCloseModalOpen(false)}>放弃</Button>
            <Button className="flex-1 h-14 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-xl shadow-orange-500/20" onClick={handleClose}>确认终止</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="rounded-[2.5rem] max-w-md p-10 border-none shadow-2xl">
          <DialogHeader>
            <div className="w-20 h-20 bg-error-50 text-error-500 rounded-[1.5rem] flex items-center justify-center mb-8 mx-auto">
              <Trash2 className="w-10 h-10" />
            </div>
            <DialogTitle className="text-2xl font-black text-gray-900 mb-2 text-center">彻底清除任务？</DialogTitle>
            <DialogDescription className="text-gray-500 font-medium text-center leading-relaxed">
              确定要永久删除任务「{title}」吗？相关的所有提交记录和数据镜像都将被粉碎。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-10 gap-4 sm:flex-row">
            <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-bold" onClick={() => setDeleteModalOpen(false)}>取消</Button>
            <Button className="flex-1 h-14 rounded-2xl bg-error-500 hover:bg-error-600 text-white font-bold shadow-xl shadow-error-500/20" onClick={handleDelete}>粉碎任务</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
