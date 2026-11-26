import * as React from 'react';
import { formatDurationClock } from '@/lib/date-time';
import { cn } from '@/lib/utils';
import type { TaskAnalytics } from '@/types/task-analytics';

export interface OverviewRingSegment {
  key: string;
  ratio: number;
  color: string;
}

export const OverviewRing: React.FC<{
  percent?: number;
  strokeColor?: string;
  segments?: OverviewRingSegment[];
  size?: number;
  strokeWidth?: number;
  reverse?: boolean;
}> = ({
  percent = 0,
  strokeColor = 'var(--color-secondary)',
  segments,
  size = 38,
  strokeWidth = 4.5,
  reverse = true,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));

  const arcs = (() => {
    if (!segments) {
      return clamped > 0
        ? [{
          key: 'single',
          color: strokeColor,
          dashArray: `${circumference}`,
          dashOffset: circumference * (1 - clamped / 100),
          round: true,
        }]
        : [];
    }
    const active = segments.filter((s) => s.ratio > 0);
    let offset = 0;
    return active.map((s) => {
      const dashOffset = -offset * circumference;
      offset += s.ratio;
      return {
        key: s.key,
        color: s.color,
        dashArray: `${s.ratio * circumference} ${circumference}`,
        dashOffset,
        round: active.length === 1,
      };
    });
  })();

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('-rotate-90 shrink-0', reverse && '-scale-y-100')}
      aria-hidden="true"
    >
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(15, 23, 42, 0.1)" strokeWidth={strokeWidth} />
      {arcs.map((arc) => (
        <circle
          key={arc.key}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={arc.color}
          strokeWidth={strokeWidth}
          strokeLinecap={arc.round ? 'round' : 'butt'}
          strokeDasharray={arc.dashArray}
          strokeDashoffset={arc.dashOffset}
          className={segments ? 'transition-all duration-300 ease-out' : 'transition-[stroke-dashoffset] duration-300 ease-out'}
        />
      ))}
    </svg>
  );
};

const OverviewSubStat: React.FC<{
  label: string;
  value: string | number;
  title?: string;
}> = ({ label, value, title }) => (
  <div className="min-w-[44px]" title={title}>
    <p className="text-xl font-bold leading-none tracking-tight text-foreground tabular-nums">
      {value}
    </p>
    <p className="mt-1.5 text-xs font-medium leading-none text-text-muted">
      {label}
    </p>
  </div>
);

const StripDivider: React.FC = () => (
  <div className="hidden h-8 w-px bg-border/70 sm:block" />
);

export const TaskOverviewStrip: React.FC<{ analytics: TaskAnalytics }> = ({ analytics }) => {
  const completionPercent = Math.round(analytics.completion.percentage);
  const { completed_count, in_progress_count, overdue_count } = analytics.completion;

  return (
    <div className="flex flex-wrap items-center gap-6 sm:gap-7">
      <div className="flex items-center gap-3">
        <OverviewRing
          percent={analytics.completion.percentage}
          strokeColor="var(--color-secondary)"
          size={40}
          strokeWidth={4.5}
        />
        <div>
          <p className="text-xs font-medium leading-none text-text-muted">任务完成率</p>
          <p className="mt-1.5 text-[22px] font-bold leading-none tracking-tight text-foreground tabular-nums">
            {completionPercent}%
          </p>
        </div>
      </div>

      <StripDivider />

      <div className="flex items-center gap-6 sm:gap-7">
        <OverviewSubStat label="已完成" value={completed_count} />
        <OverviewSubStat label="进行中" value={in_progress_count} />
        <OverviewSubStat label="已逾期" value={overdue_count} />
      </div>

      <StripDivider />

      <OverviewSubStat
        label="平均用时"
        value={formatDurationClock(analytics.average_time)}
        title={analytics.average_time > 0 ? `${Math.round(analytics.average_time * 10) / 10} 分钟` : undefined}
      />
    </div>
  );
};
