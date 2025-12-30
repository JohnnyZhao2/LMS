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
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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

const assignmentStatusMap: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  IN_PROGRESS: 'info',
  PENDING_EXAM: 'warning',
  COMPLETED: 'success',
  OVERDUE: 'error',
};

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
  const { currentRole, user } = useAuth();

  const isStudent = currentRole === 'STUDENT';
  const isAdmin = currentRole === 'ADMIN';
  const isMentorOrManager = currentRole === 'MENTOR' || currentRole === 'DEPT_MANAGER' || currentRole === 'TEAM_MANAGER';

  const taskId = Number(id);
  const isValidTaskId = Number.isFinite(taskId) && taskId > 0;

  const {
    data: task,
    isLoading: taskLoading,
    isError: taskError,
  } = useTaskDetail(taskId, { enabled: isValidTaskId });

  const hasKnowledge = (task?.knowledge_items?.length ?? 0) > 0;
  const shouldFetchLearningDetail = isStudent && hasKnowledge;

  const { data: learningDetail, isLoading: learningLoading } = useStudentLearningTaskDetail(taskId, {
    enabled: Boolean(taskId) && shouldFetchLearningDetail,
  });

  const completeLearning = useCompleteLearning();
  const isLoading = !isValidTaskId || taskLoading || (shouldFetchLearningDetail && learningLoading);

  const appearance = useMemo(() => {
    const isExam = !!task?.pass_score || !!task?.start_time;
    if (isExam) {
      return {
        gradient: 'linear-gradient(135deg, #FF3D71 0%, #FF8C52 100%)',
        icon: <Trophy className="w-5 h-5" />,
        themeColor: 'rgb(239, 68, 68)',
        bgSoft: 'rgb(254, 242, 242)',
      };
    }
    return {
      gradient: 'linear-gradient(135deg, rgb(77, 108, 255) 0%, rgb(168, 85, 247) 100%)',
      icon: <BookOpen className="w-5 h-5" />,
      themeColor: 'rgb(77, 108, 255)',
      bgSoft: 'rgb(239, 246, 255)',
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
      <Card className="text-center p-12">
        <p className="text-gray-500">任务 ID 无效</p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500">加载任务详情...</span>
        </div>
      </div>
    );
  }

  if (taskError || !task) {
    return (
      <Card className="text-center p-12">
        <p className="text-gray-500">任务不存在或加载失败</p>
      </Card>
    );
  }

  const isExam = !!task?.pass_score || !!task?.start_time;
  const myAssignment = task.assignments?.find((a) => a.assignee === user?.id);
  const canStartQuiz = !!myAssignment && ['IN_PROGRESS', 'PENDING_EXAM'].includes(myAssignment.status);
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
    if (!isStudent || !myAssignment || !canStartQuiz) return;
    const basePath = isExam ? '/exam' : '/quiz';
    navigate(`${basePath}/${quizId}?assignment=${myAssignment.id}&task=${taskId}`);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* 顶部 Header 卡片 */}
      <div
        className="rounded-xl text-white p-8 mb-6 relative overflow-hidden shadow-lg"
        style={{ background: appearance.gradient }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at top right, rgba(255,255,255,0.15) 0%, transparent 60%)',
          }}
        />

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-white bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回
            </Button>

            {canEditTask && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="bg-white/10 hover:bg-white/20 rounded-full">
                    <MoreVertical className="w-5 h-5 text-white" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`/tasks/${taskId}/edit`)}>
                    <Edit className="w-4 h-4 mr-2" />
                    编辑任务
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="flex gap-6 items-end flex-wrap">
            <div className="flex-1 min-w-[300px]">
              <div className="flex flex-col gap-2">
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold w-fit"
                  style={{ backgroundColor: 'white', color: appearance.themeColor }}
                >
                  {isExam ? '考试任务' : '学习任务'}
                </span>
                <h1 className="text-4xl font-bold tracking-tight m-0">{task.title}</h1>
                {task.description && (
                  <p className="text-white/80 text-lg max-w-xl">{task.description}</p>
                )}
              </div>
            </div>

            <div
              className="bg-white/15 backdrop-blur-md rounded-lg px-6 py-4 flex gap-8"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div className="text-center">
                <div className="text-white/70 text-xs mb-1">发布人</div>
                <div className="font-semibold">{task.created_by_name}</div>
              </div>
              <Separator orientation="vertical" className="h-10 bg-white/20" />
              <div className="text-center">
                <div className="text-white/70 text-xs mb-1">截止日期</div>
                <div className="font-semibold">{dayjs(task.deadline).format('MM月DD日 HH:mm')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`grid gap-6 ${isStudent ? 'grid-cols-[1fr_320px]' : 'grid-cols-1'}`}>
        <div className="flex flex-col gap-6">
          {/* 知识列表 */}
          {hasKnowledge && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="w-4 h-4" />
                  学习章节
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {knowledgeList.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-semibold"
                        style={{
                          backgroundColor: item.isCompleted ? 'rgb(220, 252, 231)' : 'rgb(239, 246, 255)',
                          color: item.isCompleted ? 'rgb(34, 197, 94)' : 'rgb(77, 108, 255)',
                        }}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{item.title}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <span>{item.knowledgeTypeDisplay || item.knowledgeType}</span>
                          {item.summary && (
                            <>
                              <Separator orientation="vertical" className="h-3" />
                              <span>{item.summary}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {isStudent && (
                      item.isCompleted ? (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle className="w-3 h-3" />
                          已掌握
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={completeLearning.isPending}
                          onClick={() => handleCompleteLearning(item.knowledgeId)}
                        >
                          标记掌握
                        </Button>
                      )
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* 试卷列表 */}
          {task.quizzes.length > 0 && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4" />
                  考察评估
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {task.quizzes.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-5 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <h5 className="font-semibold text-gray-900 m-0">{item.quiz_title}</h5>
                      <div className="flex flex-col gap-1 mt-2">
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Info className="w-3.5 h-3.5" />
                            题量：{item.question_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Trophy className="w-3.5 h-3.5" />
                            总分：{item.total_score}分
                          </span>
                        </div>
                        {isExam && task.duration && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            考试限时：{task.duration} 分钟
                          </span>
                        )}
                      </div>
                    </div>
                    {isStudent && (
                      <Button disabled={!canStartQuiz} onClick={() => handleStartQuiz(item.quiz)}>
                        <PlayCircle className="w-4 h-4 mr-1" />
                        开始考评
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* 学员侧边栏 - 进度与状态 */}
        {isStudent && (
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">任务进度</CardTitle>
              </CardHeader>
              <CardContent>
                {learningDetail ? (
                  <div className="text-center py-2">
                    <div className="relative w-40 h-40 mx-auto">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          fill="none"
                          stroke="rgb(229, 231, 235)"
                          strokeWidth="8"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          fill="none"
                          stroke="url(#progressGradient)"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${learningDetail.progress.percentage * 2.64} 264`}
                        />
                        <defs>
                          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="rgb(77, 108, 255)" />
                            <stop offset="100%" stopColor="rgb(168, 85, 247)" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold">{learningDetail.progress.percentage}%</span>
                        <span className="text-xs text-gray-500">已学习</span>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-between text-sm">
                      <span className="text-gray-500">完成章节</span>
                      <span className="font-semibold">
                        {learningDetail.progress.completed} / {learningDetail.progress.total}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">暂无详细进度数据</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">分配状态</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-500">当前状态</span>
                  {myAssignment && (
                    <Badge variant={assignmentStatusMap[myAssignment.status] || 'secondary'}>
                      {assignmentStatusLabelMap[myAssignment.status] || myAssignment.status}
                    </Badge>
                  )}
                </div>

                {isExam && task.pass_score && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">合格分数</span>
                    <span className="font-semibold text-red-500">{task.pass_score}分</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
