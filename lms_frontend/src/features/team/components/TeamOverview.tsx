/**
 * TeamOverview Component
 * Displays department completion rate and score comparison charts
 * Requirements: 20.1, 20.2
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTeamOverview, type DepartmentStats } from "../api/team";
import { BarChart3, TrendingUp, Users, Target } from "lucide-react";

/**
 * Progress bar component for visualizing percentages
 */
function ProgressBar({ 
  value, 
  maxValue = 100, 
  color = "primary" 
}: { 
  value: number; 
  maxValue?: number; 
  color?: "primary" | "accent" | "success" | "warning";
}) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const colorClasses = {
    primary: "bg-primary",
    accent: "bg-accent",
    success: "bg-status-success",
    warning: "bg-status-warning",
  };

  return (
    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
      <div 
        className={`h-full ${colorClasses[color]} transition-all duration-500`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

/**
 * Department stats row component
 */
function DepartmentRow({ 
  dept, 
  maxCompletion,
  maxScore 
}: { 
  dept: DepartmentStats;
  maxCompletion: number;
  maxScore: number;
}) {
  return (
    <div className="p-4 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users size={18} className="text-primary" />
          </div>
          <div>
            <div className="font-medium text-white">{dept.department_name}</div>
            <div className="text-xs text-text-muted">{dept.student_count} 名学员</div>
          </div>
        </div>
      </div>
      
      {/* Completion Rate */}
      <div className="space-y-2 mb-3">
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">完成率</span>
          <span className="text-white font-mono">{dept.completion_rate.toFixed(1)}%</span>
        </div>
        <ProgressBar 
          value={dept.completion_rate} 
          maxValue={maxCompletion > 0 ? maxCompletion : 100}
          color="primary" 
        />
      </div>
      
      {/* Average Score */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">平均分</span>
          <span className="text-white font-mono">{dept.average_score.toFixed(1)}</span>
        </div>
        <ProgressBar 
          value={dept.average_score} 
          maxValue={maxScore > 0 ? maxScore : 100}
          color="accent" 
        />
      </div>
    </div>
  );
}

/**
 * TeamOverview main component
 * Requirements: 20.1, 20.2
 */
export function TeamOverview() {
  const { data, isLoading, error, refetch } = useTeamOverview();

  // Loading state
  if (isLoading) {
    return (
      <Card className="glass-panel border-white/5">
        <CardContent className="flex items-center justify-center min-h-[300px]">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="glass-panel border-white/5">
        <CardContent className="p-6">
          <ErrorState
            title="加载失败"
            message="无法加载团队概览数据"
            onRetry={refetch}
          />
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!data || data.departments.length === 0) {
    return (
      <Card className="glass-panel border-white/5">
        <CardContent className="p-6">
          <EmptyState
            title="暂无数据"
            description="当前没有可显示的团队数据"
          />
        </CardContent>
      </Card>
    );
  }

  // Calculate max values for relative bar widths
  const maxCompletion = Math.max(...data.departments.map(d => d.completion_rate), 100);
  const maxScore = Math.max(...data.departments.map(d => d.average_score), 100);

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Students */}
        <Card className="glass-panel p-4 border-l-4 border-l-primary flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-full text-primary">
            <Users size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">
              {data.total_students}
            </div>
            <div className="text-xs text-text-muted uppercase tracking-wider">
              总学员数
            </div>
          </div>
        </Card>

        {/* Overall Completion Rate */}
        <Card className="glass-panel p-4 border-l-4 border-l-status-success flex items-center gap-4">
          <div className="p-3 bg-status-success/10 rounded-full text-status-success">
            <Target size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">
              {data.overall_completion_rate.toFixed(1)}%
            </div>
            <div className="text-xs text-text-muted uppercase tracking-wider">
              整体完成率
            </div>
          </div>
        </Card>

        {/* Overall Average Score */}
        <Card className="glass-panel p-4 border-l-4 border-l-accent flex items-center gap-4">
          <div className="p-3 bg-accent/10 rounded-full text-accent">
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">
              {data.overall_average_score.toFixed(1)}
            </div>
            <div className="text-xs text-text-muted uppercase tracking-wider">
              整体平均分
            </div>
          </div>
        </Card>
      </div>

      {/* Department Comparison - Requirements: 20.1, 20.2 */}
      <Card className="glass-panel border-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 size={20} className="text-primary" />
            各室数据对比
          </CardTitle>
          <CardDescription>
            各部门完成率和成绩对比分析
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.departments.map((dept) => (
              <DepartmentRow 
                key={dept.department_id} 
                dept={dept}
                maxCompletion={maxCompletion}
                maxScore={maxScore}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
