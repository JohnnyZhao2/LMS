import * as React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  FileCheck,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Clock,
  User,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTaskDetail } from '../../api/get-task-detail';
import { ProgressMonitoringTab } from './progress-monitoring-tab';
import { GradingCenterTab } from './grading-center-tab';
import dayjs from '@/lib/dayjs';

export const TaskPreviewPage: React.FC = () => {
  const { id, role } = useParams<{ id: string; role: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const taskId = Number(id);

  const defaultTab = searchParams.get('tab') || 'progress';
  const [activeTab, setActiveTab] = React.useState(defaultTab);
  const [selectedQuizId, setSelectedQuizId] = React.useState<number | null>(null);

  const { data: task, isLoading } = useTaskDetail(taskId);

  // Compute quizzes and active ID *before* early returns
  // Use useMemo to prevent unnecessary re-renders of dependent effects
  const quizzes = React.useMemo(() => task?.quizzes || [], [task]);
  const hasMultipleQuizzes = quizzes.length > 0;

  const activeQuizId = React.useMemo(() => {
    return (selectedQuizId && quizzes.some(q => q.quiz === selectedQuizId))
      ? selectedQuizId
      : (quizzes[0]?.quiz ?? null);
  }, [selectedQuizId, quizzes]);

  // Effect to sync selectedQuizId with default
  // This hook is now unconditionally called
  React.useEffect(() => {
    if (activeTab === 'grading' && !selectedQuizId && quizzes.length > 0) {
      setSelectedQuizId(quizzes[0].quiz);
    }
  }, [activeTab, quizzes, selectedQuizId]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-text-muted">
        <p>任务不存在</p>
        <Button variant="outline" onClick={() => navigate(`/${role}/tasks`)} className="mt-4">
          返回任务列表
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-10 min-h-full bg-muted/30">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/60 px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/${role}/tasks`)}
              className="h-10 w-10 rounded-xl hover:bg-muted transition-colors duration-150"
            >
              <ArrowLeft className="h-5 w-5 text-text-muted" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">{task.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted font-medium mt-1">
                <span className="inline-flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  创建人 {task.created_by_name}
                </span>
                {task.updated_by_name && (
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    更新人 {task.updated_by_name}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  截止 {dayjs(task.deadline).format('YYYY-MM-DD HH:mm')}
                </span>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="bg-muted/80 p-1 rounded-xl border border-border/50">
              <TabsTrigger
                value="progress"
                className="flex items-center gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary-600  transition-all"
              >
                <BarChart3 className="h-4 w-4" />
                进度监控
              </TabsTrigger>
              <TabsTrigger
                value="grading"
                className="flex items-center gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary-600  transition-all"
              >
                <FileCheck className="h-4 w-4" />
                阅卷中心
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6">
        {/* PROGRESS TAB */}
        {activeTab === 'progress' && (
          <div>
            <ProgressMonitoringTab taskId={taskId} />
          </div>
        )}

        {/* GRADING TAB */}
        {activeTab === 'grading' && (
          <div className="space-y-6">
            {/* Prominent Quiz Selector */}
            {hasMultipleQuizzes ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {quizzes.map((quiz) => {
                  const isActive = quiz.quiz === activeQuizId;
                  const isExam = quiz.quiz_type === 'EXAM'; // Verify exact value from backend if needed, assuming generic check or use display text

                  return (
                    <button
                      key={quiz.id}
                      onClick={() => setSelectedQuizId(quiz.quiz)}
                      className={cn(
                        "relative flex flex-col items-start text-left p-4 rounded-2xl border-2 transition-all duration-200 group overflow-hidden",
                        isActive
                          ? isExam
                            ? "border-destructive-500 bg-destructive-50/30 ring-4 ring-destructive-100" // Active Exam
                            : "border-primary-500 bg-primary-50/30 ring-4 ring-primary-100" // Active Quiz
                          : "border-white bg-background hover:border-border" // Inactive
                      )}
                    >
                      {/* Selection Indicator */}
                      {isActive && (
                        <div className={cn(
                          "absolute top-0 right-0 p-1.5 rounded-bl-xl text-white",
                          isExam ? "bg-destructive-500" : "bg-primary-500"
                        )}>
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}

                      <div className="flex items-center gap-2 mb-3">
                        <Badge
                          className={cn(
                            "border-none px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider",
                            isExam
                              ? "bg-destructive-100 text-destructive-700 group-hover:bg-destructive-200"
                              : "bg-primary-100 text-primary-700 group-hover:bg-primary-200"
                          )}
                        >
                          {isExam ? <GraduationCap className="w-3 h-3 mr-1" /> : <BookOpen className="w-3 h-3 mr-1" />}
                          {quiz.quiz_type_display || (isExam ? '考试' : '练习')}
                        </Badge>
                        {/* Duration or Score Tag */}
                        <div className="flex items-center text-[10px] text-text-muted font-medium bg-muted px-1.5 py-0.5 rounded">
                          <Clock className="w-3 h-3 mr-1" />
                          {quiz.duration ? `${quiz.duration}分` : '不限时'}
                        </div>
                      </div>

                      <h3 className={cn(
                        "font-bold text-lg leading-tight mb-2 line-clamp-2",
                        isActive ? "text-foreground" : "text-foreground"
                      )}>
                        {quiz.quiz_title}
                      </h3>

                      <div className="mt-auto pt-2 w-full flex items-center justify-between text-xs text-text-muted border-t border-border/50">
                        <span>{quiz.question_count} 道题目</span>
                        <span className="font-mono font-medium">总分: {quiz.total_score}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              // Only one quiz - show a simple banner context
              <div className="flex items-center gap-3 p-4 bg-background border border-border rounded-2xl">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  quizzes[0]?.quiz_type === 'EXAM' ? "bg-destructive-100 text-destructive-600" : "bg-primary-100 text-primary-600"
                )}>
                  {quizzes[0]?.quiz_type === 'EXAM' ? <GraduationCap className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-foreground">{quizzes[0]?.quiz_title || '试卷详情'}</h2>
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                      {quizzes[0]?.quiz_type_display}
                    </Badge>
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    共 {quizzes[0]?.question_count} 道题目 · 总分 {quizzes[0]?.total_score}
                  </div>
                </div>
              </div>
            )}

            {/* Alert for Auto-Grading Quizzes */}
            {quizzes.find(q => q.quiz === activeQuizId)?.quiz_type !== 'EXAM' && (
              <div className="flex items-start gap-3 p-3 bg-primary-50 border border-primary-100 rounded-xl text-primary-700 text-sm">
                <div className="mt-0.5"><BookOpen className="w-4 h-4" /></div>
                <div>
                  <span className="font-bold">提示：</span>
                  当前选择的是练习/测验试卷。通常此类试卷主要用于学员自测，题目多为客观题（系统自动评分）。请重点关注“考试”类型的试卷进行人工批阅。
                </div>
              </div>
            )}

            <GradingCenterTab taskId={taskId} quizId={activeQuizId} />
          </div>
        )}
      </div>
    </div>
  );
};
