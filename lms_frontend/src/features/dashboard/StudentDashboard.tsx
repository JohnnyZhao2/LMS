/**
 * StudentDashboard Component
 * Displays pending tasks and latest knowledge for students
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  BookOpen,
  Activity,
  AlertCircle,
  GraduationCap,
  FileText,
  ClipboardCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { API_ENDPOINTS } from "@/config/api";
import type { TaskType } from "@/types/domain";

// Dashboard API response types
interface PendingTask {
  id: number;
  task_id: number;
  task_title: string;
  task_type: string;
  deadline: string;
  status: string;
  progress: number;
}

interface LatestKnowledge {
  id: number;
  title: string;
  summary: string;
  updated_at: string;
}

interface TaskSummary {
  learning: number;
  practice: number;
  exam: number;
  total: number;
}

interface StudentDashboardData {
  pending_tasks: PendingTask[];
  latest_knowledge: LatestKnowledge[];
  task_summary: TaskSummary;
}

// Fetch dashboard data
async function fetchStudentDashboard(): Promise<StudentDashboardData> {
  return api.get<StudentDashboardData>(API_ENDPOINTS.dashboard.student);
}

/**
 * Get task type badge variant
 */
function getTaskBadgeVariant(
  type: TaskType
): "default" | "warning" | "destructive" {
  switch (type) {
    case "EXAM":
      return "destructive";
    case "PRACTICE":
      return "warning";
    default:
      return "default";
  }
}

/**
 * Get task type icon
 */
function getTaskIcon(type: TaskType) {
  switch (type) {
    case "LEARNING":
      return <BookOpen size={14} />;
    case "PRACTICE":
      return <ClipboardCheck size={14} />;
    case "EXAM":
      return <GraduationCap size={14} />;
  }
}

/**
 * Get task type display name
 */
