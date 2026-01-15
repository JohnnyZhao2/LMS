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
  User,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

import { useTaskDetail, useStudentLearningTaskDetail } from '../api/get-task-detail';
import { useCompleteLearning } from '../api/complete-learning';
import dayjs from '@/lib/dayjs';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { ROUTES } from '@/config/routes';
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

  const completeLearning = useCompleteLearning();
  const isLoading = authLoading || !isValidTaskId || taskLoading || (isStudent && learningLoading);

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
      <div className="flex justify-center items-center min-h-[50vh] bg-gray-50">
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center max-w-md w-full">
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Invalid Task ID</h3>
          <p className="text-gray-500 text-sm mb-6">无法找到指定的任务编号，请检查后重试。</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            返回上一页
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <div className="h-16 border-b bg-white flex items-center px-6">
           <Skeleton className="h-8 w-64" />
        </div>
        <div className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
           <div className="lg:col-span-8 space-y-6">
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-64 w-full rounded-lg" />
           </div>
           <div className="lg:col-span-4 space-y-6">
              <Skeleton className="h-48 w-full rounded-lg" />
           </div>
        </div>
      </div>
    );
  }

  if (taskError || !task) {
    return (
      <div className="flex justify-center items-center min-h-[50vh] bg-gray-50">
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center max-w-md w-full">
          <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Info className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Task Not Found</h3>
          <p className="text-gray-500 text-sm mb-6">任务不存在或您没有权限查看，请联系管理员。</p>
          <Button variant="outline" onClick={() => navigate(ROUTES.TASKS)}>
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
  
  const displayQuizzes = isStudent ? (learningDetail?.quiz_items ?? []) : (task.quizzes ?? []);
  const hasKnowledge = knowledgeList.length > 0;
  const hasQuizzes = displayQuizzes.length > 0;

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
    navigate(`${ROUTES.QUIZ}/${quizId}?assignment=${assignmentId}&task=${taskId}`);
  };

  const getStatusBadge = () => {
    if (isStudent && studentStatus) {
      const isCompleted = studentStatus === 'COMPLETED';
      return (
        <span className={cn(
          "px-2.5 py-0.5 rounded text-xs font-semibold border",
          isCompleted 
            ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
            : "bg-blue-50 text-blue-600 border-blue-200"
        )}>
          {studentStatusDisplay || assignmentStatusLabelMap[studentStatus] || studentStatus}
        </span>
      );
    }
    if (!isStudent && myAssignment) {
      const isCompleted = myAssignment.status === 'COMPLETED';
      return (
        <span className={cn(
          "px-2.5 py-0.5 rounded text-xs font-semibold border",
          isCompleted 
            ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
            : "bg-blue-50 text-blue-600 border-blue-200"
        )}>
          {assignmentStatusLabelMap[myAssignment.status] || myAssignment.status}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 font-sans">
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 h-9 px-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回
          </Button>
          <div className="w-px h-6 bg-gray-200" />
          <h1 className="text-lg font-bold text-gray-900 truncate max-w-md" title={task.title}>
            {task.title}
          </h1>
          {getStatusBadge()}
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div className="hidden md:flex items-center gap-4 text-gray-500">
             <div className="flex items-center gap-1.5">
               <User className="w-4 h-4" />
               <span>{task.created_by_name}</span>
             </div>
             <div className="flex items-center gap-1.5">
               <Clock className="w-4 h-4" />
               <span>截止: {dayjs(task.deadline).format('MM-DD HH:mm')}</span>
             </div>
          </div>

          {canEditTask && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100 text-gray-500">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-none rounded-md">
                <DropdownMenuItem onClick={() => navigate(`${ROUTES.TASKS}/${taskId}/edit`)} className="cursor-pointer font-medium">
                  <Edit className="w-4 h-4 mr-2 text-gray-500" />
                  编辑任务
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-8 space-y-8">
            
            {task.description && (
              <section className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition-colors">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">任务描述</h3>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                  {task.description}
                </p>
              </section>
            )}

            {hasKnowledge && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-500" />
                    学习资料
                    <Badge variant="secondary" className="ml-2 bg-gray-100 text-gray-600 hover:bg-gray-100 border-none">
                      {knowledgeList.length}
                    </Badge>
                  </h3>
                </div>

                <div className="grid gap-3">
                  {knowledgeList.map((item, index) => (
                    <div
                      key={item.id}
                      className="group bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:scale-[1.01] transition-all duration-200"
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold border",
                          item.isCompleted
                            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                            : "bg-gray-50 text-gray-500 border-gray-200 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-200"
                        )}>
                          {item.isCompleted ? <CheckCircle2 className="w-5 h-5" /> : index + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                             <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-gray-500 border-gray-200 font-medium">
                               {item.knowledgeTypeDisplay || item.knowledgeType}
                             </Badge>
                             <h4 className="font-bold text-gray-900 truncate">{item.title}</h4>
                          </div>
                          {item.summary && (
                            <p className="text-sm text-gray-500 line-clamp-2">{item.summary}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                           {isStudent && (
                             <>
                               {item.isCompleted ? (
                                 <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded">
                                   <CheckCircle className="w-3 h-3" />
                                   已掌握
                                 </span>
                               ) : (
                                 <Button 
                                   size="sm" 
                                   variant="outline"
                                   onClick={(e) => {
                                      e.stopPropagation();
                                      handleCompleteLearning(item.knowledgeId);
                                   }}
                                   disabled={completeLearning.isPending}
                                   className="h-8 text-xs hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                                 >
                                   标记学习
                                 </Button>
                               )}
                               <Button
                                 size="sm"
                                 onClick={() => navigate(`${ROUTES.KNOWLEDGE}/${item.knowledgeId}?taskKnowledgeId=${item.id}&task=${taskId}`)}
                                 className="h-8 bg-gray-900 hover:bg-gray-800 text-white border-none"
                               >
                                 查看
                               </Button>
                             </>
                           )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {hasQuizzes && (
              <section className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    能力考核
                    <Badge variant="secondary" className="ml-2 bg-gray-100 text-gray-600 hover:bg-gray-100 border-none">
                      {displayQuizzes.length}
                    </Badge>
                  </h3>
                </div>

                <div className="grid gap-4">
                  {displayQuizzes.map((item) => {
                    const isExam = item.quiz_type === 'EXAM';
                    const studentQuizItem = isStudent ? item as LearningTaskQuizItem : null;
                    const adminQuizItem = !isStudent ? item as TaskQuiz : null;
                    const isCompleted = studentQuizItem?.is_completed;

                    return (
                      <div
                        key={item.id}
                        className={cn(
                           "bg-white rounded-lg border p-5 hover:scale-[1.01] transition-all duration-200",
                           isExam ? "border-amber-200 bg-amber-50/10" : "border-gray-200"
                        )}
                      >
                        <div className="flex flex-col md:flex-row md:items-center gap-5">
                          <div className={cn(
                            "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0",
                            isExam ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                          )}>
                            {isExam ? <Trophy className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                          </div>

                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide",
                                isExam ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                              )}>
                                {item.quiz_type_display || (isExam ? 'Final Exam' : 'Quiz')}
                              </span>
                              <h4 className="text-base font-bold text-gray-900">{studentQuizItem?.quiz_title || adminQuizItem?.quiz_title}</h4>
                            </div>
                            
                            <div className="flex flex-wrap gap-4 text-sm text-gray-500 font-medium">
                              <span className="flex items-center gap-1.5">
                                <Info className="w-3.5 h-3.5" /> {item.question_count} 题
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5" /> 总分 {item.total_score}
                              </span>
                              {item.duration && (
                                <span className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" /> {item.duration} min
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex-shrink-0 pt-2 md:pt-0">
                             {isStudent && (
                               <div className="flex flex-col items-end gap-2">
                                 {isCompleted && (
                                   <div className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded flex items-center gap-1.5 mb-1">
                                      <Trophy className="w-3.5 h-3.5" />
                                      得分: {studentQuizItem.score}
                                   </div>
                                 )}
                                 <Button
                                   className={cn(
                                     "h-10 px-6 font-semibold shadow-none transition-colors w-full md:w-auto",
                                     isExam 
                                       ? "bg-amber-500 hover:bg-amber-600 text-white" 
                                       : "bg-blue-600 hover:bg-blue-700 text-white"
                                   )}
                                   disabled={!canStartQuiz || (isExam && !!isCompleted)}
                                   onClick={() => handleStartQuiz(studentQuizItem ? studentQuizItem.quiz_id : (adminQuizItem?.quiz || 0))}
                                 >
                                   <PlayCircle className="w-4 h-4 mr-2" />
                                   {isExam 
                                     ? (isCompleted ? '已提交' : '开始考试') 
                                     : (isCompleted ? '再次练习' : '开始练习')}
                                 </Button>
                               </div>
                             )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          <div className="lg:col-span-4 space-y-6">
            
            {isStudent && learningDetail && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-24">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6 flex items-center">
                  <Activity className="w-4 h-4 mr-2 text-blue-500" />
                  总体进度
                </h3>

                <div className="mb-6 text-center">
                  <div className="text-5xl font-bold text-blue-600 mb-2 font-mono tracking-tight">
                    {learningDetail.progress?.percentage ?? 0}%
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${learningDetail.progress?.percentage ?? 0}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {Number(learningDetail.progress?.knowledge_total) > 0 && (
                    <div className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600 font-medium">知识学习</span>
                      <span className="font-bold text-gray-900">
                        {learningDetail.progress?.knowledge_completed ?? 0} / {learningDetail.progress?.knowledge_total ?? 0}
                      </span>
                    </div>
                  )}
                  {Number(learningDetail.progress?.quiz_total) > 0 && (
                     <div className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-lg">
                       <span className="text-gray-600 font-medium">测验进度</span>
                       <span className="font-bold text-gray-900">
                         {learningDetail.progress?.quiz_completed ?? 0} / {learningDetail.progress?.quiz_total ?? 0}
                       </span>
                     </div>
                  )}
                </div>

                {studentStatus === 'IN_PROGRESS' && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-700">
                    <p className="font-semibold flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      当前状态
                    </p>
                    <p className="mt-1 opacity-90">
                      任务进行中，请按时完成所有学习内容和考核。
                    </p>
                  </div>
                )}
              </div>
            )}

            {!isStudent && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-24">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
                  <Info className="w-4 h-4 mr-2 text-gray-500" />
                  任务信息
                </h3>
                <div className="space-y-4 text-sm">
                   <div className="flex justify-between py-2 border-b border-gray-100">
                     <span className="text-gray-500">截止日期</span>
                     <span className="font-semibold text-gray-900">{dayjs(task.deadline).format('YYYY-MM-DD HH:mm')}</span>
                   </div>
                   <div className="flex justify-between py-2 border-b border-gray-100">
                     <span className="text-gray-500">发布人</span>
                     <span className="font-semibold text-gray-900">{task.created_by_name}</span>
                   </div>
                   <div className="flex justify-between py-2 border-b border-gray-100">
                     <span className="text-gray-500">知识点数量</span>
                     <span className="font-semibold text-gray-900">{task.knowledge_items?.length || 0}</span>
                   </div>
                   <div className="flex justify-between py-2">
                     <span className="text-gray-500">测验数量</span>
                     <span className="font-semibold text-gray-900">{task.quizzes?.length || 0}</span>
                   </div>
                </div>

                {canEditTask && (
                   <Button 
                     variant="outline" 
                     className="w-full mt-6 border-gray-200 text-gray-700 hover:bg-gray-50"
                     onClick={() => navigate(`${ROUTES.TASKS}/${taskId}/edit`)}
                   >
                     <Edit className="w-4 h-4 mr-2" />
                     编辑任务配置
                   </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
