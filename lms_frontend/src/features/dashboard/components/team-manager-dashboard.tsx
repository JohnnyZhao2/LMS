import React from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Building2,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { cn } from '@/lib/utils';
import type {
  TeamManagerDashboardSummary,
  TeamManagerDepartmentComparison,
  TeamManagerDepartmentMetrics,
  TeamManagerDepartmentStudentViewItem,
} from '@/types/dashboard';

import { useTeamManagerDashboard } from '../api/team-manager-dashboard';

const cardTitleClass =
  'text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80';

const EMPTY_SUMMARY: TeamManagerDashboardSummary = {
  total_students: 0,
  total_mentors: 0,
  total_knowledge: 0,
};

const EMPTY_DEPARTMENT_METRICS: TeamManagerDepartmentMetrics = {
  department_id: null,
  department_name: '-',
  student_count: 0,
  mentor_count: 0,
  avg_completion_rate: 0,
  avg_score: null,
  weekly_active_users: 0,
  weekly_active_rate: 0,
};

const EMPTY_DEPARTMENT_COMPARISON: TeamManagerDepartmentComparison = {
  left_department: EMPTY_DEPARTMENT_METRICS,
  right_department: EMPTY_DEPARTMENT_METRICS,
  gap: {
    student_count: 0,
    mentor_count: 0,
    completion_rate: 0,
    avg_score: null,
    weekly_active_rate: 0,
  },
};

const EMPTY_HIERARCHY_VIEW: TeamManagerDepartmentStudentViewItem[] = [];

const formatScore = (value: number | null) => (value === null ? '-' : value.toFixed(1));

const formatSigned = (value: number, suffix = '') => {
  const fixed = Number.isInteger(value) ? `${value}` : value.toFixed(1);
  return `${value > 0 ? '+' : ''}${fixed}${suffix}`;
};

const getGapClass = (value: number) => {
  if (value > 0) {
    return 'bg-success-100 text-success-700';
  }
  if (value < 0) {
    return 'bg-error-100 text-error-700';
  }
  return 'bg-muted text-muted-foreground';
};

