import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CheckCircle,
  PlayCircle,
  BookOpen,
  FileText,
  Clock,
  Edit,
  MoreVertical,
  Info,
  Trophy,
  Activity,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useTaskDetail, useStudentLearningTaskDetail } from '../api/get-task-detail';
import { useCompleteLearning } from '../api/complete-learning';
import dayjs from '@/lib/dayjs';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { cn } from '@/lib/utils';
import type { LearningTaskQuizItem, TaskQuiz } from '@/types/api';

const assignmentStatusLabelMap: Record<string, string> = {
  IN_PROGRESS: '进行中',
  PENDING_EXAM: '待考试',
  COMPLETED: '已完成',
  OVERDUE: '已逾期',
};

interface KnowledgeListViewItem {
  id: number;
  knowledgeId: number;
  title: string;
  summary?: string;
  knowledgeType: string;
  knowledgeTypeDisplay?: string;
  version?: number;
  isCompleted?: boolean;
  completedAt?: string | null;
}

/**
 * 任务详情组件 - Flat Design 版本
 * 
 * 设计规范：
 * - 无阴影 (shadow-none)
 * - 无渐变 (no gradient)
 * - 无模糊 (no blur)
 * - 实心背景色区分层级
 * - hover:scale 交互反馈
 */
export const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentRole, user, isLoading: authLoading } = useAuth();

  const isStudent = !authLoading && currentRole === 'STUDENT';
  const isAdmin = currentRole === 'ADMIN';
  const isMentorOrManager = currentRole === 'MENTOR' || currentRole === 'DEPT_MANAGER' || currentRole === 'TEAM_MANAGER';

  const taskId = Number(id);
  const isValidTaskId = Number.isFinite(taskId) && taskId > 0;

  const {
    data: task,
    isLoading: taskLoading,
    isError: taskError,
  } = useTaskDetail(taskId, { enabled: isValidTaskId && !authLoading });

  const { data: learningDetail, isLoading: learningLoading } = useStudentLearningTaskDetail(taskId, {
    enabled: Boolean(taskId) && isValidTaskId && isStudent,
  });

  const hasKnowledge = (task?.knowledge_items?.length ?? 0) > 0;

  const completeLearning = useCompleteLearning();
  const isLoading = authLoading || !isValidTaskId || taskLoading || (isStudent && learningLoading);

  // Flat Design: 使用纯色而非渐变
  const appearance = useMemo(() => {
    const hasQuiz = (task?.quizzes?.length ?? 0) > 0;
    const hasKnowledge = (task?.knowledge_items?.length ?? 0) > 0;
    const isExamTask = task?.quizzes?.some(q => q.quiz_type === 'EXAM');

    if (isExamTask) {
      return {
        bgColor: '#EF4444', // Red 500 - 实心颜色
        icon: <Trophy className="w-5 h-5" />,
        themeColor: '#EF4444',
        bgSoft: '#FEF2F2', // red-50
        missionLabel: 'EXAM MISSION',
      };
    }

    if (hasQuiz && hasKnowledge) {
      return {
        bgColor: '#3B82F6', // Blue 500 - 实心颜色
        icon: <Activity className="w-5 h-5" />,
        themeColor: '#3B82F6',
        bgSoft: '#EFF6FF', // blue-50
        missionLabel: 'HYBRID MISSION',
      };
    }

    return {
      bgColor: '#3B82F6', // Blue 500
      icon: <BookOpen className="w-5 h-5" />,
      themeColor: '#3B82F6',
      bgSoft: '#EFF6FF',
      missionLabel: 'LEARNING MISSION',
    };
  }, [task]);

  const knowledgeList: KnowledgeListViewItem[] = useMemo(() => {
    if (!task) return [];

    if (isStudent && learningDetail) {
      return learningDetail.knowledge_items.map((item) => ({
        id: item.id,
        knowledgeId: item.knowledge_id,
        title: item.title || '无标题',
        summary: item.summary,
        knowledgeType: item.knowledge_type,
        knowledgeTypeDisplay: item.knowledge_type_display,
        isCompleted: item.is_completed,
        completedAt: item.completed_at,
      }));
    }

    return (task.knowledge_items ?? []).map((item) => ({
      id: item.id,
      knowledgeId: item.knowledge,
      title: item.knowledge_title || '无标题',
      summary: item.summary,
      knowledgeType: item.knowledge_type,
      knowledgeTypeDisplay: item.knowledge_type_display,
      version: item.version_number,
      isCompleted: false,
    }));
  }, [isStudent, learningDetail, task]);

  if (!isValidTaskId) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="bg-[#F3F4F6] rounded-lg p-12 text-center">
          <div className="w-16 h-16 bg-[#FEE2E2] text-[#EF4444] rounded-md flex items-center justify-center mx-auto mb-4">
            <Info className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-[#111827] mb-2">Invalid Task ID</h3>
          <p className="text-[#6B7280]">无法找到指定的任务编号，请检查后重试。</p>
          <Button variant="outline" className="mt-6" onClick={() => navigate(-1)}>
            返回上一页
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-[#DBEAFE] rounded-full animate-spin border-t-[#3B82F6]"></div>
          <span className="text-[#6B7280] font-bold tracking-widest uppercase text-sm animate-pulse">Loading Mission Data...</span>
        </div>
      </div>
    );
  }

  if (taskError || !task) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="bg-[#F3F4F6] rounded-lg p-12 text-center max-w-md">
          <div className="w-16 h-16 bg-[#F3F4F6] text-[#9CA3AF] rounded-md flex items-center justify-center mx-auto mb-4">
            <Info className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-[#111827] mb-2">Mission Not Found</h3>
          <p className="text-[#6B7280]">任务不存在或您没有权限查看，请联系管理员。</p>
          <Button variant="outline" className="mt-6" onClick={() => navigate('/tasks')}>
            返回任务中心
          </Button>
        </div>
      </div>
    );
  }

  const myAssignment = task.assignments?.find((a) => a.assignee === user?.id);
  const studentStatus = learningDetail?.status;
  const studentStatusDisplay = learningDetail?.status_display;

  const canStartQuiz = isStudent
    ? (studentStatus === 'IN_PROGRESS')
    : (!!myAssignment && myAssignment.status === 'IN_PROGRESS');
  const canEditTask = !isStudent && (isAdmin || isMentorOrManager) && !task.is_closed;

  const handleCompleteLearning = async (knowledgeId: number) => {
    try {
      await completeLearning.mutateAsync({ taskId, knowledgeId });
      toast.success('已标记为完成');
    } catch {
      toast.error('操作失败，请稍后重试');
    }
  };

  const handleStartQuiz = (quizId: number) => {
    if (!isStudent || !canStartQuiz) return;
    const assignmentId = learningDetail?.id;
    if (!assignmentId) return;
    navigate(`/quiz/${quizId}?assignment=${assignmentId}&task=${taskId}`);
  };

  const displayQuizzes = isStudent ? (learningDetail?.quiz_items ?? []) : (task.quizzes ?? []);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header - Flat Design: 纯色背景 */}
      <div className="relative mb-8">
        <div
          className="rounded-lg overflow-hidden"
          style={{ backgroundColor: appearance.bgColor }}
        >
          <div className="relative pt-10 px-8 pb-8 text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div className="space-y-4 max-w-2xl">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(-1)}
                  className="text-white bg-white/20 hover:bg-white/30 rounded-md mb-2 hover:scale-105 transition-all duration-200"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  返回列表
                </Button>

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "px-3 py-1 rounded-md text-xs font-bold uppercase tracking-widest",
                      appearance.missionLabel === 'EXAM MISSION'
                        ? "bg-white/30 text-white"
                        : "bg-white/20 text-white"
                    )}>
                      {appearance.missionLabel}
                    </span>
                    {isStudent && studentStatus && (
                      <span className={cn(
                        "px-3 py-1 rounded-md text-xs font-bold uppercase tracking-widest",
                        studentStatus === 'COMPLETED' ? "bg-[#10B981] text-white" : "bg-white/20 text-white"
                      )}>
                        {studentStatusDisplay || assignmentStatusLabelMap[studentStatus] || studentStatus}
                      </span>
                    )}
                    {!isStudent && myAssignment && (
                      <span className={cn(
                        "px-3 py-1 rounded-md text-xs font-bold uppercase tracking-widest",
                        myAssignment.status === 'COMPLETED' ? "bg-[#10B981] text-white" : "bg-white/20 text-white"
                      )}>
                        {assignmentStatusLabelMap[myAssignment.status] || myAssignment.status}
                      </span>
                    )}
                  </div>
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">{task.title}</h1>
                </div>
                {task.description && (
                  <p className="text-white/90 text-lg font-medium leading-relaxed">
                    {task.description}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3 items-end">
                <div className="flex items-center gap-3 bg-white/20 rounded-md p-4">
                  <div className="text-right">
                    <div className="text-xs text-white/70 font-bold uppercase tracking-wider">截止时间</div>
                    <div className="font-bold text-xl font-mono">{dayjs(task.deadline).format('MM.DD HH:mm')}</div>
                  </div>
                  <div className="w-10 h-10 rounded-md bg-white/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm font-medium text-white/80">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">
                    {task.created_by_name.charAt(0)}
                  </div>
                  发布人: {task.created_by_name}

                  {canEditTask && (
                    <div className="ml-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/20 hover:bg-white/30 rounded-md text-white">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-lg bg-white border-2 border-[#E5E7EB]">
                          <DropdownMenuItem onClick={() => navigate(`/tasks/${taskId}/edit`)} className="focus:bg-[#F3F4F6] rounded-md cursor-pointer">
                            <Edit className="w-4 h-4 mr-2 text-[#3B82F6]" />
                            <span className="font-semibold text-[#111827]">编辑任务</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`grid gap-6 ${isStudent ? 'grid-cols-[1fr_320px]' : 'grid-cols-1'}`}>
        <div className="flex flex-col gap-6">
          {/* 知识列表 - Flat Design: 实心背景色块 */}
          {hasKnowledge && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2 px-2">
                <div className="w-10 h-10 rounded-md bg-[#3B82F6] flex items-center justify-center text-white">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-[#111827] tracking-tight">学习章节</h3>
              </div>

              <div className="space-y-4">
                {knowledgeList.map((item, index) => (
                  <div
                    key={item.id}
                    className="group relative bg-[#F3F4F6] rounded-lg p-6 hover:scale-[1.01] transition-all duration-200"
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                      {/* Index Block */}
                      <div className={cn(
                        "w-14 h-14 rounded-md flex-shrink-0 flex items-center justify-center text-xl font-bold",
                        item.isCompleted
                          ? "bg-[#10B981] text-white"
                          : "bg-[#E5E7EB] text-[#6B7280]"
                      )}>
                        {item.isCompleted ? <CheckCircle className="w-7 h-7" /> : index + 1}
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-[#DBEAFE] text-[#3B82F6] text-[10px] font-bold uppercase tracking-wider">
                            {item.knowledgeTypeDisplay || item.knowledgeType}
                          </span>
                          <h4 className="text-lg font-bold text-[#111827]">{item.title}</h4>
                        </div>
                        {item.summary && (
                          <p className="text-[#6B7280] text-sm leading-relaxed">{item.summary}</p>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                        {isStudent && (
                          item.isCompleted ? (
                            <div className="px-4 py-2 rounded-md bg-[#D1FAE5] text-[#10B981] font-semibold text-sm flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              已掌握
                            </div>
                          ) : (
                            <Button
                              className="w-full md:w-auto bg-white hover:bg-[#F3F4F6] text-[#3B82F6] border-2 border-[#3B82F6] hover:scale-105 transition-all font-semibold"
                              disabled={completeLearning.isPending}
                              onClick={() => handleCompleteLearning(item.knowledgeId)}
                            >
                              标记为掌握
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 试卷列表 - Flat Design: 色块区分 */}
          {displayQuizzes.length > 0 && (
            <div className="space-y-4 mt-8">
              <div className="flex items-center gap-3 mb-2 px-2">
                <div className="w-10 h-10 rounded-md bg-[#F59E0B] flex items-center justify-center text-white">
                  <Trophy className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-[#111827] tracking-tight">能力评估</h3>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {displayQuizzes.map((item) => {
                  const isExamQuiz = item.quiz_type === 'EXAM';
                  const studentQuizItem = isStudent ? item as LearningTaskQuizItem : null;
                  const adminQuizItem = !isStudent ? item as TaskQuiz : null;

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "group relative rounded-lg p-6 transition-all duration-200 hover:scale-[1.01]",
                        isExamQuiz ? "bg-[#FEF2F2]" : "bg-[#F3F4F6]"
                      )}
                    >
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                        <div className={cn(
                          "w-16 h-16 rounded-md flex items-center justify-center flex-shrink-0 text-white",
                          isExamQuiz ? "bg-[#EF4444]" : "bg-[#3B82F6]"
                        )}>
                          {isExamQuiz ? <Trophy className="w-8 h-8" /> : <FileText className="w-8 h-8" />}
                        </div>

                        <div className="flex-1 space-y-3">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn(
                                "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest",
                                isExamQuiz
                                  ? "bg-[#FEE2E2] text-[#EF4444]"
                                  : "bg-[#DBEAFE] text-[#3B82F6]"
                              )}>
                                {item.quiz_type_display || (isExamQuiz ? 'FINAL EXAM' : 'PRACTICE QUIZ')}
                              </span>
                              {studentQuizItem?.is_completed && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest bg-[#D1FAE5] text-[#10B981]">
                                  COMPLETED
                                </span>
                              )}
                            </div>
                            <h4 className="text-2xl font-bold text-[#111827]">
                              {studentQuizItem ? studentQuizItem.quiz_title : adminQuizItem?.quiz_title}
                            </h4>
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm font-semibold text-[#6B7280]">
                            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md">
                              <Info className="w-4 h-4 text-[#3B82F6]" />
                              {item.question_count} 题
                            </div>
                            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md">
                              <Trophy className="w-4 h-4 text-[#F59E0B]" />
                              总分 {item.total_score}
                            </div>
                            {item.duration && (
                              <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md">
                                <Clock className="w-4 h-4 text-[#3B82F6]" />
                                限时 {item.duration} 分钟
                              </div>
                            )}
                            {studentQuizItem?.is_completed && (
                              <div className="flex items-center gap-1.5 bg-[#D1FAE5] px-2 py-1 rounded-md text-[#10B981] ml-auto">
                                <Trophy className="w-4 h-4" />
                                最佳成绩: {studentQuizItem.score}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex-shrink-0 w-full md:w-auto">
                          {isStudent && (
                            <Button
                              className={cn(
                                "w-full md:w-auto h-12 rounded-md hover:scale-105 transition-transform font-semibold text-base px-8",
                                isExamQuiz
                                  ? "bg-[#EF4444] text-white hover:bg-[#DC2626]"
                                  : "bg-[#3B82F6] text-white hover:bg-[#2563EB]"
                              )}
                              disabled={!canStartQuiz || (isExamQuiz && !!studentQuizItem?.is_completed)}
                              onClick={() => handleStartQuiz(studentQuizItem ? studentQuizItem.quiz_id : (adminQuizItem?.quiz || 0))}
                            >
                              <PlayCircle className="w-5 h-5 mr-2" />
                              {isExamQuiz
                                ? (studentQuizItem?.is_completed ? '考试已提交' : '开始系统考试')
                                : (studentQuizItem?.is_completed ? '再次练习答题' : '开始技能练习')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 学员侧边栏 - Flat Design: 色块区分 */}
        {isStudent && (
          <div className="flex flex-col gap-6">
            <div className="bg-[#F3F4F6] rounded-lg p-6">
              <h3 className="text-lg font-bold text-[#111827] mb-6 flex items-center gap-2">
                <div className="w-1 h-6 bg-[#3B82F6] rounded-full"></div>
                任务进度
              </h3>

              <div className="flex flex-col items-center">
                {learningDetail ? (
                  <>
                    <div className="relative w-48 h-48">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        {/* Background circle */}
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          fill="none"
                          stroke="#E5E7EB"
                          strokeWidth="12"
                        />
                        {/* Progress circle - 实心颜色 */}
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          fill="none"
                          stroke="#3B82F6"
                          strokeWidth="12"
                          strokeLinecap="round"
                          strokeDasharray={`${learningDetail.progress.percentage * 2.64} 264`}
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold text-[#3B82F6]">
                          {learningDetail.progress.percentage}%
                        </span>
                        <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest mt-1">Total Progress</span>
                      </div>
                    </div>

                    <div className="w-full mt-6 space-y-3">
                      <div className="flex justify-between items-center p-3 bg-white rounded-md">
                        <span className="text-sm font-semibold text-[#6B7280]">完成项目</span>
                        <span className="font-bold text-[#3B82F6] text-lg">
                          {learningDetail.progress.completed} <span className="text-[#9CA3AF] text-sm font-normal">/ {learningDetail.progress.total}</span>
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-10 text-[#6B7280] font-medium">
                    <div className="w-12 h-12 bg-[#E5E7EB] rounded-md flex items-center justify-center mx-auto mb-3">
                      <Activity className="w-5 h-5 text-[#9CA3AF]" />
                    </div>
                    暂无详细进度
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#F3F4F6] rounded-lg p-6">
              <h3 className="text-lg font-bold text-[#111827] mb-6 flex items-center gap-2">
                <div className="w-1 h-6 bg-[#F59E0B] rounded-full"></div>
                当前状态
              </h3>

              <div className="flex flex-col gap-4">
                {learningDetail?.progress?.knowledge_total ? (
                  <div className="flex items-center justify-between p-4 bg-[#DBEAFE] rounded-md">
                    <span className="text-sm font-semibold text-[#3B82F6]">知识同步</span>
                    <span className="font-bold text-[#3B82F6] text-lg">
                      {learningDetail.progress.knowledge_completed} / {learningDetail.progress.knowledge_total}
                    </span>
                  </div>
                ) : null}

                {learningDetail?.progress?.quiz_total ? (
                  <div className="flex items-center justify-between p-4 bg-[#F3E8FF] rounded-md">
                    <span className="text-sm font-semibold text-[#A855F7]">试卷同步</span>
                    <span className="font-bold text-[#A855F7] text-lg">
                      {learningDetail.progress.quiz_completed} / {learningDetail.progress.quiz_total}
                    </span>
                  </div>
                ) : null}

                <div className="flex items-center justify-between p-4 bg-white rounded-md">
                  <span className="text-sm font-semibold text-[#6B7280]">执行状态</span>
                  {studentStatus && (
                    <span className={cn(
                      "px-3 py-1 rounded-md text-xs font-bold uppercase tracking-widest",
                      studentStatus === 'COMPLETED' ? "bg-[#D1FAE5] text-[#10B981]" :
                        studentStatus === 'IN_PROGRESS' ? "bg-[#DBEAFE] text-[#3B82F6]" :
                          "bg-[#F3F4F6] text-[#6B7280]"
                    )}>
                      {studentStatusDisplay || assignmentStatusLabelMap[studentStatus] || studentStatus}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
