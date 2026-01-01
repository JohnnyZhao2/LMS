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
 * 任务详情组件（ShadCN UI 版本）
 */
export const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentRole, user, isLoading: authLoading } = useAuth();

  // 等待 auth 加载完成后再判断角色，避免刷新时 currentRole 为 null 导致误判
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

  // 学员始终需要获取学习详情（包含进度信息）
  // 等待 auth 加载完成后再判断是否为学员，避免刷新时误判
  const { data: learningDetail, isLoading: learningLoading } = useStudentLearningTaskDetail(taskId, {
    enabled: Boolean(taskId) && isValidTaskId && isStudent,
  });

  const hasKnowledge = (task?.knowledge_items?.length ?? 0) > 0;

  const completeLearning = useCompleteLearning();
  // 需要等待 auth 加载完成 + 任务数据加载完成 + 学员的学习详情加载完成
  const isLoading = authLoading || !isValidTaskId || taskLoading || (isStudent && learningLoading);

  const appearance = useMemo(() => {
    const hasQuiz = (task?.quizzes?.length ?? 0) > 0;
    const hasKnowledge = (task?.knowledge_items?.length ?? 0) > 0;
    const isExamTask = task?.quizzes?.some(q => q.quiz_type === 'EXAM');

    if (isExamTask) {
      return {
        gradient: 'linear-gradient(135deg, #FF3D71 0%, #FF8C52 100%)',
        icon: <Trophy className="w-5 h-5" />,
        themeColor: '#FF3D71',
        bgSoft: 'rgb(254, 242, 242)',
        missionLabel: 'EXAM MISSION',
      };
    }

    if (hasQuiz && hasKnowledge) {
      return {
        gradient: 'linear-gradient(135deg, #4D6CFF 0%, #A855F7 100%)',
        icon: <Activity className="w-5 h-5" />,
        themeColor: '#4D6CFF',
        bgSoft: 'rgb(239, 246, 255)',
        missionLabel: 'HYBRID MISSION',
      };
    }

    return {
      gradient: 'linear-gradient(135deg, #4D6CFF 0%, #A855F7 100%)',
      icon: <BookOpen className="w-5 h-5" />,
      themeColor: '#4D6CFF',
      bgSoft: 'rgb(239, 246, 255)',
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
        <div className="bg-white/60 backdrop-blur-md rounded-[2rem] p-12 text-center shadow-clay-card border border-white/60">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Info className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-clay-foreground mb-2">Invalid Task ID</h3>
          <p className="text-clay-muted">无法找到指定的任务编号，请检查后重试。</p>
          <Button variant="outline" className="mt-6 rounded-xl" onClick={() => navigate(-1)}>
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
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-100 rounded-full animate-spin border-t-indigo-500 shadow-lg"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-white/80 rounded-full backdrop-blur-sm"></div>
            </div>
          </div>
          <span className="text-clay-muted font-bold tracking-widest uppercase text-sm animate-pulse">Loading Mission Data...</span>
        </div>
      </div>
    );
  }

  if (taskError || !task) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="bg-white/60 backdrop-blur-md rounded-[2rem] p-12 text-center shadow-clay-card border border-white/60 max-w-md">
          <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Info className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-clay-foreground mb-2">Mission Not Found</h3>
          <p className="text-clay-muted">任务不存在或您没有权限查看，请联系管理员。</p>
          <Button variant="outline" className="mt-6 rounded-xl" onClick={() => navigate('/tasks')}>
            返回任务中心
          </Button>
        </div>
      </div>
    );
  }

  // 对于学员，优先使用 learningDetail 中的状态；对于管理员，使用 task.assignments
  const myAssignment = task.assignments?.find((a) => a.assignee === user?.id);
  
  // 学员的任务状态：优先从 learningDetail 获取
  const studentStatus = learningDetail?.status;
  const studentStatusDisplay = learningDetail?.status_display;
  
  // 判断是否可以开始答题：学员需要任务状态为进行中
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
    // 学员使用 learningDetail 中的 assignment id
    const assignmentId = learningDetail?.id;
    if (!assignmentId) return;
    // 统一使用 /quiz 路由，quiz_type 由后端自动判断
    navigate(`/quiz/${quizId}?assignment=${assignmentId}&task=${taskId}`);
  };

  const displayQuizzes = isStudent ? (learningDetail?.quiz_items ?? []) : (task.quizzes ?? []);

  return (
    <div className="max-w-6xl mx-auto">
      {/* 顶部 Header 卡片 */}
      <div className="relative mb-8">
        <div
          className="absolute inset-x-0 top-0 h-64 rounded-[2.5rem] overflow-hidden shadow-clay-card"
          style={{ background: appearance.gradient }}
        >
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        </div>

        <div className="relative pt-10 px-8 pb-8 z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-white text-shadow-sm">
          <div className="space-y-4 max-w-2xl">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-white bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-md border border-white/30 shadow-sm transition-all duration-300 hover:scale-105 mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回列表
            </Button>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className={cn(
                  "px-3 py-1 rounded-xl text-xs font-black uppercase tracking-widest backdrop-blur-md border border-white/40 shadow-sm",
                  appearance.missionLabel === 'EXAM MISSION' ? "bg-red-500/30 text-white" : "bg-blue-500/30 text-white"
                )}>
                  {appearance.missionLabel}
                </span>
                {/* 学员使用 learningDetail 状态，管理员使用 myAssignment 状态 */}
                {isStudent && studentStatus && (
                  <span className={cn(
                    "px-3 py-1 rounded-xl text-xs font-black uppercase tracking-widest backdrop-blur-md border border-white/40 shadow-sm",
                    studentStatus === 'COMPLETED' ? "bg-green-500/30 text-white" : "bg-white/20 text-white"
                  )}>
                    {studentStatusDisplay || assignmentStatusLabelMap[studentStatus] || studentStatus}
                  </span>
                )}
                {!isStudent && myAssignment && (
                  <span className={cn(
                    "px-3 py-1 rounded-xl text-xs font-black uppercase tracking-widest backdrop-blur-md border border-white/40 shadow-sm",
                    myAssignment.status === 'COMPLETED' ? "bg-green-500/30 text-white" : "bg-white/20 text-white"
                  )}>
                    {assignmentStatusLabelMap[myAssignment.status] || myAssignment.status}
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">{task.title}</h1>
            </div>
            {task.description && (
              <p className="text-white/90 text-lg font-medium leading-relaxed backdrop-blur-sm rounded-xl p-2 -ml-2">
                {task.description}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 items-end">
            <div className="flex items-center gap-3 bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30 shadow-lg">
              <div className="text-right">
                <div className="text-xs text-white/70 font-bold uppercase tracking-wider">截止时间</div>
                <div className="font-black text-xl font-mono">{dayjs(task.deadline).format('MM.DD HH:mm')}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm font-medium text-white/80">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs border border-white/30">
                {task.created_by_name.charAt(0)}
              </div>
              发布人: {task.created_by_name}

              {canEditTask && (
                <div className="ml-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/20 hover:bg-white/30 rounded-full border border-white/30 text-white">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl border-white/50 bg-white/90 backdrop-blur-xl shadow-clay-card">
                      <DropdownMenuItem onClick={() => navigate(`/tasks/${taskId}/edit`)} className="focus:bg-primary/10 rounded-lg cursor-pointer">
                        <Edit className="w-4 h-4 mr-2 text-primary" />
                        <span className="font-bold text-gray-700">编辑任务</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={`grid gap-6 ${isStudent ? 'grid-cols-[1fr_320px]' : 'grid-cols-1'}`}>
        <div className="flex flex-col gap-6">
          {/* 知识列表 */}
          {hasKnowledge && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2 px-2">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white shadow-clay-btn">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black text-clay-foreground tracking-tight">学习章节</h3>
              </div>

              <div className="space-y-4">
                {knowledgeList.map((item, index) => (
                  <div
                    key={item.id}
                    className="group relative bg-white/60 backdrop-blur-md rounded-[2rem] p-6 border border-white/60 shadow-clay-card hover:transform hover:scale-[1.01] transition-all duration-300"
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                      {/* Index Circle */}
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center text-xl font-black shadow-inner",
                        item.isCompleted
                          ? "bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-lg shadow-green-200"
                          : "bg-clay-bg text-clay-muted"
                      )}>
                        {item.isCompleted ? <CheckCircle className="w-7 h-7" /> : index + 1}
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider border border-indigo-100">
                            {item.knowledgeTypeDisplay || item.knowledgeType}
                          </span>
                          <h4 className="text-lg font-bold text-clay-foreground">{item.title}</h4>
                        </div>
                        {item.summary && (
                          <p className="text-clay-muted text-sm leading-relaxed">{item.summary}</p>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                        {isStudent && (
                          item.isCompleted ? (
                            <div className="px-4 py-2 rounded-xl bg-green-50 text-green-600 font-bold text-sm flex items-center gap-2 border border-green-100">
                              <CheckCircle className="w-4 h-4" />
                              已掌握
                            </div>
                          ) : (
                            <Button
                              className="w-full md:w-auto rounded-xl bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm hover:shadow-md transition-all font-bold"
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

          {/* 试卷列表 */}
          {displayQuizzes.length > 0 && (
            <div className="space-y-4 mt-8">
              <div className="flex items-center gap-3 mb-2 px-2">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white shadow-clay-btn">
                  <Trophy className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black text-clay-foreground tracking-tight">能力评估</h3>
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
                        "group relative overflow-hidden rounded-[2.5rem] p-1 border shadow-clay-card transition-all duration-300 hover:shadow-xl",
                        isExamQuiz ? "bg-gradient-to-br from-red-50 via-white to-orange-50 border-red-100" : "bg-white/60 backdrop-blur-md border-white/60"
                      )}
                    >
                      <div className="bg-white/50 rounded-[2.2rem] p-6 md:p-8 h-full flex flex-col md:flex-row items-start md:items-center gap-6">
                        <div className={cn(
                          "w-16 h-16 rounded-3xl flex items-center justify-center flex-shrink-0 shadow-clay-btn text-white",
                          isExamQuiz ? "bg-gradient-to-br from-red-400 to-orange-500" : "bg-gradient-to-br from-blue-400 to-indigo-500"
                        )}>
                          {isExamQuiz ? <Trophy className="w-8 h-8" /> : <FileText className="w-8 h-8" />}
                        </div>

                        <div className="flex-1 space-y-3">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn(
                                "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                                isExamQuiz
                                  ? "bg-red-50 text-red-600 border-red-100"
                                  : "bg-blue-50 text-blue-600 border-blue-100"
                              )}>
                                {item.quiz_type_display || (isExamQuiz ? 'FINAL EXAM' : 'PRACTICE QUIZ')}
                              </span>
                              {studentQuizItem?.is_completed && (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-green-50 text-green-600 border border-green-100">
                                  COMPLETED
                                </span>
                              )}
                            </div>
                            <h4 className="text-2xl font-black text-clay-foreground">
                              {studentQuizItem ? studentQuizItem.quiz_title : adminQuizItem?.quiz_title}
                            </h4>
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm font-bold text-clay-muted">
                            <div className="flex items-center gap-1.5 bg-white/50 px-2 py-1 rounded-lg">
                              <Info className="w-4 h-4 text-indigo-400" />
                              {item.question_count} 题
                            </div>
                            <div className="flex items-center gap-1.5 bg-white/50 px-2 py-1 rounded-lg">
                              <Trophy className="w-4 h-4 text-orange-400" />
                              总分 {item.total_score}
                            </div>
                            {item.duration && (
                              <div className="flex items-center gap-1.5 bg-white/50 px-2 py-1 rounded-lg">
                                <Clock className="w-4 h-4 text-blue-400" />
                                限时 {item.duration} 分钟
                              </div>
                            )}
                            {studentQuizItem?.is_completed && (
                              <div className="flex items-center gap-1.5 bg-green-50 px-2 py-1 rounded-lg text-green-600 ml-auto">
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
                                "w-full md:w-auto h-12 rounded-2xl shadow-clay-btn hover:scale-105 transition-transform font-bold text-base px-8",
                                isExamQuiz
                                  ? "bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-600 hover:to-orange-600"
                                  : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600"
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

        {/* 学员侧边栏 - 进度与状态 */}
        {isStudent && (
          <div className="flex flex-col gap-6">
            <div className="bg-white/60 backdrop-blur-md border border-white/60 shadow-clay-card rounded-[2rem] p-6">
              <h3 className="text-lg font-black text-clay-foreground mb-6 flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                任务进度
              </h3>

              <div className="flex flex-col items-center">
                {learningDetail ? (
                  <>
                    <div className="relative w-48 h-48">
                      <svg className="w-full h-full transform -rotate-90 drop-shadow-lg" viewBox="0 0 100 100">
                        {/* Background circle */}
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          fill="none"
                          stroke="rgba(255,255,255,0.5)"
                          strokeWidth="12"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="12"
                          strokeLinecap="round"
                        />
                        {/* Progress circle */}
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          fill="none"
                          stroke="url(#progressGradient)"
                          strokeWidth="12"
                          strokeLinecap="round"
                          strokeDasharray={`${learningDetail.progress.percentage * 2.64} 264`}
                          className="transition-all duration-1000 ease-out"
                        />
                        <defs>
                          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#4F46E5" />
                            <stop offset="100%" stopColor="#9333EA" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-br from-indigo-600 to-purple-600">
                          {learningDetail.progress.percentage}%
                        </span>
                        <span className="text-xs font-bold text-clay-muted uppercase tracking-widest mt-1">Total Progress</span>
                      </div>
                    </div>

                    <div className="w-full mt-6 space-y-3">
                      <div className="flex justify-between items-center p-3 bg-white/50 rounded-xl border border-white/50">
                        <span className="text-sm font-bold text-clay-muted">完成项目</span>
                        <span className="font-black text-indigo-600 text-lg">
                          {learningDetail.progress.completed} <span className="text-gray-400 text-sm font-medium">/ {learningDetail.progress.total}</span>
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-10 text-clay-muted font-medium">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Activity className="w-5 h-5 text-gray-400" />
                    </div>
                    暂无详细进度
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/60 backdrop-blur-md border border-white/60 shadow-clay-card rounded-[2rem] p-6">
              <h3 className="text-lg font-black text-clay-foreground mb-6 flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-orange-500 to-red-500 rounded-full"></div>
                当前状态
              </h3>

              <div className="flex flex-col gap-4">
                {learningDetail?.progress?.knowledge_total ? (
                  <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                    <span className="text-sm font-bold text-blue-400">知识同步</span>
                    <span className="font-black text-blue-500 text-lg">
                      {learningDetail.progress.knowledge_completed} / {learningDetail.progress.knowledge_total}
                    </span>
                  </div>
                ) : null}

                {learningDetail?.progress?.quiz_total ? (
                  <div className="flex items-center justify-between p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                    <span className="text-sm font-bold text-purple-400">试卷同步</span>
                    <span className="font-black text-purple-500 text-lg">
                      {learningDetail.progress.quiz_completed} / {learningDetail.progress.quiz_total}
                    </span>
                  </div>
                ) : null}

                <div className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-white/50">
                  <span className="text-sm font-bold text-clay-muted">执行状态</span>
                  {/* 学员使用 learningDetail 状态 */}
                  {studentStatus && (
                    <span className={cn(
                      "px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest",
                      studentStatus === 'COMPLETED' ? "bg-green-100 text-green-600" :
                        studentStatus === 'IN_PROGRESS' ? "bg-blue-100 text-blue-600" :
                          "bg-gray-100 text-gray-600"
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
