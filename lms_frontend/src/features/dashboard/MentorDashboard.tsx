/**
 * MentorDashboard Component
 * Dashboard for mentors and department managers showing student statistics
 * Requirements: 11.1, 11.2, 11.3, 11.4
 */

import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Users,
  CheckCircle2,
  Activity,
  ClipboardList,
  FilePlus,
  FileText,
  Search,
  Clock,
  GraduationCap,
  ClipboardCheck,
} from "lucide-react";
import { useMentorDashboard } from "./api/dashboard";

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get status badge variant
 */
function getStatusBadgeVariant(status: string): "default" | "warning" | "destructive" {
  switch (status) {
    case "GRADED":
      return "default";
    case "GRADING":
      return "warning";
    default:
      return "destructive";
  }
}

/**
 * Get status display name
 */
function getStatusName(status: string): string {
  switch (status) {
    case "GRADED":
      return "已评分";
    case "GRADING":
      return "评分中";
    default:
      return "待评分";
  }
}

export function MentorDashboard() {
  const { data, isLoading, error, refetch } = useMentorDashboard();

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

  // Extract data with defaults
  const studentCount = data?.student_count ?? 0;
  const completionRate = data?.completion_rate ?? 0;
  const averageScore = data?.average_score ?? 0;
  const pendingGradingCount = data?.pending_grading_count ?? 0;
  const recentSubmissions = data?.recent_submissions ?? [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white tracking-tight">
            导师工作台
          </h1>
          <p className="text-text-muted mt-1">
            管理学员学习进度，跟踪任务完成情况
          </p>
        </div>
      </div>

      {/* KPI Grid - Requirements: 11.1, 11.2, 11.3 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Student Count */}
        <Card className="glass-panel p-4 border-l-4 border-l-primary flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-full text-primary">
            <Users size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">
              {studentCount}
            </div>
            <div className="text-xs text-text-muted uppercase tracking-wider">
              所辖学员
            </div>
          </div>
        </Card>

        {/* Completion Rate - Requirements: 11.1 */}
        <Card className="glass-panel p-4 border-l-4 border-l-status-success flex items-center gap-4">
          <div className="p-3 bg-status-success/10 rounded-full text-status-success">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">
              {completionRate.toFixed(1)}%
            </div>
            <div className="text-xs text-text-muted uppercase tracking-wider">
              任务完成率
            </div>
          </div>
        </Card>

        {/* Average Score - Requirements: 11.2 */}
        <Card className="glass-panel p-4 border-l-4 border-l-accent flex items-center gap-4">
          <div className="p-3 bg-accent/10 rounded-full text-accent">
            <Activity size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">
              {averageScore.toFixed(1)}
            </div>
            <div className="text-xs text-text-muted uppercase tracking-wider">
              平均分
            </div>
          </div>
        </Card>

        {/* Pending Grading - Requirements: 11.3 */}
        <Card className="glass-panel p-4 border-l-4 border-l-status-warning flex items-center gap-4">
          <div className="p-3 bg-status-warning/10 rounded-full text-status-warning">
            <ClipboardList size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">
              {pendingGradingCount}
            </div>
            <div className="text-xs text-text-muted uppercase tracking-wider">
              待评分
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions - Requirements: 11.4 */}
        <Card className="glass-panel border-white/5">
          <CardHeader>
            <CardTitle>快捷操作</CardTitle>
            <CardDescription>常用功能入口</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* New Task */}
            <Link to="/tasks/create" className="block">
              <Button
                variant="secondary"
                className="w-full justify-start gap-3 h-12 hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <FilePlus size={18} />
                <span>新建任务</span>
              </Button>
            </Link>

            {/* Test Center */}
            <Link to="/test-center" className="block">
              <Button
                variant="secondary"
                className="w-full justify-start gap-3 h-12 hover:bg-accent/10 hover:text-accent transition-colors"
              >
                <FileText size={18} />
                <span>测试中心</span>
              </Button>
            </Link>

            {/* Spot Check */}
            <Link to="/spot-checks" className="block">
              <Button
                variant="secondary"
                className="w-full justify-start gap-3 h-12 hover:bg-status-warning/10 hover:text-status-warning transition-colors"
              >
                <Search size={18} />
                <span>抽查中心</span>
              </Button>
            </Link>

            {/* Grading Center */}
            {pendingGradingCount > 0 && (
              <Link to="/grading" className="block">
                <Button
                  variant="secondary"
                  className="w-full justify-start gap-3 h-12 hover:bg-status-error/10 hover:text-status-error transition-colors relative"
                >
                  <ClipboardCheck size={18} />
                  <span>评分中心</span>
                  <Badge
                    variant="destructive"
                    className="absolute right-3 text-xs"
                  >
                    {pendingGradingCount}
                  </Badge>
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Recent Submissions */}
        <Card className="lg:col-span-2 glass-panel border-white/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>最近提交</CardTitle>
              <CardDescription>学员最近的答题提交记录</CardDescription>
            </div>
            <Link to="/grading">
              <Button variant="ghost" size="sm" className="text-primary">
                查看全部
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentSubmissions.length === 0 ? (
              <EmptyState
                title="暂无提交记录"
                description="学员还没有提交任何答题"
              />
            ) : (
              <div className="space-y-3">
                {recentSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-white/5 hover:border-primary/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/5 rounded-full">
                        {submission.task_type === "EXAM" ? (
                          <GraduationCap size={16} className="text-status-error" />
                        ) : (
                          <ClipboardCheck size={16} className="text-status-warning" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-white text-sm">
                          {submission.student_name}
                        </div>
                        <div className="text-xs text-text-muted line-clamp-1">
                          {submission.task_title}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <Badge variant={getStatusBadgeVariant(submission.status)}>
                          {getStatusName(submission.status)}
                        </Badge>
                        <div className="text-xs text-text-muted mt-1 flex items-center gap-1">
                          <Clock size={10} />
                          {formatDate(submission.submitted_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
