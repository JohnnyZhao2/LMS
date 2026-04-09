import * as React from 'react';
import {
  BarChart3,
  CheckCircle,
  FileCheck,
  Target,
  Users
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ROUTES } from '@/config/routes';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { cn } from '@/lib/utils';
import type {
  MentorDashboardScoreDistribution,
  MentorDashboardSpotCheckStats,
  MentorDashboardStudent,
} from '@/types/api';

const cardTitleClass = 'text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80';
const cardTitleNoteClass = 'ml-2 text-[9px] font-medium text-text-muted/80 normal-case tracking-normal';
const cardMetaClass = 'text-[10px] text-text-muted';

interface PendingGradingCardProps {
  count: number;
}

export const PendingGradingCard: React.FC<PendingGradingCardProps> = ({ count }) => {
  const { roleNavigate } = useRoleNavigate();

  return (
    <Card className="p-6 border border-border flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileCheck className="w-4 h-4 text-warning-600" />
          <div>
            <h3 className={cardTitleClass}>
              待批阅卷
              <span className={cardTitleNoteClass}>· 仅统计含主观题的提交</span>
            </h3>
          </div>
        </div>
        <span className="text-2xl font-black text-foreground tabular-nums">{count}</span>
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="w-full"
        onClick={() => roleNavigate(ROUTES.GRADING_CENTER)}
      >
        进入阅卷中心
      </Button>
    </Card>
  );
};

interface SpotCheckStatsCardProps {
  stats: MentorDashboardSpotCheckStats;
}

export const SpotCheckStatsCard: React.FC<SpotCheckStatsCardProps> = ({ stats }) => {
  return (
    <Card className="p-6 border border-border">
      <div className="flex items-center gap-3 mb-4">
        <Target className="w-4 h-4 text-primary-600" />
        <div>
          <h3 className={cardTitleClass}>
            抽查统计
            <span className={cardTitleNoteClass}>· 本月学员抽查</span>
          </h3>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 rounded-xl bg-muted">
          <p className={cardMetaClass}>抽查次数</p>
          <p className="text-xl font-black text-foreground tabular-nums">{stats.count}</p>
        </div>
        <div className="p-3 rounded-xl bg-muted">
          <p className={cardMetaClass}>平均分</p>
          <p className="text-xl font-black text-foreground tabular-nums">
            {stats.avg_score ?? '--'}
          </p>
        </div>
      </div>
    </Card>
  );
};

interface StudentRadarCardProps {
  students: MentorDashboardStudent[];
}

const radarMetrics = [
  { key: 'completion_rate', label: '完成率' },
  { key: 'overdue_rate', label: '逾期率' },
  { key: 'avg_score', label: '平均分' },
  { key: 'monthly_active', label: '本月活跃' },
  { key: 'spot_check_avg_score', label: '抽查均分' },
] as const;