function getTaskTypeName(type: TaskType): string {
  switch (type) {
    case "LEARNING":
      return "学习";
    case "PRACTICE":
      return "练习";
    case "EXAM":
      return "考试";
  }
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

/**
 * Check if deadline is approaching (within 3 days)
 */
function isDeadlineApproaching(deadline: string): boolean {
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffDays = Math.ceil(
    (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  return diffDays <= 3 && diffDays >= 0;
}

export function StudentDashboard() {
  const navigate = useNavigate();

  // Fetch dashboard data from API
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: fetchStudentDashboard,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        title="加载失败"
        message="无法加载仪表盘数据"
        onRetry={refetch}
      />
    );
  }

  // Transform API data
  const pendingTasks = data?.task_summary || { learning: 0, practice: 0, exam: 0, total: 0 };
  const recentTasks = (data?.pending_tasks || []).map(task => ({
    id: task.id,
    title: task.task_title,
    type: task.task_type as TaskType,
    deadline: task.deadline,
    progress: task.progress,
  }));
  const latestKnowledge = data?.latest_knowledge || [];
  const totalPending = pendingTasks.total || (pendingTasks.learning + pendingTasks.practice + pendingTasks.exam);

  // Calculate completion rate from recent tasks
  const completedTasks = recentTasks.filter((t) => t.progress === 100).length;
  const completionRate =
    recentTasks.length > 0
      ? Math.round((completedTasks / recentTasks.length) * 100)
      : 0;

  /**
   * Navigate to task detail based on task type
   * Requirements: 4.3 - Click on pending task navigates to task detail page
   */
  const handleTaskClick = (taskId: number, taskType: TaskType) => {
    switch (taskType) {
      case "PRACTICE":
        navigate(`/tasks/practice/${taskId}`);
        break;
      case "EXAM":
        navigate(`/tasks/exam/${taskId}`);
        break;
      default:
        navigate(`/tasks/learning/${taskId}`);
    }
  };

  /**
   * Navigate to knowledge detail
   * Requirements: 4.4 - Click on knowledge card navigates to knowledge detail page
   */
  const handleKnowledgeClick = (knowledgeId: number) => {
    navigate(`/knowledge/${knowledgeId}`);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white tracking-tight">
            学习中心
          </h1>
          <p className="text-text-muted mt-1">欢迎回来，今天也要加油哦！</p>
        </div>
        <div className="flex gap-3">
          <Card className="glass-panel p-3 flex items-center gap-3 border-primary/20">
            <div className="p-2 bg-primary/10 rounded-full text-primary">
              <Activity size={18} />
            </div>
            <div>
              <div className="text-xs text-text-muted uppercase tracking-wider">
                完成率
              </div>
              <div className="text-lg font-bold font-mono text-white">
                {completionRate}%
              </div>
            </div>
          </Card>
          <Card className="glass-panel p-3 flex items-center gap-3 border-accent/20">
            <div className="p-2 bg-accent/10 rounded-full text-accent">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div className="text-xs text-text-muted uppercase tracking-wider">
                待办任务
              </div>
              <div className="text-lg font-bold font-mono text-white">
                {totalPending}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Pending Tasks Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-panel p-4 border-l-4 border-l-primary flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-full text-primary">
            <BookOpen size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">
              {pendingTasks.learning}
            </div>
            <div className="text-xs text-text-muted uppercase tracking-wider">
              学习任务
            </div>
          </div>
        </Card>
        <Card className="glass-panel p-4 border-l-4 border-l-status-warning flex items-center gap-4">
          <div className="p-3 bg-status-warning/10 rounded-full text-status-warning">
            <ClipboardCheck size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">
              {pendingTasks.practice}
            </div>
            <div className="text-xs text-text-muted uppercase tracking-wider">
              练习任务
            </div>
          </div>
        </Card>
        <Card className="glass-panel p-4 border-l-4 border-l-status-error flex items-center gap-4">
          <div className="p-3 bg-status-error/10 rounded-full text-status-error">
            <GraduationCap size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">
              {pendingTasks.exam}
            </div>
            <div className="text-xs text-text-muted uppercase tracking-wider">
              考试任务
            </div>
          </div>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task List (2 cols) - Requirements: 4.1 */}
        <Card className="lg:col-span-2 glass-panel border-white/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>待办任务</CardTitle>
              <CardDescription>
                需要完成的学习、练习和考试任务
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary-hover"
              onClick={() => navigate("/tasks")}
            >
              查看全部 <ArrowRight size={16} className="ml-2" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentTasks.length === 0 ? (
              <EmptyState
                title="暂无待办任务"
                description="当前没有需要完成的任务，休息一下吧！"
              />
            ) : (
              recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="group relative p-4 rounded-lg bg-background/50 border border-white/5 hover:border-primary/30 transition-all hover:bg-background/80 cursor-pointer"
                  onClick={() => handleTaskClick(task.id, task.type)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={getTaskBadgeVariant(task.type)}
                        className="bg-opacity-10 flex items-center gap-1"
                      >
                        {getTaskIcon(task.type)}
                        {getTaskTypeName(task.type)}
                      </Badge>
                      <h4 className="font-semibold text-white group-hover:text-primary transition-colors">
                        {task.title}
                      </h4>
                    </div>
                    {task.progress === 100 ? (
                      <Badge
                        variant="secondary"
                        className="text-xs text-status-success bg-status-success/10 border-status-success/20"
                      >
                        已完成
                      </Badge>
                    ) : task.progress > 0 ? (
                      <Badge
                        variant="secondary"
                        className="text-xs text-primary bg-primary/5 border-primary/20"
                      >
                        进行中 {task.progress}%
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-text-muted">
                        未开始
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-text-muted font-mono mt-3">
                    <span
                      className={`flex items-center gap-1 ${isDeadlineApproaching(task.deadline) ? "text-status-warning" : ""}`}
                    >
                      {isDeadlineApproaching(task.deadline) && (
                        <AlertCircle size={12} />
                      )}
                      <Clock size={12} /> 截止: {formatDate(task.deadline)}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs group-hover:bg-primary group-hover:text-black transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTaskClick(task.id, task.type);
                      }}
                    >
                      {task.progress === 100 ? "查看" : "继续"}
                    </Button>
                  </div>

                  {/* Progress Bar */}
                  {task.progress > 0 && task.progress < 100 && (
                    <div
                      className="absolute bottom-0 left-0 h-1 bg-primary/50 rounded-bl transition-all"
                      style={{ width: `${task.progress}%` }}
                    />
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Knowledge Feed (1 col) - Requirements: 4.2 */}
        <div className="space-y-6">
          <Card className="glass-panel border-white/5 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText size={18} className="text-accent" />
                最新知识
              </CardTitle>
              <CardDescription>最近发布的知识文档</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {latestKnowledge.length === 0 ? (
                <EmptyState
                  title="暂无知识文档"
                  description="知识库还没有内容"
                />
              ) : (
                <>
                  {latestKnowledge.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 rounded bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-transparent hover:border-white/10"
                      onClick={() => handleKnowledgeClick(doc.id)}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] text-text-muted">
                          {formatDate(doc.updated_at)}
                        </span>
                      </div>
                      <h5 className="text-sm font-semibold text-white mb-1 leading-tight line-clamp-2">
                        {doc.title}
                      </h5>
                      <p className="text-xs text-text-secondary line-clamp-2">
                        {doc.summary}
                      </p>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full text-xs border-dashed border-white/20 text-text-muted hover:text-white hover:border-white/50"
                    onClick={() => navigate("/knowledge")}
                  >
                    浏览知识库
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