const ComparisonSection: React.FC<{ comparison: TeamManagerDepartmentComparison }> = ({ comparison }) => {
  const left = comparison.left_department;
  const right = comparison.right_department;

  return (
    <Card className="border border-border p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className={cn(cardTitleClass, 'text-sm font-bold normal-case tracking-normal text-foreground')}>
            团队数据对比
          </h3>
          <p className="text-xs text-muted-foreground">对比口径固定：{left.department_name} vs {right.department_name}</p>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-border/70 bg-muted p-3">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] text-[11px] font-semibold text-muted-foreground">
          <span>指标</span>
          <span className="text-center">{left.department_name}</span>
          <span className="text-center">{right.department_name}</span>
          <span className="text-center">差值</span>
        </div>

        {[
          {
            label: '学员数量',
            leftValue: `${left.student_count}`,
            rightValue: `${right.student_count}`,
            gapValue: comparison.gap.student_count,
            gapLabel: formatSigned(comparison.gap.student_count),
          },
          {
            label: '导师数量',
            leftValue: `${left.mentor_count}`,
            rightValue: `${right.mentor_count}`,
            gapValue: comparison.gap.mentor_count,
            gapLabel: formatSigned(comparison.gap.mentor_count),
          },
          {
            label: '平均完成率',
            leftValue: `${left.avg_completion_rate}%`,
            rightValue: `${right.avg_completion_rate}%`,
            gapValue: comparison.gap.completion_rate,
            gapLabel: formatSigned(comparison.gap.completion_rate, '%'),
          },
          {
            label: '平均成绩',
            leftValue: formatScore(left.avg_score),
            rightValue: formatScore(right.avg_score),
            gapValue: comparison.gap.avg_score ?? 0,
            gapLabel: comparison.gap.avg_score === null ? '-' : formatSigned(comparison.gap.avg_score),
            useNeutral: comparison.gap.avg_score === null,
          },
          {
            label: '周活跃率',
            leftValue: `${left.weekly_active_rate}%`,
            rightValue: `${right.weekly_active_rate}%`,
            gapValue: comparison.gap.weekly_active_rate,
            gapLabel: formatSigned(comparison.gap.weekly_active_rate, '%'),
          },
        ].map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[1.2fr_1fr_1fr_1fr] items-center rounded-lg bg-background px-3 py-2 text-sm"
          >
            <span className="text-foreground">{row.label}</span>
            <span className="text-center font-medium text-foreground tabular-nums">{row.leftValue}</span>
            <span className="text-center font-medium text-foreground tabular-nums">{row.rightValue}</span>
            <span className="text-center">
              <span
                className={cn(
                  'inline-flex min-w-[72px] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                  row.useNeutral ? 'bg-muted text-muted-foreground' : getGapClass(row.gapValue)
                )}
              >
                {row.gapLabel}
                {!row.useNeutral && row.gapValue > 0 && <ArrowUpRight className="ml-0.5 h-3 w-3" />}
                {!row.useNeutral && row.gapValue < 0 && <ArrowDownRight className="ml-0.5 h-3 w-3" />}
              </span>
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};

const HierarchySection: React.FC<{ departments: TeamManagerDepartmentStudentViewItem[] }> = ({ departments }) => {
  if (!departments.length) {
    return (
      <Card className="border border-border p-6">
        <p className="text-sm text-muted-foreground">暂无部门学员数据</p>
      </Card>
    );
  }

  return (
    <Card className="border border-border p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10">
          <Users className="h-5 w-5 text-secondary" />
        </div>
        <div>
          <h3 className={cn(cardTitleClass, 'text-sm font-bold normal-case tracking-normal text-foreground')}>
            部门-学员层级视图
          </h3>
          <p className="text-xs text-muted-foreground">从部门到学员的管理视角，优先显示风险学员</p>
        </div>
      </div>

      <div className="space-y-4">
        {departments.map((department) => (
          <div key={department.department_id} className="rounded-xl border border-border/70 bg-muted p-4">
            <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-base font-semibold text-foreground">{department.department_name}</p>
                <p className="text-xs text-muted-foreground">
                  学员 {department.student_count} 人 · 导师 {department.mentor_count} 人 · 风险学员 {department.at_risk_students} 人
                </p>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="rounded-full bg-background px-2 py-1 text-muted-foreground">
                  完成率 {department.avg_completion_rate}%
                </span>
                <span className="rounded-full bg-background px-2 py-1 text-muted-foreground">
                  周活跃率 {department.weekly_active_rate}%
                </span>
                <span className="rounded-full bg-background px-2 py-1 text-muted-foreground">
                  均分 {formatScore(department.avg_score)}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border/60 bg-background">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">学员</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">导师</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">完成率</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">平均分</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">风险状态</th>
                  </tr>
                </thead>
                <tbody>
                  {department.students.map((student) => (
                    <tr key={student.student_id} className="border-b border-border/40 last:border-b-0">
                      <td className="px-3 py-2 text-foreground">{student.student_name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{student.mentor_name ?? '-'}</td>
                      <td className="px-3 py-2 text-center font-medium text-foreground tabular-nums">{student.completion_rate}%</td>
                      <td className="px-3 py-2 text-center font-medium text-foreground tabular-nums">{formatScore(student.avg_score)}</td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={cn(
                            'inline-flex min-w-[72px] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold',
                            student.is_at_risk
                              ? 'bg-error-100 text-error-700'
                              : 'bg-success-100 text-success-700'
                          )}
                        >
                          {student.is_at_risk ? '需关注' : '稳定'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!department.students.length && (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-sm text-muted-foreground">该部门暂无学员</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export const TeamManagerDashboard: React.FC = () => {
  const {
    data,
    isLoading,
  } = useTeamManagerDashboard();

  const summary = data?.summary ?? EMPTY_SUMMARY;
  const comparison = data?.department_comparison ?? EMPTY_DEPARTMENT_COMPARISON;
  const hierarchyView = data?.department_student_view ?? EMPTY_HIERARCHY_VIEW;

  if (isLoading) {
    return (
      <PageShell className="animate-pulse">
        <Skeleton className="h-20 w-1/3 rounded-2xl" />
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 rounded-3xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="团队经理看板"
        icon={<UserRoundCheck />}
      />

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <StatCard
            title="学员数量"
            value={summary.total_students}
            icon={Users}
            accentClassName="bg-primary"
            subtitle="平台学习成员"
            delay="stagger-delay-1"
          />
          <StatCard
            title="导师数量"
            value={summary.total_mentors}
            icon={UserRoundCheck}
            accentClassName="bg-secondary"
            subtitle="平台在岗导师"
            delay="stagger-delay-2"
          />
          <StatCard
            title="平台知识数量"
            value={summary.total_knowledge}
            icon={BookOpen}
            accentClassName="bg-success-500"
            subtitle="当前有效知识"
            delay="stagger-delay-3"
          />
        </div>

        <ComparisonSection comparison={comparison} />

        <HierarchySection departments={hierarchyView} />
      </div>
    </PageShell>
  );
};