export const StudentRadarCard: React.FC<StudentRadarCardProps> = ({ students }) => {
  const [selectedId, setSelectedId] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (students.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !students.some((s) => s.id === selectedId)) {
      setSelectedId(students[0].id);
    }
  }, [students, selectedId]);

  const selectedStudent = students.find((s) => s.id === selectedId) ?? students[0];

  if (!selectedStudent) {
    return (
      <Card className="p-6 border border-border h-full">
        <div className="flex items-center gap-3 mb-5">
          <Target className="w-4 h-4 text-primary" />
          <h3 className={cardTitleClass}>学员进度雷达</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-10 text-text-muted">
          <Users className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm">暂无学员数据</p>
          <p className="text-xs mt-1">先为学员分配任务</p>
        </div>
      </Card>
    );
  }

  const values = radarMetrics.map((metric) => {
    const rawValue = selectedStudent.radar_metrics[metric.key];
    return Math.min(Math.max(rawValue, 0), 100);
  });

  const size = 220;
  const center = size / 2;
  const radius = 80;
  const levels = 4;

  const buildPoints = (scale: number) =>
    values
      .map((value, index) => {
        const angle = (Math.PI * 2 * index) / values.length - Math.PI / 2;
        const r = radius * scale * (value / 100);
        const x = center + Math.cos(angle) * r;
        const y = center + Math.sin(angle) * r;
        return `${x},${y}`;
      })
      .join(' ');

  const gridPoints = (scale: number) =>
    values
      .map((_, index) => {
        const angle = (Math.PI * 2 * index) / values.length - Math.PI / 2;
        const r = radius * scale;
        const x = center + Math.cos(angle) * r;
        const y = center + Math.sin(angle) * r;
        return `${x},${y}`;
      })
      .join(' ');

  return (
    <Card className="p-6 border border-border h-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <h3 className={cardTitleClass}>学员进度雷达</h3>
        </div>
        <div className="min-w-[160px]">
          <Select value={selectedId?.toString() ?? ''} onValueChange={(value) => setSelectedId(Number(value))}>
            <SelectTrigger>
              <SelectValue placeholder="选择学员" />
            </SelectTrigger>
            <SelectContent>
              {students.map((student) => (
                <SelectItem key={student.id} value={student.id.toString()}>
                  {student.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(200px,240px)_minmax(0,1fr)] gap-6 items-center">
        <div className="flex items-center justify-center">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {Array.from({ length: levels }).map((_, idx) => {
              const scale = (idx + 1) / levels;
              return (
                <polygon
                  key={`grid-${idx}`}
                  points={gridPoints(scale)}
                  fill="none"
                  className="stroke-border"
                  strokeDasharray="4 4"
                />
              );
            })}
            {values.map((_, index) => {
              const angle = (Math.PI * 2 * index) / values.length - Math.PI / 2;
              const x = center + Math.cos(angle) * radius;
              const y = center + Math.sin(angle) * radius;
              return (
                <line
                  key={`axis-${index}`}
                  x1={center}
                  y1={center}
                  x2={x}
                  y2={y}
                  className="stroke-border"
                />
              );
            })}
            <polygon
              points={buildPoints(1)}
              className="fill-primary/20 stroke-primary"
              strokeWidth={2}
            />
            {values.map((value, index) => {
              const angle = (Math.PI * 2 * index) / values.length - Math.PI / 2;
              const r = radius * (value / 100);
              const x = center + Math.cos(angle) * r;
              const y = center + Math.sin(angle) * r;
              return (
                <circle
                  key={`point-${index}`}
                  cx={x}
                  cy={y}
                  r={3}
                  className="fill-primary"
                />
              );
            })}
          </svg>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CheckCircle className="w-4 h-4 text-secondary" />
            {selectedStudent.username}
            {selectedStudent.department_name && (
              <span className="text-[10px] text-text-muted">
                · {selectedStudent.department_name}
              </span>
            )}
          </div>
          <div className="space-y-3">
            {radarMetrics.map((metric, index) => (
              <div key={metric.key} className="flex items-center justify-between gap-3">
                <span className="text-[10px] text-text-muted">{metric.label}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${values[index]}%` }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-foreground tabular-nums w-10 text-right">
                  {values[index].toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

interface ScoreDistributionCardProps {
  distribution: MentorDashboardScoreDistribution;
}

const distributionConfig = [
  { key: 'excellent', label: '优', summaryLabel: '优秀', barClass: 'bg-primary' },
  { key: 'good', label: '良', summaryLabel: '良好', barClass: 'bg-secondary' },
  { key: 'pass', label: '及格', summaryLabel: '及格', barClass: 'bg-warning' },
  { key: 'fail', label: '不及格', summaryLabel: '不及格', barClass: 'bg-destructive' },
] as const;

export const ScoreDistributionCard: React.FC<ScoreDistributionCardProps> = ({ distribution }) => {
  const counts = distributionConfig.map((item) => distribution[item.key]);
  const derivedTotal = counts.reduce((total, value) => total + value, 0);
  const totalCount = Math.max(distribution.total, derivedTotal);
  const maxCount = Math.max(...counts, 1);
  const summaryItems = distributionConfig.map((item) => {
    const count = distribution[item.key];
    const percent = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
    return { ...item, count, percent };
  });

  return (
    <Card className="p-6 border border-border h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h3 className={cardTitleClass}>成绩分布</h3>
        </div>
        <span className={cardMetaClass}>总计 {totalCount}</span>
      </div>
      <div className="flex flex-col gap-4 flex-1">
        <div className="space-y-3">
          {summaryItems.map((item) => {
            return (
              <div key={item.key} className="flex items-center gap-3">
                <span className="w-10 text-[10px] text-text-muted text-right">{item.label}</span>
                <div className="flex-1 h-7 bg-muted rounded-md overflow-hidden">
                  <div
                    className={cn('h-full rounded-md', item.barClass)}
                    style={{ width: `${(item.count / maxCount) * 100}%`, minWidth: item.count > 0 ? '28px' : '0' }}
                  />
                </div>
                <span className="w-8 text-right text-[10px] font-semibold text-foreground tabular-nums">
                  {item.count}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-auto grid grid-cols-2 gap-3 pt-4 border-t border-border/60">
          {summaryItems.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between rounded-xl bg-muted px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full', item.barClass)} />
                <span className="text-[10px] text-text-muted">{item.summaryLabel}占比</span>
              </div>
              <span className="text-xs font-semibold text-foreground tabular-nums">
                {item.percent}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
